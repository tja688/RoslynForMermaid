using ArchRadar.Api.Models;

namespace ArchRadar.Api.Services;

public sealed class SnapshotService
{
    private readonly WorkspacePaths _paths;

    public SnapshotService(WorkspacePaths paths)
    {
        _paths = paths;
    }

    public List<SnapshotSummary> ListSnapshots(string projectId)
    {
        var safeId = PathSanitizer.ToSafeId(projectId);
        var root = _paths.ProjectSnapshotsRoot(safeId);
        if (!Directory.Exists(root))
        {
            return new List<SnapshotSummary>();
        }

        var summaries = new List<SnapshotSummary>();
        foreach (var directory in Directory.EnumerateDirectories(root))
        {
            var snapshotId = Path.GetFileName(directory);
            var index = JsonFileStore.Read<SnapshotIndex>(_paths.SnapshotIndexPath(safeId, snapshotId));
            if (index == null)
            {
                continue;
            }

            summaries.Add(new SnapshotSummary(index.SnapshotId, index.Timestamp, index.Notes));
        }

        return summaries
            .OrderByDescending(item => item.Timestamp)
            .ToList();
    }

    public SnapshotIndex? GetSnapshotIndex(string projectId, string snapshotId)
    {
        var safeId = PathSanitizer.ToSafeId(projectId);
        return JsonFileStore.Read<SnapshotIndex>(_paths.SnapshotIndexPath(safeId, snapshotId));
    }

    public ArchRadar.Core.Models.AuditSnapshot? ReadAudit(string projectId, string snapshotId)
    {
        var safeId = PathSanitizer.ToSafeId(projectId);
        var path = _paths.SnapshotAuditPath(safeId, snapshotId);
        return JsonFileStore.Read<ArchRadar.Core.Models.AuditSnapshot>(path);
    }

    public string? ReadLayerDiagram(string projectId, string snapshotId, string layerId)
    {
        var index = GetSnapshotIndex(projectId, snapshotId);
        if (index == null)
        {
            return null;
        }

        var layer = index.Layers.FirstOrDefault(entry => entry.LayerId == layerId);
        if (layer == null)
        {
            return null;
        }

        var safeId = PathSanitizer.ToSafeId(projectId);
        var snapshotRoot = _paths.SnapshotRoot(safeId, snapshotId);
        var path = Path.Combine(snapshotRoot, layer.FileName);
        return File.Exists(path) ? File.ReadAllText(path) : null;
    }
}
