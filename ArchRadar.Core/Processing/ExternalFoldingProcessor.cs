using ArchRadar.Core.Config;
using ArchRadar.Core.Models;

namespace ArchRadar.Core.Processing;

public static class ExternalFoldingProcessor
{
    public static AuditGraph Apply(AuditGraph graph, ExternalFoldingConfig config)
    {
        if (!config.Enabled || config.Groups.Count == 0)
        {
            return graph;
        }

        var matcher = new ExternalGroupMatcher(config);
        var remap = new Dictionary<string, string>(StringComparer.Ordinal);
        var output = new AuditGraph();

        foreach (var node in graph.Nodes)
        {
            if (node.Kind == AuditNodeKind.Unresolved || node.Kind == AuditNodeKind.External)
            {
                if (matcher.TryResolve(node.NameDisplay, out var groupName))
                {
                    var externalId = $"External::{groupName}";
                    remap[node.Id] = externalId;
                    output.GetOrAddNode(new AuditNode
                    {
                        Id = externalId,
                        Kind = AuditNodeKind.External,
                        NameDisplay = groupName,
                        FeatureKey = "External"
                    });
                    continue;
                }
            }

            output.GetOrAddNode(CloneNode(node));
        }

        foreach (var edge in graph.Edges)
        {
            var fromId = remap.TryGetValue(edge.FromId, out var mappedFrom) ? mappedFrom : edge.FromId;
            var toId = remap.TryGetValue(edge.ToId, out var mappedTo) ? mappedTo : edge.ToId;
            var mergedEdge = new AuditEdge
            {
                FromId = fromId,
                ToId = toId,
                EdgeKind = edge.EdgeKind,
                Weight = edge.Weight,
                Confidence = edge.Confidence
            };
            mergedEdge.CallSites.AddRange(edge.CallSites);
            output.MergeEdge(mergedEdge);
        }

        ArchRadar.Core.Diagnostics.DebugLog.Write($"外部折叠完成: nodes={output.Nodes.Count}, edges={output.Edges.Count}");
        return output;
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

    private sealed class ExternalGroupMatcher
    {
        private readonly List<ExternalGroupEntry> _entries = new();

        public ExternalGroupMatcher(ExternalFoldingConfig config)
        {
            foreach (var group in config.Groups)
            {
                foreach (var prefix in group.Prefixes.Where(prefix => !string.IsNullOrWhiteSpace(prefix)))
                {
                    _entries.Add(new ExternalGroupEntry(group.Name, prefix));
                }
            }
        }

        public bool TryResolve(string text, out string groupName)
        {
            var normalized = NormalizeText(text);
            foreach (var entry in _entries)
            {
                if (normalized.StartsWith(entry.Prefix, StringComparison.OrdinalIgnoreCase)
                    || normalized.Contains($"{entry.Prefix}.", StringComparison.OrdinalIgnoreCase))
                {
                    groupName = entry.GroupName;
                    return true;
                }
            }

            groupName = string.Empty;
            return false;
        }

        private static string NormalizeText(string text)
        {
            if (string.IsNullOrWhiteSpace(text))
            {
                return string.Empty;
            }

            var trimmed = text.Trim();
            var noGlobal = trimmed.StartsWith("global::", StringComparison.Ordinal) ? trimmed[8..] : trimmed;
            var openParen = noGlobal.IndexOf('(');
            return openParen >= 0 ? noGlobal[..openParen] : noGlobal;
        }
    }

    private sealed record ExternalGroupEntry(string GroupName, string Prefix);
}
