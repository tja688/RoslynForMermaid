using System.Text.RegularExpressions;

namespace ArchRadar.Core.Scanning;

public sealed class GlobMatcher
{
    private readonly List<Regex> _rules;

    public GlobMatcher(IEnumerable<string> patterns)
    {
        _rules = patterns
            .Where(pattern => !string.IsNullOrWhiteSpace(pattern))
            .Select(BuildRegex)
            .ToList();
    }

    public bool IsMatch(string path)
    {
        if (_rules.Count == 0)
        {
            return false;
        }

        var normalized = path.Replace('\\', '/');
        foreach (var regex in _rules)
        {
            if (regex.IsMatch(normalized))
            {
                return true;
            }
        }

        return false;
    }

    private static Regex BuildRegex(string pattern)
    {
        var normalized = pattern.Replace('\\', '/');
        var escaped = Regex.Escape(normalized);
        var regexPattern = "^" + escaped
            .Replace("\\*\\*", ".*")
            .Replace("\\*", "[^/]*")
            .Replace("\\?", ".") + "$";
        return new Regex(regexPattern, RegexOptions.IgnoreCase | RegexOptions.Compiled);
    }
}
