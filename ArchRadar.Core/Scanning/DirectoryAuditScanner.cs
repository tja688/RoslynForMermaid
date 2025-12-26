using ArchRadar.Core.Config;
using ArchRadar.Core.Diagnostics;
using ArchRadar.Core.Models;
using ArchRadar.Core.Rules;
using Microsoft.CodeAnalysis.CSharp;

namespace ArchRadar.Core.Scanning;

public sealed class DirectoryAuditScanner
{
    private readonly FeatureRuleEngine _featureRuleEngine;
    private readonly GlobMatcher _globMatcher;

    public DirectoryAuditScanner(FeatureRuleEngine featureRuleEngine, ScanConfig scanConfig)
    {
        _featureRuleEngine = featureRuleEngine;
        _globMatcher = new GlobMatcher(scanConfig.ExcludeGlobs);
    }

    public AuditGraph Scan(string rootPath)
    {
        var graph = new AuditGraph();
        var typeIndex = new TypeNameIndex();

        var files = EnumerateCsFiles(rootPath).ToList();
        DebugLog.Write($"Directory 扫描开始: root={rootPath}, files={files.Count}");

        var projectRoot = ResolveProjectRoot(rootPath);
        DebugLog.Write($"Directory 项目根目录: {projectRoot ?? "(null)"}");

        foreach (var filePath in files)
        {
            try
            {
                var text = File.ReadAllText(filePath);
                var tree = CSharpSyntaxTree.ParseText(text, path: filePath);
                var root = tree.GetRoot();
                var walker = new CSharpAuditWalker(graph, typeIndex, _featureRuleEngine, filePath, projectRoot);
                walker.Visit(root);
            }
            catch (Exception ex)
            {
                DebugLog.Write($"Directory 扫描失败: file={filePath}, error={ex.Message}");
            }
        }

        DebugLog.Write($"Directory 扫描完成: nodes={graph.Nodes.Count}, edges={graph.Edges.Count}");
        return graph;
    }

    private IEnumerable<string> EnumerateCsFiles(string rootPath)
    {
        if (string.IsNullOrWhiteSpace(rootPath) || !Directory.Exists(rootPath))
        {
            return Array.Empty<string>();
        }

        return Directory.EnumerateFiles(rootPath, "*.cs", SearchOption.AllDirectories)
            .Where(path => !IsIgnoredPath(path) && !_globMatcher.IsMatch(path));
    }

    private static bool IsIgnoredPath(string path)
    {
        var normalized = path.Replace(Path.AltDirectorySeparatorChar, Path.DirectorySeparatorChar);
        return normalized.Contains($"{Path.DirectorySeparatorChar}bin{Path.DirectorySeparatorChar}", StringComparison.OrdinalIgnoreCase)
            || normalized.Contains($"{Path.DirectorySeparatorChar}obj{Path.DirectorySeparatorChar}", StringComparison.OrdinalIgnoreCase)
            || normalized.Contains($"{Path.DirectorySeparatorChar}.git{Path.DirectorySeparatorChar}", StringComparison.OrdinalIgnoreCase);
    }

    private static string? ResolveProjectRoot(string rootPath)
    {
        var full = Path.GetFullPath(rootPath);
        var token = $"{Path.DirectorySeparatorChar}Assets{Path.DirectorySeparatorChar}";
        var index = full.IndexOf(token, StringComparison.OrdinalIgnoreCase);
        if (index > 0)
        {
            return full[..index];
        }

        return full;
    }
}
