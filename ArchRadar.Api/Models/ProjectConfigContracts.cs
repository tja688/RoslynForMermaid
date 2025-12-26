using ArchRadar.Core.Config;

namespace ArchRadar.Api.Models;

public sealed record ProjectConfigResponse(string Path, ArchRadarConfig Config);

public sealed record UpdateProjectConfigRequest(ArchRadarConfig Config);

public sealed record UpdateProjectProfileRequest(string? Name, string? ProjectRoot, string? ConfigPath, string? ScanRoot);
