import type { DataSource, ProjectSummary, SnapshotSummary } from '../domain/types';

interface SnapshotPanelProps {
  source: DataSource;
  onSourceChange: (value: DataSource) => void;
  projects: ProjectSummary[];
  snapshots: SnapshotSummary[];
  layers: string[];
  selectedProjectId: string;
  selectedSnapshotId: string;
  selectedLayer: string;
  onProjectChange: (value: string) => void;
  onSnapshotChange: (value: string) => void;
  onLayerChange: (value: string) => void;
  apiAvailable: boolean;
  apiVersion?: string;
}

const SnapshotPanel = ({
  source,
  onSourceChange,
  projects,
  snapshots,
  layers,
  selectedProjectId,
  selectedSnapshotId,
  selectedLayer,
  onProjectChange,
  onSnapshotChange,
  onLayerChange,
  apiAvailable,
  apiVersion,
}: SnapshotPanelProps) => {
  const controlsDisabled = source === 'demo' || (source === 'local' && !apiAvailable);

  return (
    <div className="space-y-4">
      <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Data Source
        <select
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm"
          value={source}
          onChange={(event) => onSourceChange(event.target.value as DataSource)}
        >
          <option value="demo">Demo (editable)</option>
          <option value="local">Local API</option>
          <option value="mock">Mock API</option>
        </select>
      </label>

      <div className="rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs text-slate-600">
        {apiAvailable ? (
          <span>API health ok{apiVersion ? ` (${apiVersion})` : ''}.</span>
        ) : (
          <span>API offline. Demo mode is recommended.</span>
        )}
      </div>

      <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Project
        <select
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm disabled:bg-slate-100"
          value={selectedProjectId}
          onChange={(event) => onProjectChange(event.target.value)}
          disabled={controlsDisabled}
        >
          {projects.length === 0 ? (
            <option value="">No projects</option>
          ) : (
            projects.map((project) => (
              <option key={project.projectId} value={project.projectId}>
                {project.name}
              </option>
            ))
          )}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Snapshot
        <select
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm disabled:bg-slate-100"
          value={selectedSnapshotId}
          onChange={(event) => onSnapshotChange(event.target.value)}
          disabled={controlsDisabled}
        >
          {snapshots.length === 0 ? (
            <option value="">No snapshots</option>
          ) : (
            snapshots.map((snapshot) => (
              <option key={snapshot.snapshotId} value={snapshot.snapshotId}>
                {snapshot.label ?? snapshot.snapshotId}
              </option>
            ))
          )}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Layer
        <select
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm disabled:bg-slate-100"
          value={selectedLayer}
          onChange={(event) => onLayerChange(event.target.value)}
          disabled={controlsDisabled}
        >
          {layers.length === 0 ? (
            <option value="">No layers</option>
          ) : (
            layers.map((layer) => (
              <option key={layer} value={layer}>
                {layer}
              </option>
            ))
          )}
        </select>
      </label>
    </div>
  );
};

export default SnapshotPanel;
