using System.Security.Cryptography;
using System.Text;

namespace ArchRadar.Core.Output;

public static class MermaidId
{
    public static string ForFeature(string featureKey) => BuildId("F", featureKey);

    public static string ForNode(string nodeId) => BuildId("N", nodeId);

    private static string BuildId(string prefix, string source)
    {
        var input = string.IsNullOrWhiteSpace(source) ? "unknown" : source;
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        var hex = Convert.ToHexString(hash.AsSpan(0, 8));
        return $"{prefix}{hex}";
    }
}
