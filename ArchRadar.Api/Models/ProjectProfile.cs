namespace ArchRadar.Api.Models;

public sealed class ProjectProfile
{
    public string ProjectId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string ProjectRoot { get; set; } = string.Empty;
    public string? ConfigPath { get; set; }
    public string? ScanRoot { get; set; }
    public string? Notes { get; set; }
    public string? UpdatedAt { get; set; }
}
