namespace ArchRadar.Api.Models;

public sealed class WorkspaceCatalog
{
    public List<ProjectSummary> Projects { get; set; } = new();
    public string? LastProjectId { get; set; }
    public string? Notes { get; set; }
    public string? UpdatedAt { get; set; }
}
