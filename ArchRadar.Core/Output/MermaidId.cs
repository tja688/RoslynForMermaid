namespace ArchRadar.Core.Output;

public static class MermaidId
{
    public static string ForFeature(string featureKey) => BuildId("F", featureKey);

    public static string ForNode(string nodeId) => BuildId("N", nodeId);

    private static string BuildId(string prefix, string source)
    {
        var input = string.IsNullOrWhiteSpace(source) ? "unknown" : source;
        var hash = ComputeFnv1a64(input);
        var hex = hash.ToString("X16");
        return $"{prefix}{hex}";
    }

    private static ulong ComputeFnv1a64(string text)
    {
        const ulong offset = 14695981039346656037;
        const ulong prime = 1099511628211;
        var hash = offset;
        var bytes = System.Text.Encoding.UTF8.GetBytes(text);
        foreach (var b in bytes)
        {
            hash ^= b;
            hash *= prime;
        }

        return hash;
    }
}
