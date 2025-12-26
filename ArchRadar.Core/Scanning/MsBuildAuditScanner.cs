using ArchRadar.Core.Config;
using ArchRadar.Core.Diagnostics;
using ArchRadar.Core.Models;
using ArchRadar.Core.Rules;
using Microsoft.Build.Locator;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.MSBuild;

namespace ArchRadar.Core.Scanning;

public sealed class MsBuildAuditScanner
{
    private readonly FeatureRuleEngine _featureRuleEngine;
    private readonly GlobMatcher _globMatcher;
    private readonly string? _projectRoot;
    private readonly string? _scanRoot;

    public MsBuildAuditScanner(FeatureRuleEngine featureRuleEngine, ScanConfig scanConfig, string? projectRoot, string? scanRoot)
    {
        _featureRuleEngine = featureRuleEngine;
        _globMatcher = new GlobMatcher(scanConfig.ExcludeGlobs);
        _projectRoot = NormalizeRoot(projectRoot);
        _scanRoot = NormalizeRoot(scanRoot);
    }

    public async Task<AuditGraph> ScanSolutionAsync(string solutionPath)
    {
        EnsureMSBuildRegistered();

        var graph = new AuditGraph();
        var typeIndex = new TypeNameIndex();

        using var workspace = MSBuildWorkspace.Create();
        workspace.RegisterWorkspaceFailedHandler(args =>
        {
            DebugLog.Write($"MSBuild 诊断: {args.Diagnostic.Kind} {args.Diagnostic.Message}");
        });

        var supportedLanguages = workspace.Services.SupportedLanguages.ToList();
        DebugLog.Write($"MSBuild 支持语言: {string.Join(", ", supportedLanguages)}");
        if (!supportedLanguages.Contains(LanguageNames.CSharp, StringComparer.OrdinalIgnoreCase))
        {
            DebugLog.Write("MSBuild 未加载 C# 语言服务，可能缺少 Microsoft.CodeAnalysis.CSharp.Workspaces");
        }

        var solution = await workspace.OpenSolutionAsync(solutionPath);
        DebugLog.Write($"MSBuild 扫描开始: solution={solutionPath}, projects={solution.Projects.Count()}");
        foreach (var project in solution.Projects)
        {
            DebugLog.Write($"MSBuild 项目: name={project.Name}, file={project.FilePath}");
            foreach (var document in project.Documents)
            {
                if (string.IsNullOrWhiteSpace(document.FilePath))
                {
                    continue;
                }

                var filePath = document.FilePath!;
                if (!filePath.EndsWith(".cs", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                if (!IsUnderRoot(filePath))
                {
                    continue;
                }

                if (_globMatcher.IsMatch(filePath))
                {
                    continue;
                }

                try
                {
                    var root = await document.GetSyntaxRootAsync();
                    if (root == null)
                    {
                        continue;
                    }

                    var semanticModel = await document.GetSemanticModelAsync();
                    var walker = new CSharpAuditWalker(graph, typeIndex, _featureRuleEngine, filePath, _projectRoot, semanticModel);
                    walker.Visit(root);
                }
                catch (Exception ex)
                {
                    DebugLog.Write($"MSBuild 扫描失败: file={filePath}, error={ex.Message}");
                }
            }
        }

        DebugLog.Write($"MSBuild 扫描完成: nodes={graph.Nodes.Count}, edges={graph.Edges.Count}");
        return graph;
    }

    private static void EnsureMSBuildRegistered()
    {
        if (MSBuildLocator.IsRegistered)
        {
            return;
        }

        var instances = MSBuildLocator.QueryVisualStudioInstances().ToList();
        if (instances.Count == 0)
        {
            DebugLog.Write("MSBuildLocator 未找到可用实例");
            return;
        }

        foreach (var instance in instances)
        {
            DebugLog.Write($"MSBuildLocator 实例: {instance.Name} {instance.Version} {instance.MSBuildPath}");
        }

        MSBuildLocator.RegisterInstance(instances[0]);
    }

    private bool IsUnderRoot(string filePath)
    {
        if (string.IsNullOrWhiteSpace(_scanRoot))
        {
            return true;
        }

        var full = Path.GetFullPath(filePath);
        return full.StartsWith(_scanRoot, StringComparison.OrdinalIgnoreCase);
    }

    private static string? NormalizeRoot(string? rootPath)
    {
        if (string.IsNullOrWhiteSpace(rootPath))
        {
            return null;
        }

        var full = Path.GetFullPath(rootPath);
        var trimmed = full.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        return trimmed + Path.DirectorySeparatorChar;
    }
}
