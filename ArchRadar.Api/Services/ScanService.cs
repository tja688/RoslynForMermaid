using ArchRadar.Api.Models;
using ArchRadar.Core.Config;
using ArchRadar.Core.Diagnostics;
using ArchRadar.Core.Output;
using ArchRadar.Core.Processing;
using ArchRadar.Core.Rules;
using ArchRadar.Core.Scanning;

namespace ArchRadar.Api.Services;

public sealed class ScanService
{
    private readonly WorkspacePaths _paths;
    private readonly ILogger<ScanService> _logger;

    public ScanService(WorkspacePaths paths, ILogger<ScanService> logger)
    {
        _paths = paths;
        _logger = logger;
    }

    public async Task<SnapshotIndex> RunScanAsync(ProjectProfile profile, string? notes)
    {
        var projectRoot = profile.ProjectRoot;
        if (string.IsNullOrWhiteSpace(projectRoot) || !Directory.Exists(projectRoot))
        {
            throw new InvalidOperationException($"Project root not found: {projectRoot}");
        }

        var configPath = ResolveConfigPath(profile, projectRoot);
        if (string.IsNullOrWhiteSpace(configPath) || !File.Exists(configPath))
        {
            throw new InvalidOperationException("Config file not found. Provide .archradar/config.json or archradar.config.json.");
        }

        _logger.LogInformation("Scan config path={ConfigPath}", configPath);
        var config = ConfigLoader.Load(configPath);
        DebugLog.Writer = message => { };
        DebugLog.Enabled = config.DebugEnabled;

        var featureEngine = new FeatureRuleEngine(config.FeatureRules);
        var scanRoot = string.IsNullOrWhiteSpace(profile.ScanRoot) ? projectRoot : profile.ScanRoot!;
        _logger.LogInformation("Scan mode={Mode} root={Root}", config.Scan.Mode, scanRoot);

        var graph = await RunScanAsync(config, featureEngine, scanRoot, configPath, projectRoot);
        var snapshotId = DateTime.Now.ToString("yyyy-MM-dd_HHmmss");
        var safeProjectId = PathSanitizer.ToSafeId(profile.ProjectId);
        var snapshotRoot = _paths.SnapshotRoot(safeProjectId, snapshotId);
        Directory.CreateDirectory(snapshotRoot);

        var auditPath = _paths.SnapshotAuditPath(safeProjectId, snapshotId);
        AuditJsonWriter.Write(auditPath, graph);

        var layers = new List<LayerEntry>();
        var graphForMermaid = ExternalFoldingProcessor.Apply(graph, config.ExternalFolding);

        var l0File = "L0.mmd";
        MermaidWriter.WriteL0(Path.Combine(snapshotRoot, l0File), graphForMermaid);
        layers.Add(new LayerEntry { LayerId = "L0", FileName = l0File });

        foreach (var entry in BuildL1(graph))
        {
            var fileName = $"L1_{entry.SafeName}.mmd";
            MermaidWriter.WriteL1(Path.Combine(snapshotRoot, fileName), graph, entry.FeatureKey);
            layers.Add(new LayerEntry { LayerId = $"L1:{entry.FeatureKey}", FileName = fileName });
        }

        var l2Config = ResolveL2Config(config);
        if (l2Config.Enabled)
        {
            foreach (var entry in BuildL2Targets(graphForMermaid))
            {
                var fileName = $"L2_{entry.SafeName}.mmd";
                MermaidWriter.WriteL2(Path.Combine(snapshotRoot, fileName), graphForMermaid, entry.TargetId, l2Config);
                layers.Add(new LayerEntry { LayerId = $"L2:{entry.DisplayName}", FileName = fileName });
            }
        }
        else
        {
            _logger.LogInformation("L2 disabled by config");
        }

        var index = new SnapshotIndex
        {
            SnapshotId = snapshotId,
            ProjectId = profile.ProjectId,
            Timestamp = DateTimeOffset.UtcNow.ToString("O"),
            Notes = notes,
            NodeCount = graph.Nodes.Count,
            EdgeCount = graph.Edges.Count,
            Layers = layers
        };

        JsonFileStore.WriteAtomic(_paths.SnapshotIndexPath(safeProjectId, snapshotId), index);
        _logger.LogInformation("Snapshot saved id={SnapshotId} root={Root}", snapshotId, snapshotRoot);
        return index;
    }

    private static async Task<ArchRadar.Core.Models.AuditGraph> RunScanAsync(
        ArchRadarConfig config,
        FeatureRuleEngine featureEngine,
        string scanRoot,
        string configPath,
        string projectRoot)
    {
        if (string.Equals(config.Scan.Mode, "MsBuildSolution", StringComparison.OrdinalIgnoreCase))
        {
            var solutionPath = ResolveSolutionPath(config, configPath, scanRoot);
            if (string.IsNullOrWhiteSpace(solutionPath) || !File.Exists(solutionPath))
            {
                throw new InvalidOperationException("MSBuild mode requires a valid solutionPath.");
            }

            var resolvedRoot = Path.GetDirectoryName(solutionPath) ?? projectRoot;
            var scanner = new MsBuildAuditScanner(featureEngine, config.Scan, resolvedRoot, scanRoot);
            return await scanner.ScanSolutionAsync(solutionPath);
        }

        var directoryScanner = new DirectoryAuditScanner(featureEngine, config.Scan);
        return directoryScanner.Scan(scanRoot);
    }

    private static string? ResolveSolutionPath(ArchRadarConfig config, string configPath, string scanRoot)
    {
        if (!string.IsNullOrWhiteSpace(config.Scan.SolutionPath))
        {
            var baseDir = Path.GetDirectoryName(configPath) ?? scanRoot;
            var raw = config.Scan.SolutionPath!.Trim();
            var trimmed = raw.Trim('"');
            return Path.GetFullPath(trimmed, baseDir);
        }

        return Directory.EnumerateFiles(scanRoot, "*.sln", SearchOption.TopDirectoryOnly).FirstOrDefault();
    }

    private static string ResolveConfigPath(ProjectProfile profile, string projectRoot)
    {
        if (!string.IsNullOrWhiteSpace(profile.ConfigPath))
        {
            return Path.GetFullPath(profile.ConfigPath, projectRoot);
        }

        var primary = Path.Combine(projectRoot, ".archradar", "config.json");
        if (File.Exists(primary))
        {
            return primary;
        }

        return Path.Combine(projectRoot, "archradar.config.json");
    }

    private static IEnumerable<(string FeatureKey, string SafeName)> BuildL1(ArchRadar.Core.Models.AuditGraph graph)
    {
        var featureKeys = graph.Nodes
            .Select(node => string.IsNullOrWhiteSpace(node.FeatureKey) ? "Unresolved" : node.FeatureKey)
            .Where(key => !key.Equals("Unresolved", StringComparison.OrdinalIgnoreCase))
            .Where(key => !key.Equals("External", StringComparison.OrdinalIgnoreCase))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(key => key, StringComparer.OrdinalIgnoreCase)
            .ToList();

        foreach (var featureKey in featureKeys)
        {
            yield return (featureKey, PathSanitizer.ToSafeFileName(featureKey));
        }
    }

    private static IEnumerable<(string TargetId, string SafeName, string DisplayName)> BuildL2Targets(ArchRadar.Core.Models.AuditGraph graph)
    {
        var targets = graph.Nodes
            .Where(node => !IsL2Excluded(node))
            .OrderBy(node => node.NameDisplay, StringComparer.OrdinalIgnoreCase)
            .ToList();

        var nameCounter = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        foreach (var node in targets)
        {
            var baseName = GetShortName(node.NameDisplay);
            var safeName = PathSanitizer.ToSafeFileName(baseName);
            var displayName = baseName;
            if (nameCounter.TryGetValue(safeName, out var count))
            {
                count++;
                nameCounter[safeName] = count;
                safeName = $"{safeName}_{count}";
                displayName = $"{displayName}_{count}";
            }
            else
            {
                nameCounter[safeName] = 1;
            }

            yield return (node.Id, safeName, displayName);
        }
    }

    private static bool IsL2Excluded(ArchRadar.Core.Models.AuditNode node)
    {
        if (string.Equals(node.FeatureKey, "Unresolved", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        if (string.Equals(node.FeatureKey, "External", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        return false;
    }

    private static string GetShortName(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return "Unknown";
        }

        var name = text;
        if (name.StartsWith("Unresolved::", StringComparison.Ordinal))
        {
            name = name["Unresolved::".Length..];
        }

        if (name.StartsWith("global::", StringComparison.Ordinal))
        {
            name = name["global::".Length..];
        }

        var lastDot = name.LastIndexOf('.');
        return lastDot >= 0 ? name[(lastDot + 1)..] : name;
    }

    private static L2Config ResolveL2Config(ArchRadarConfig config)
    {
        if (config.L2.Enabled)
        {
            return config.L2;
        }

        return new L2Config
        {
            Enabled = true,
            MaxDepth = 3,
            StopKinds = new List<string> { "Command", "Query", "Event" }
        };
    }
}
