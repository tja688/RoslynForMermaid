using ArchRadar.Core.Config;
using ArchRadar.Core.Diagnostics;
using ArchRadar.Core.Models;

namespace ArchRadar.Core.Processing;

public static class L2GraphBuilder
{
    public static AuditGraph Build(AuditGraph graph, string targetId, L2Config config)
    {
        var nodeMap = graph.Nodes.ToDictionary(node => node.Id, node => node, StringComparer.Ordinal);
        if (!nodeMap.ContainsKey(targetId))
        {
            return new AuditGraph();
        }

        var stopKinds = ParseStopKinds(config);
        var allowedEdgeKinds = ParseEdgeKinds(config);
        var maxDepth = config.MaxDepth <= 0 ? 3 : config.MaxDepth;

        var selectedNodes = new HashSet<string>(StringComparer.Ordinal) { targetId };
        var selectedEdges = new List<AuditEdge>();

        foreach (var edge in graph.Edges)
        {
            if (!allowedEdgeKinds.Contains(edge.EdgeKind))
            {
                continue;
            }

            if (edge.ToId == targetId)
            {
                selectedEdges.Add(edge);
                selectedNodes.Add(edge.FromId);
            }
        }

        var queue = new Queue<(string Id, int Depth)>();
        queue.Enqueue((targetId, 0));

        while (queue.Count > 0)
        {
            var (currentId, depth) = queue.Dequeue();
            if (depth >= maxDepth)
            {
                continue;
            }

            if (currentId != targetId
                && nodeMap.TryGetValue(currentId, out var currentNode)
                && stopKinds.Contains(currentNode.Kind))
            {
                continue;
            }

            foreach (var edge in graph.Edges)
            {
                if (!allowedEdgeKinds.Contains(edge.EdgeKind))
                {
                    continue;
                }

                if (edge.FromId != currentId)
                {
                    continue;
                }

                selectedEdges.Add(edge);
                if (selectedNodes.Add(edge.ToId))
                {
                    queue.Enqueue((edge.ToId, depth + 1));
                }
            }
        }

        var output = new AuditGraph();
        foreach (var nodeId in selectedNodes)
        {
            if (nodeMap.TryGetValue(nodeId, out var node))
            {
                output.GetOrAddNode(CloneNode(node));
            }
        }

        foreach (var edge in selectedEdges)
        {
            if (!selectedNodes.Contains(edge.FromId) || !selectedNodes.Contains(edge.ToId))
            {
                continue;
            }

            var mergedEdge = new AuditEdge
            {
                FromId = edge.FromId,
                ToId = edge.ToId,
                EdgeKind = edge.EdgeKind,
                Weight = edge.Weight,
                Confidence = edge.Confidence
            };
            mergedEdge.CallSites.AddRange(edge.CallSites);
            output.MergeEdge(mergedEdge);
        }

        DebugLog.Write($"L2 构建完成: target={targetId}, nodes={output.Nodes.Count}, edges={output.Edges.Count}");
        return output;
    }

    private static HashSet<AuditNodeKind> ParseStopKinds(L2Config config)
    {
        var result = new HashSet<AuditNodeKind>();
        foreach (var text in config.StopKinds)
        {
            if (Enum.TryParse<AuditNodeKind>(text, true, out var kind))
            {
                result.Add(kind);
            }
        }

        return result;
    }

    private static HashSet<AuditEdgeKind> ParseEdgeKinds(L2Config config)
    {
        var result = new HashSet<AuditEdgeKind>();
        if (config.EdgeKinds.Count == 0)
        {
            foreach (var kind in Enum.GetValues<AuditEdgeKind>())
            {
                result.Add(kind);
            }
            return result;
        }

        foreach (var text in config.EdgeKinds)
        {
            if (Enum.TryParse<AuditEdgeKind>(text, true, out var kind))
            {
                result.Add(kind);
            }
        }

        return result;
    }

    private static AuditNode CloneNode(AuditNode node)
    {
        return new AuditNode
        {
            Id = node.Id,
            Kind = node.Kind,
            NameDisplay = node.NameDisplay,
            FeatureKey = node.FeatureKey,
            Source = node.Source
        };
    }
}
