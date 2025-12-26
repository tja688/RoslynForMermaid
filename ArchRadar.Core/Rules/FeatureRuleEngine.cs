using System.Text.RegularExpressions;
using ArchRadar.Core.Config;

namespace ArchRadar.Core.Rules;

public sealed class FeatureRuleEngine
{
    private readonly FeatureRuleConfig _config;
    private readonly List<CompiledRule> _compiledRules = new();
    private int _debugCount;
    private const int DebugLimit = 20;

    public FeatureRuleEngine(FeatureRuleConfig config)
    {
        _config = config;
        foreach (var rule in config.Rules)
        {
            var compiled = CompiledRule.TryCreate(rule);
            if (compiled != null)
            {
                _compiledRules.Add(compiled);
            }
        }
    }

    public string GetFeatureKey(string filePath, string? namespaceName)
    {
        var rawNamespace = namespaceName ?? string.Empty;
        var normalizedNamespace = NormalizeNamespace(rawNamespace);
        var normalizedPath = NormalizePath(filePath);
        var shouldDebug = ShouldDebug(normalizedNamespace, normalizedPath);

        if (shouldDebug)
        {
            DebugBase(normalizedNamespace, rawNamespace, normalizedPath);
        }

        foreach (var rule in _compiledRules)
        {
            if (rule.Kind == FeatureRuleKind.NamespacePattern
                && !string.IsNullOrWhiteSpace(normalizedNamespace))
            {
                var matched = rule.TryMatch(normalizedNamespace, out var featureKey);
                DebugRule(shouldDebug, rule, normalizedNamespace, matched, featureKey);
                if (matched)
                {
                    return featureKey;
                }
            }

            if (rule.Kind == FeatureRuleKind.FolderPattern
                && rule.TryMatch(normalizedPath, out var folderFeatureKey))
            {
                DebugRule(shouldDebug, rule, normalizedPath, true, folderFeatureKey);
                return folderFeatureKey;
            }

            if (rule.Kind == FeatureRuleKind.FolderPattern)
            {
                DebugRule(shouldDebug, rule, normalizedPath, false, string.Empty);
            }
        }

        var fallback = string.IsNullOrWhiteSpace(_config.FallbackFeatureKey)
            ? "Unresolved"
            : _config.FallbackFeatureKey;
        DebugMiss(shouldDebug, normalizedNamespace, normalizedPath, fallback);
        return fallback;
    }

    private static string NormalizePath(string filePath)
    {
        return filePath.Replace('\\', '/');
    }

    private static string NormalizeNamespace(string namespaceName)
    {
        if (string.IsNullOrWhiteSpace(namespaceName))
        {
            return string.Empty;
        }

        var trimmed = namespaceName.Trim();
        return trimmed.StartsWith("global::", StringComparison.Ordinal)
            ? trimmed[8..]
            : trimmed;
    }

    private bool ShouldDebug(string namespaceName, string normalizedPath)
    {
        if (!ArchRadar.Core.Diagnostics.DebugLog.Enabled)
        {
            return false;
        }

        if (_debugCount >= DebugLimit)
        {
            return false;
        }

        if (!string.IsNullOrWhiteSpace(namespaceName)
            && namespaceName.Contains("ThatGameJam.Features", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        return normalizedPath.Contains("/Assets/Scripts/Features/", StringComparison.OrdinalIgnoreCase);
    }

    private void DebugBase(string normalizedNamespace, string rawNamespace, string path)
    {
        if (_debugCount >= DebugLimit)
        {
            return;
        }

        ArchRadar.Core.Diagnostics.DebugLog.Write(
            $"Feature 基础: rawNs=[{rawNamespace}] len={rawNamespace.Length}, normNs=[{normalizedNamespace}] len={normalizedNamespace.Length}, path=[{path}]");
    }

    private void DebugRule(bool enabled, CompiledRule rule, string input, bool matched, string featureKey)
    {
        if (!enabled || _debugCount >= DebugLimit)
        {
            return;
        }

        _debugCount++;
        ArchRadar.Core.Diagnostics.DebugLog.Write(
            $"Feature 规则检查: kind={rule.Kind}, pattern={rule.Pattern}, regex={rule.RegexPattern}, input=[{input}], matched={matched}, feature={featureKey}");
    }

    private void DebugMiss(bool enabled, string namespaceName, string path, string fallback)
    {
        if (!enabled || _debugCount >= DebugLimit)
        {
            return;
        }

        _debugCount++;
        ArchRadar.Core.Diagnostics.DebugLog.Write(
            $"Feature 未命中: ns=[{namespaceName}], path=[{path}], fallback={fallback}");
    }

    private sealed class CompiledRule
    {
        private readonly Regex _regex;
        private readonly FeatureRule _rule;

        public FeatureRuleKind Kind { get; }
        public string Pattern => _rule.Pattern;
        public string RegexPattern => _regex.ToString();

        private CompiledRule(FeatureRuleKind kind, Regex regex, FeatureRule rule)
        {
            Kind = kind;
            _regex = regex;
            _rule = rule;
        }

        public bool TryMatch(string input, out string featureKey)
        {
            var match = _regex.Match(input);
            if (!match.Success)
            {
                featureKey = string.Empty;
                return false;
            }

            if (!string.IsNullOrWhiteSpace(_rule.FeatureKey))
            {
                featureKey = _rule.FeatureKey!;
                return true;
            }

            if (match.Groups["feature"].Success)
            {
                featureKey = match.Groups["feature"].Value;
                return !string.IsNullOrWhiteSpace(featureKey);
            }

            featureKey = _rule.Pattern;
            return !string.IsNullOrWhiteSpace(featureKey);
        }

        public static CompiledRule? TryCreate(FeatureRule rule)
        {
            if (string.IsNullOrWhiteSpace(rule.Kind) || string.IsNullOrWhiteSpace(rule.Pattern))
            {
                return null;
            }

            var kind = ParseKind(rule.Kind);
            var regex = kind switch
            {
                FeatureRuleKind.NamespacePattern => BuildNamespaceRegex(rule.Pattern),
                FeatureRuleKind.FolderPattern => BuildFolderRegex(rule.Pattern),
                _ => null
            };

            return regex == null ? null : new CompiledRule(kind, regex, rule);
        }

        private static FeatureRuleKind ParseKind(string kindText)
        {
            return kindText.Equals("FolderPattern", StringComparison.OrdinalIgnoreCase)
                ? FeatureRuleKind.FolderPattern
                : FeatureRuleKind.NamespacePattern;
        }

        private static Regex BuildNamespaceRegex(string pattern)
        {
            var trimmed = pattern.Trim();
            var hasTrailingDot = trimmed.EndsWith(".", StringComparison.Ordinal);
            if (hasTrailingDot)
            {
                trimmed = trimmed[..^1];
            }

            const string token = "__FEATURE__";
            var withToken = trimmed.Replace("{feature}", token, StringComparison.Ordinal);
            var escaped = Regex.Escape(withToken);
            var core = escaped.Replace(token, "(?<feature>[^\\.]+)", StringComparison.Ordinal);
            var suffix = hasTrailingDot ? "\\..*$" : "(\\.|$).*$";
            var regexPattern = "^" + core + suffix;
            return new Regex(regexPattern, RegexOptions.IgnoreCase | RegexOptions.Compiled);
        }

        private static Regex BuildFolderRegex(string pattern)
        {
            const string token = "__FEATURE__";
            var normalized = pattern.Replace('\\', '/').Trim();
            var withToken = normalized.Replace("{feature}", token, StringComparison.Ordinal);
            var escaped = Regex.Escape(withToken);
            var core = escaped.Replace(token, "(?<feature>[^/]+)", StringComparison.Ordinal);
            var regexPattern = ".*" + core + ".*";
            return new Regex(regexPattern, RegexOptions.IgnoreCase | RegexOptions.Compiled);
        }
    }

    private enum FeatureRuleKind
    {
        NamespacePattern = 0,
        FolderPattern = 1
    }
}
