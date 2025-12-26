namespace ArchRadar.Api.Services;

public sealed class WorkspacePaths
{
    public WorkspacePaths(string root)
    {
        Root = root;
    }

    public string Root { get; }

    public string CatalogPath => Path.Combine(Root, "catalog.json");

    public string ProjectsRoot => Path.Combine(Root, "projects");

    public string ProjectRoot(string projectId) => Path.Combine(ProjectsRoot, projectId);

    public string ProjectProfilePath(string projectId) => Path.Combine(ProjectRoot(projectId), "profile.json");

    public string ProjectSnapshotsRoot(string projectId) => Path.Combine(ProjectRoot(projectId), "snapshots");

    public string SnapshotRoot(string projectId, string snapshotId) => Path.Combine(ProjectSnapshotsRoot(projectId), snapshotId);

    public string SnapshotIndexPath(string projectId, string snapshotId) => Path.Combine(SnapshotRoot(projectId, snapshotId), "index.json");

    public string SnapshotAuditPath(string projectId, string snapshotId) => Path.Combine(SnapshotRoot(projectId, snapshotId), "audit.json");
}
