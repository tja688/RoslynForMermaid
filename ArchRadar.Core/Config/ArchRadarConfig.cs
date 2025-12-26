namespace ArchRadar.Core.Config;

public sealed class ArchRadarConfig
{
    public string Notes { get; set; } = string.Empty;
    public bool DebugEnabled { get; set; }
    public bool LegacyL2Detected { get; set; }
    public ScanConfig Scan { get; set; } = new();
    public FeatureRuleConfig FeatureRules { get; set; } = new();
    public ExternalFoldingConfig ExternalFolding { get; set; } = new();
    public L2Config L2 { get; set; } = new();
}

public sealed class ScanConfig
{
    public string Notes { get; set; } = string.Empty;
    public string Mode { get; set; } = "DirectoryOnly";
    public string? SolutionPath { get; set; }
    public List<string> ExcludeGlobs { get; set; } = new();
}

public sealed class FeatureRuleConfig
{
    public string Notes { get; set; } = string.Empty;
    public string FallbackFeatureKey { get; set; } = "Unresolved";
    public List<FeatureRule> Rules { get; set; } = new();
}

public sealed class FeatureRule
{
    public string Kind { get; set; } = "NamespacePattern";
    public string Pattern { get; set; } = string.Empty;
    public string? FeatureKey { get; set; }
    public string Notes { get; set; } = string.Empty;
}

public sealed class ExternalFoldingConfig
{
    public string Notes { get; set; } = string.Empty;
    public bool Enabled { get; set; } = true;
    public string DefaultGroupName { get; set; } = "External";
    public List<ExternalGroup> Groups { get; set; } = new();
}

public sealed class ExternalGroup
{
    public string Name { get; set; } = string.Empty;
    public List<string> Prefixes { get; set; } = new();
    public string Notes { get; set; } = string.Empty;
}

public sealed class L2Config
{
    public string Notes { get; set; } = string.Empty;
    public bool Enabled { get; set; }
    public List<string> Targets { get; set; } = new();
    public List<string> StopKinds { get; set; } = new();
    public int MaxDepth { get; set; } = 3;
    public List<string> EdgeKinds { get; set; } = new();
}
