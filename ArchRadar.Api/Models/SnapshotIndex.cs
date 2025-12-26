namespace ArchRadar.Api.Models;

public sealed class SnapshotIndex
{
    public string SnapshotId { get; set; } = string.Empty;
    public string ProjectId { get; set; } = string.Empty;
    public string Timestamp { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public int NodeCount { get; set; }
    public int EdgeCount { get; set; }
    public List<LayerEntry> Layers { get; set; } = new();
}

public sealed class LayerEntry
{
    public string LayerId { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
}
