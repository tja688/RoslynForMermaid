using System.Text;
using ArchRadar.Core.Config;
using ArchRadar.Core.Diagnostics;
using ArchRadar.Core.Output;
using ArchRadar.Core.Processing;
using ArchRadar.Core.Rules;
using ArchRadar.Core.Scanning;

Console.OutputEncoding = Encoding.UTF8;
Console.InputEncoding = Encoding.UTF8;

var targetPath = args.Length > 0 ? args[0] : Directory.GetCurrentDirectory();
var fullPath = Path.GetFullPath(targetPath);
var cwd = Directory.GetCurrentDirectory();

Console.WriteLine($"[Debug] 启动: cwd={cwd}, target={targetPath}, full={fullPath}");

if (!Directory.Exists(fullPath))
{
    Console.WriteLine($"路径不存在: {fullPath}");
    return;
}

var primaryConfig = Path.Combine(fullPath, ".archradar", "config.json");
var fallbackConfig = Path.Combine(fullPath, "archradar.config.json");
var configPath = args.Length > 1
    ? Path.GetFullPath(args[1], cwd)
    : (File.Exists(primaryConfig) ? primaryConfig : fallbackConfig);

if (string.IsNullOrWhiteSpace(configPath) || !File.Exists(configPath))
{
    Console.WriteLine("未找到配置文件，请在目标目录下提供 .archradar/config.json 或 archradar.config.json");
    Console.WriteLine($"[Debug] 期望配置路径: {primaryConfig} | {fallbackConfig}");
    if (args.Length > 1)
    {
        Console.WriteLine($"[Debug] 传入配置路径: {configPath}");
    }
    return;
}

var config = ConfigLoader.Load(configPath);
DebugLog.Writer = Console.WriteLine;
DebugLog.Enabled = config.DebugEnabled;

DebugLog.Write($"配置加载: {configPath}");
DebugLog.Write($"扫描模式: {config.Scan.Mode}");
DebugLog.Write($"排除规则数量: {config.Scan.ExcludeGlobs.Count}");
DebugLog.Write($"Feature 规则数量: {config.FeatureRules.Rules.Count}");

if (config.LegacyL2Detected)
{
    Console.WriteLine("检测到旧版 L2 配置，当前版本已忽略该配置");
}

var featureEngine = new FeatureRuleEngine(config.FeatureRules);

var graph = await RunScanAsync(config, featureEngine, fullPath, configPath);
if (graph == null)
{
    return;
}

DebugLog.Write($"扫描完成: nodes={graph.Nodes.Count}, edges={graph.Edges.Count}");

var snapshotDir = Path.Combine(fullPath, ".archradar", "snapshots", DateTime.Now.ToString("yyyy-MM-dd_HHmmss"));
Directory.CreateDirectory(snapshotDir);

var l0Dir = Path.Combine(snapshotDir, "L0");
var l1Dir = Path.Combine(snapshotDir, "L1");
var l2Dir = Path.Combine(snapshotDir, "L2");
Directory.CreateDirectory(l0Dir);
Directory.CreateDirectory(l1Dir);
Directory.CreateDirectory(l2Dir);

var auditPath = Path.Combine(snapshotDir, "audit.json");
AuditJsonWriter.Write(auditPath, graph);
DebugLog.Write($"写入 audit.json: {auditPath}");

var graphForMermaid = ExternalFoldingProcessor.Apply(graph, config.ExternalFolding);
var mermaidPath = Path.Combine(l0Dir, "L0.mmd");
MermaidWriter.WriteL0(mermaidPath, graphForMermaid);
DebugLog.Write($"写入 L0.mmd: {mermaidPath}");

var featureKeys = graph.Nodes
    .Select(node => string.IsNullOrWhiteSpace(node.FeatureKey) ? "Unresolved" : node.FeatureKey)
    .Where(key => !key.Equals("Unresolved", StringComparison.OrdinalIgnoreCase))
    .Where(key => !key.Equals("External", StringComparison.OrdinalIgnoreCase))
    .Distinct(StringComparer.OrdinalIgnoreCase)
    .OrderBy(key => key, StringComparer.OrdinalIgnoreCase)
    .ToList();

if (featureKeys.Count == 0)
{
    DebugLog.Write("L1 未生成: 没有可用的 Feature（已跳过 Unresolved/External）");
}

foreach (var featureKey in featureKeys)
{
    var safeFeature = SanitizeFileName(featureKey);
    var l1Path = Path.Combine(l1Dir, $"L1_{safeFeature}.mmd");
    MermaidWriter.WriteL1(l1Path, graph, featureKey);
    DebugLog.Write($"写入 L1.mmd: feature={featureKey}, path={l1Path}");
}

var defaultL2Config = new L2Config
{
    Enabled = true,
    MaxDepth = 3,
    StopKinds = new List<string> { "Command", "Query", "Event" }
};

var l2Targets = graphForMermaid.Nodes
    .Where(node => !IsL2Excluded(node))
    .OrderBy(node => node.NameDisplay, StringComparer.OrdinalIgnoreCase)
    .ToList();

if (l2Targets.Count == 0)
{
    DebugLog.Write("L2 未生成: 没有可用的目标节点");
}
else
{
    var l2NameCounter = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
    foreach (var node in l2Targets)
    {
        var baseName = GetShortName(node.NameDisplay);
        var safeName = SanitizeFileName(baseName);
        if (l2NameCounter.TryGetValue(safeName, out var count))
        {
            count++;
            l2NameCounter[safeName] = count;
            safeName = $"{safeName}_{count}";
        }
        else
        {
            l2NameCounter[safeName] = 1;
        }

        var l2Path = Path.Combine(l2Dir, $"L2_{safeName}.mmd");
        MermaidWriter.WriteL2(l2Path, graphForMermaid, node.Id, defaultL2Config);
    }

    DebugLog.Write($"L2 输出完成: targets={l2Targets.Count}");
}

Console.WriteLine($"扫描完成: {fullPath}");
Console.WriteLine($"audit.json: {auditPath}");
Console.WriteLine($"L0.mmd: {mermaidPath}");

static async Task<ArchRadar.Core.Models.AuditGraph?> RunScanAsync(
    ArchRadarConfig config,
    FeatureRuleEngine featureEngine,
    string fullPath,
    string configPath)
{
    if (string.Equals(config.Scan.Mode, "MsBuildSolution", StringComparison.OrdinalIgnoreCase))
    {
        var solutionPath = ResolveSolutionPath(config, configPath, fullPath);
        if (string.IsNullOrWhiteSpace(solutionPath) || !File.Exists(solutionPath))
        {
            Console.WriteLine("MSBuild 模式需要有效的 solutionPath");
            return null;
        }

        var projectRoot = Path.GetDirectoryName(solutionPath) ?? fullPath;
        DebugLog.Write($"MSBuild 解决方案: {solutionPath}");
        DebugLog.Write($"MSBuild 项目根目录: {projectRoot}");
        DebugLog.Write($"MSBuild 扫描根目录: {fullPath}");
        var scanner = new MsBuildAuditScanner(featureEngine, config.Scan, projectRoot, fullPath);
        return await scanner.ScanSolutionAsync(solutionPath);
    }

    DebugLog.Write("使用 DirectoryOnly 扫描");
    var directoryScanner = new DirectoryAuditScanner(featureEngine, config.Scan);
    return directoryScanner.Scan(fullPath);
}

static string? ResolveSolutionPath(ArchRadarConfig config, string configPath, string fullPath)
{
    if (!string.IsNullOrWhiteSpace(config.Scan.SolutionPath))
    {
        var baseDir = Path.GetDirectoryName(configPath) ?? fullPath;
        return Path.GetFullPath(config.Scan.SolutionPath!, baseDir);
    }

    return Directory.EnumerateFiles(fullPath, "*.sln", SearchOption.TopDirectoryOnly).FirstOrDefault();
}

static string SanitizeFileName(string text)
{
    var invalid = Path.GetInvalidFileNameChars();
    var buffer = text.ToCharArray();
    for (var index = 0; index < buffer.Length; index++)
    {
        if (invalid.Contains(buffer[index]))
        {
            buffer[index] = '_';
        }
    }

    return new string(buffer);
}

static bool IsL2Excluded(ArchRadar.Core.Models.AuditNode node)
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

static string GetShortName(string text)
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
