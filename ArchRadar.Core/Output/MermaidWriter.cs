using System.Text;
using ArchRadar.Core.Models;
using ArchRadar.Core.Processing;
using ArchRadar.Core.Config;

namespace ArchRadar.Core.Output;

public static class MermaidWriter
{
    public static void WriteL0(string outputPath, AuditGraph graph)
    {
        var content = BuildL0(graph);
        File.WriteAllText(outputPath, content, Encoding.UTF8);
    }

    public static void WriteL1(string outputPath, AuditGraph graph, string featureKey)
    {
        var content = BuildL1(graph, featureKey);
        File.WriteAllText(outputPath, content, Encoding.UTF8);
    }

    public static void WriteL2(string outputPath, AuditGraph graph, string targetId, L2Config config)
    {
        var l2Graph = L2GraphBuilder.Build(graph, targetId, config);
        var content = BuildL2(l2Graph, targetId);
        File.WriteAllText(outputPath, content, Encoding.UTF8);
    }

    private static string BuildL0(AuditGraph graph)
    {
        var nodeFeatureMap = graph.Nodes.ToDictionary(
            node => node.Id,
            node => string.IsNullOrWhiteSpace(node.FeatureKey) ? "Unresolved" : node.FeatureKey,
            StringComparer.Ordinal);

        var featureKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var feature in nodeFeatureMap.Values)
        {
            featureKeys.Add(feature);
        }

        var featureIdMap = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        var builder = new StringBuilder();
        builder.AppendLine("flowchart LR");
        builder.AppendLine("  classDef unresolved fill:#ffd6d6,stroke:#cc0000,color:#330000;");

        foreach (var feature in featureKeys.OrderBy(key => key, StringComparer.OrdinalIgnoreCase))
        {
            var id = MermaidId.ForFeature(feature);
            featureIdMap[feature] = id;
            builder.AppendLine($"  {id}[\"{Escape(feature)}\"]");
            if (feature.Equals("Unresolved", StringComparison.OrdinalIgnoreCase))
            {
                builder.AppendLine($"  class {id} unresolved;");
            }
        }

        var edgeWeights = new Dictionary<(string From, string To), int>();
        foreach (var edge in graph.Edges)
        {
            if (!nodeFeatureMap.TryGetValue(edge.FromId, out var fromFeature)
                || !nodeFeatureMap.TryGetValue(edge.ToId, out var toFeature))
            {
                continue;
            }

            if (string.Equals(fromFeature, toFeature, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var key = (From: fromFeature, To: toFeature);
            if (edgeWeights.TryGetValue(key, out var weight))
            {
                edgeWeights[key] = weight + edge.Weight;
            }
            else
            {
                edgeWeights[key] = edge.Weight;
            }
        }

        foreach (var entry in edgeWeights.OrderBy(item => item.Key.From).ThenBy(item => item.Key.To))
        {
            if (!featureIdMap.TryGetValue(entry.Key.From, out var fromId)
                || !featureIdMap.TryGetValue(entry.Key.To, out var toId))
            {
                continue;
            }

            builder.AppendLine($"  {fromId} -->|{entry.Value}| {toId}");
        }

        return builder.ToString();
    }

    private static string BuildL1(AuditGraph graph, string featureKey)
    {
        var nodes = graph.Nodes
            .Where(node => string.Equals(node.FeatureKey, featureKey, StringComparison.OrdinalIgnoreCase))
            .ToList();

        var nodeIdSet = new HashSet<string>(nodes.Select(node => node.Id), StringComparer.Ordinal);
        var builder = new StringBuilder();
        builder.AppendLine("flowchart LR");
        builder.AppendLine("  classDef unresolved fill:#ffd6d6,stroke:#cc0000,color:#330000;");

        var nodeIdMap = new Dictionary<string, string>(StringComparer.Ordinal);
        for (var index = 0; index < nodes.Count; index++)
        {
            var node = nodes[index];
            var id = MermaidId.ForNode(node.Id);
            nodeIdMap[node.Id] = id;
            builder.AppendLine($"  {id}[\"{Escape(GetShortLabel(node))}\"]");
            if (node.Kind == AuditNodeKind.Unresolved)
            {
                builder.AppendLine($"  class {id} unresolved;");
            }
        }

        foreach (var edge in graph.Edges)
        {
            if (!nodeIdSet.Contains(edge.FromId) || !nodeIdSet.Contains(edge.ToId))
            {
                continue;
            }

            if (string.Equals(edge.FromId, edge.ToId, StringComparison.Ordinal))
            {
                continue;
            }

            if (!nodeIdMap.TryGetValue(edge.FromId, out var fromId)
                || !nodeIdMap.TryGetValue(edge.ToId, out var toId))
            {
                continue;
            }

            builder.AppendLine($"  {fromId} -->|{edge.EdgeKind}| {toId}");
        }

        return builder.ToString();
    }

    private static string BuildL2(AuditGraph graph, string targetId)
    {
        var builder = new StringBuilder();
        builder.AppendLine("flowchart LR");
        builder.AppendLine("  classDef unresolved fill:#ffd6d6,stroke:#cc0000,color:#330000;");

        var nodeIdMap = new Dictionary<string, string>(StringComparer.Ordinal);
        var nodes = graph.Nodes.ToList();
        for (var index = 0; index < nodes.Count; index++)
        {
            var node = nodes[index];
            var id = MermaidId.ForNode(node.Id);
            nodeIdMap[node.Id] = id;
            builder.AppendLine($"  {id}[\"{Escape(GetShortLabel(node))}\"]");
            if (node.Kind == AuditNodeKind.Unresolved)
            {
                builder.AppendLine($"  class {id} unresolved;");
            }

            if (node.Id == targetId)
            {
                builder.AppendLine($"  style {id} stroke-width:3px;");
            }
        }

        foreach (var edge in graph.Edges)
        {
            if (!nodeIdMap.TryGetValue(edge.FromId, out var fromId)
                || !nodeIdMap.TryGetValue(edge.ToId, out var toId))
            {
                continue;
            }

            if (string.Equals(edge.FromId, edge.ToId, StringComparison.Ordinal))
            {
                continue;
            }

            builder.AppendLine($"  {fromId} -->|{edge.EdgeKind}| {toId}");
        }

        return builder.ToString();
    }

    private static string GetShortLabel(AuditNode node)
    {
        var text = node.NameDisplay;
        if (text.StartsWith("Unresolved::", StringComparison.Ordinal))
        {
            text = text["Unresolved::".Length..];
        }

        if (text.StartsWith("global::", StringComparison.Ordinal))
        {
            text = text["global::".Length..];
        }

        var lastDot = text.LastIndexOf('.');
        return lastDot >= 0 ? text[(lastDot + 1)..] : text;
    }

    private static string Escape(string text)
    {
        return text.Replace("\"", "\\\"", StringComparison.Ordinal);
    }
}
