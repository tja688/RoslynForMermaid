namespace ArchRadar.Core.Models;

public sealed class AuditNode
{
    public required string Id { get; init; }
    public required AuditNodeKind Kind { get; set; }
    public required string NameDisplay { get; init; }
    public required string FeatureKey { get; set; }
    public AuditSource? Source { get; set; }
}
