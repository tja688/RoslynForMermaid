using ArchRadar.Api.Models;
using ArchRadar.Core.Config;

namespace ArchRadar.Api.Services;

public sealed class ProjectConfigService
{
    private readonly ProjectCatalogService _catalogService;

    public ProjectConfigService(ProjectCatalogService catalogService)
    {
        _catalogService = catalogService;
    }

    public ProjectConfigResponse LoadOrCreateConfig(ProjectProfile profile)
    {
        var path = ResolveConfigPath(profile);
        ArchRadarConfig config;
        if (File.Exists(path))
        {
            config = ConfigLoader.Load(path);
        }
        else
        {
            config = CreateDefaultConfig();
            JsonFileStore.WriteAtomic(path, config);
        }

        return new ProjectConfigResponse(path, config);
    }

    public ProjectConfigResponse SaveConfig(ProjectProfile profile, ArchRadarConfig config)
    {
        var path = ResolveConfigPath(profile);
        JsonFileStore.WriteAtomic(path, config);
        var saved = ConfigLoader.Load(path);
        return new ProjectConfigResponse(path, saved);
    }

    private static string ResolveConfigPath(ProjectProfile profile)
    {
        if (!string.IsNullOrWhiteSpace(profile.ConfigPath))
        {
            return Path.GetFullPath(profile.ConfigPath, profile.ProjectRoot);
        }

        return Path.Combine(profile.ProjectRoot, ".archradar", "config.json");
    }

    private static ArchRadarConfig CreateDefaultConfig()
    {
        return new ArchRadarConfig
        {
            Notes = "ArchRadar config (auto-generated)",
            DebugEnabled = false,
            Scan = new ScanConfig
            {
                Mode = "DirectoryOnly",
                SolutionPath = string.Empty,
                ExcludeGlobs = new List<string>
                {
                    "**/bin/**",
                    "**/obj/**",
                    "**/.git/**",
                    "**/Library/**",
                    "**/Temp/**"
                }
            },
            FeatureRules = new FeatureRuleConfig
            {
                FallbackFeatureKey = "Unresolved",
                Rules = new List<FeatureRule>()
            },
            ExternalFolding = new ExternalFoldingConfig
            {
                Enabled = true,
                DefaultGroupName = "External",
                Groups = new List<ExternalGroup>()
            },
            L2 = new L2Config
            {
                Enabled = true,
                MaxDepth = 3,
                StopKinds = new List<string> { "Command", "Query", "Event" },
                EdgeKinds = new List<string>()
            }
        };
    }
}
