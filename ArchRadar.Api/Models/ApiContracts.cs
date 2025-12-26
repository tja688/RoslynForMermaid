namespace ArchRadar.Api.Models;

public sealed record HealthResponse(bool Ok, string Version);

public sealed record ProjectSummary(string ProjectId, string Name);

public sealed record SnapshotSummary(string SnapshotId, string Timestamp, string? Label);

public sealed record LayerResponse(IReadOnlyList<string> Layers);

public sealed record DiagramResponse(string Mmd);

public sealed record CreateProjectRequest(string ProjectId, string Name, string ProjectRoot, string? ConfigPath, string? ScanRoot);

public sealed record ScanRequest(string? Notes);

public sealed record OpenRequest(string File, int? Line, int? Col);

public sealed record OpenResponse(bool Ok, string? Message);
