namespace ArchRadar.Core.Models;

public sealed class AuditEdge
{
    public required string FromId { get; init; }
    public required string ToId { get; init; }
    public required AuditEdgeKind EdgeKind { get; init; }
    public int Weight { get; set; } = 1;
    public List<AuditCallSite> CallSites { get; } = new();
    public AuditConfidence Confidence { get; set; } = AuditConfidence.Low;
}
