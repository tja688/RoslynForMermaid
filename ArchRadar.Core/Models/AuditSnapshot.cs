namespace ArchRadar.Core.Models;

public sealed class AuditSnapshot
{
    public List<AuditNode> Nodes { get; set; } = new();
    public List<AuditEdge> Edges { get; set; } = new();
}
