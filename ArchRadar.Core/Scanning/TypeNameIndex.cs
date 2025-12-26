namespace ArchRadar.Core.Scanning;

public sealed class TypeNameIndex
{
    private readonly Dictionary<string, string> _fullNameToId = new(StringComparer.Ordinal);
    private readonly Dictionary<string, string?> _shortNameToId = new(StringComparer.Ordinal);

    public void Register(string fullName, string id)
    {
        _fullNameToId[fullName] = id;

        var shortName = ExtractShortName(fullName);
        if (_shortNameToId.TryGetValue(shortName, out var existing) && existing != id)
        {
            _shortNameToId[shortName] = null;
            return;
        }

        _shortNameToId[shortName] = id;
    }

    public bool TryResolve(string typeText, out string id)
    {
        id = string.Empty;
        var normalized = NormalizeTypeText(typeText);
        if (_fullNameToId.TryGetValue(normalized, out var resolvedId) && !string.IsNullOrWhiteSpace(resolvedId))
        {
            id = resolvedId;
            return true;
        }

        var shortName = ExtractShortName(normalized);
        if (_shortNameToId.TryGetValue(shortName, out var maybeId) && !string.IsNullOrWhiteSpace(maybeId))
        {
            id = maybeId;
            return true;
        }

        return false;
    }

    private static string NormalizeTypeText(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return string.Empty;
        }

        var trimmed = text.Trim();
        var noGlobal = trimmed.StartsWith("global::", StringComparison.Ordinal) ? trimmed[8..] : trimmed;
        var genericIndex = noGlobal.IndexOf('<');
        var noGeneric = genericIndex >= 0 ? noGlobal[..genericIndex] : noGlobal;
        var noNullable = noGeneric.TrimEnd('?');
        return noNullable.Trim();
    }

    private static string ExtractShortName(string fullName)
    {
        if (string.IsNullOrWhiteSpace(fullName))
        {
            return string.Empty;
        }

        var lastDot = fullName.LastIndexOf('.');
        return lastDot >= 0 ? fullName[(lastDot + 1)..] : fullName;
    }
}
