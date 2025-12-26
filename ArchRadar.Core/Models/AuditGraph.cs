namespace ArchRadar.Core.Models;

public sealed class AuditGraph
{
    private readonly Dictionary<string, AuditNode> _nodesById = new(StringComparer.Ordinal);
    private readonly Dictionary<string, AuditEdge> _edgesByKey = new(StringComparer.Ordinal);

    public IReadOnlyCollection<AuditNode> Nodes => _nodesById.Values;
    public IReadOnlyCollection<AuditEdge> Edges => _edgesByKey.Values;

    public AuditNode GetOrAddNode(AuditNode node)
    {
        if (_nodesById.TryGetValue(node.Id, out var existing))
        {
            if (existing.Source == null && node.Source != null)
            {
                existing.Source = node.Source;
            }

            if (existing.Kind == AuditNodeKind.Unresolved && node.Kind != AuditNodeKind.Unresolved)
            {
                existing.Kind = node.Kind;
            }

            if (string.Equals(existing.FeatureKey, "Unresolved", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(node.FeatureKey, "Unresolved", StringComparison.OrdinalIgnoreCase))
            {
                existing.FeatureKey = node.FeatureKey;
            }

            return existing;
        }

        _nodesById[node.Id] = node;
        return node;
    }

    public AuditEdge MergeEdge(AuditEdge edge)
    {
        var target = GetOrCreateEdge(edge.FromId, edge.ToId, edge.EdgeKind, edge.Confidence);
        target.Weight += edge.Weight;
        foreach (var callSite in edge.CallSites)
        {
            AddCallSiteUnique(target, callSite);
        }

        if (edge.Confidence > target.Confidence)
        {
            target.Confidence = edge.Confidence;
        }

        return target;
    }

    public AuditEdge AddEdge(string fromId, string toId, AuditEdgeKind kind, AuditConfidence confidence, AuditCallSite? callSite)
    {
        var edge = GetOrCreateEdge(fromId, toId, kind, confidence);
        edge.Weight += 1;
        if (callSite != null)
        {
            AddCallSiteUnique(edge, callSite);
        }

        if (confidence > edge.Confidence)
        {
            edge.Confidence = confidence;
        }

        return edge;
    }

    private AuditEdge GetOrCreateEdge(string fromId, string toId, AuditEdgeKind kind, AuditConfidence confidence)
    {
        var key = $"{fromId}|{kind}|{toId}";
        if (_edgesByKey.TryGetValue(key, out var edge))
        {
            return edge;
        }

        edge = new AuditEdge
        {
            FromId = fromId,
            ToId = toId,
            EdgeKind = kind,
            Weight = 0,
            Confidence = confidence
        };
        _edgesByKey[key] = edge;
        return edge;
    }

    private static void AddCallSiteUnique(AuditEdge edge, AuditCallSite callSite)
    {
        foreach (var existing in edge.CallSites)
        {
            if (string.Equals(existing.File, callSite.File, StringComparison.OrdinalIgnoreCase)
                && existing.Line == callSite.Line
                && existing.Col == callSite.Col
                && string.Equals(existing.Snippet, callSite.Snippet, StringComparison.Ordinal))
            {
                return;
            }
        }

        edge.CallSites.Add(callSite);
    }
}
