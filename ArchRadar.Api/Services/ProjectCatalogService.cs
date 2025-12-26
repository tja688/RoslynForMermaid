using ArchRadar.Api.Models;

namespace ArchRadar.Api.Services;

public sealed class ProjectCatalogService
{
    private readonly WorkspacePaths _paths;

    public ProjectCatalogService(WorkspacePaths paths)
    {
        _paths = paths;
    }

    public WorkspaceCatalog LoadCatalog()
    {
        return JsonFileStore.ReadOrDefault(_paths.CatalogPath, new WorkspaceCatalog());
    }

    public void SaveCatalog(WorkspaceCatalog catalog)
    {
        catalog.UpdatedAt = DateTimeOffset.UtcNow.ToString("O");
        JsonFileStore.WriteAtomic(_paths.CatalogPath, catalog);
    }

    public ProjectProfile? GetProfile(string projectId)
    {
        var safeId = PathSanitizer.ToSafeId(projectId);
        return JsonFileStore.Read<ProjectProfile>(_paths.ProjectProfilePath(safeId));
    }

    public ProjectProfile? UpdateProfile(string projectId, UpdateProjectProfileRequest request)
    {
        var safeId = PathSanitizer.ToSafeId(projectId);
        var profile = JsonFileStore.Read<ProjectProfile>(_paths.ProjectProfilePath(safeId));
        if (profile == null)
        {
            return null;
        }

        var projectRoot = profile.ProjectRoot;
        if (request.ProjectRoot != null && !string.IsNullOrWhiteSpace(request.ProjectRoot))
        {
            projectRoot = Path.GetFullPath(request.ProjectRoot.Trim());
        }

        if (!Directory.Exists(projectRoot))
        {
            throw new InvalidOperationException($"Project root not found: {projectRoot}");
        }

        profile.ProjectRoot = projectRoot;

        if (!string.IsNullOrWhiteSpace(request.Name))
        {
            profile.Name = request.Name.Trim();
        }

        if (request.ConfigPath != null)
        {
            profile.ConfigPath = string.IsNullOrWhiteSpace(request.ConfigPath)
                ? null
                : request.ConfigPath.Trim();
        }

        if (request.ScanRoot != null)
        {
            profile.ScanRoot = string.IsNullOrWhiteSpace(request.ScanRoot)
                ? null
                : Path.GetFullPath(request.ScanRoot.Trim(), projectRoot);
        }

        profile.UpdatedAt = DateTimeOffset.UtcNow.ToString("O");
        JsonFileStore.WriteAtomic(_paths.ProjectProfilePath(safeId), profile);

        var catalog = LoadCatalog();
        var existing = catalog.Projects.FirstOrDefault(project => project.ProjectId == safeId);
        if (existing != null)
        {
            catalog.Projects.Remove(existing);
        }
        catalog.Projects.Add(new ProjectSummary(profile.ProjectId, profile.Name));
        catalog.LastProjectId = profile.ProjectId;
        SaveCatalog(catalog);

        return profile;
    }

    public ProjectProfile UpsertProject(CreateProjectRequest request)
    {
        var safeId = PathSanitizer.ToSafeId(string.IsNullOrWhiteSpace(request.ProjectId) ? request.Name : request.ProjectId);
        var resolvedRoot = Path.GetFullPath(request.ProjectRoot.Trim());
        var profile = new ProjectProfile
        {
            ProjectId = safeId,
            Name = string.IsNullOrWhiteSpace(request.Name) ? safeId : request.Name.Trim(),
            ProjectRoot = resolvedRoot,
            ConfigPath = string.IsNullOrWhiteSpace(request.ConfigPath) ? null : request.ConfigPath.Trim(),
            ScanRoot = string.IsNullOrWhiteSpace(request.ScanRoot) ? null : Path.GetFullPath(request.ScanRoot.Trim(), resolvedRoot),
            UpdatedAt = DateTimeOffset.UtcNow.ToString("O")
        };

        JsonFileStore.WriteAtomic(_paths.ProjectProfilePath(safeId), profile);

        var catalog = LoadCatalog();
        var existing = catalog.Projects.FirstOrDefault(project => project.ProjectId == safeId);
        if (existing == null)
        {
            catalog.Projects.Add(new ProjectSummary(profile.ProjectId, profile.Name));
        }
        else
        {
            catalog.Projects.Remove(existing);
            catalog.Projects.Add(new ProjectSummary(profile.ProjectId, profile.Name));
        }

        catalog.LastProjectId = profile.ProjectId;
        SaveCatalog(catalog);
        return profile;
    }
}
