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
  const showSnapshotHint = !controlsDisabled && snapshots.length === 0;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="ar-label">Data Source</label>
        <select
          className="ar-select"
          value={source}
          onChange={(event) => onSourceChange(event.target.value as DataSource)}
        >
          <option value="demo">Demo (editable)</option>
          <option value="local">Local API</option>
          <option value="mock">Mock API</option>
        </select>
        <p className="ar-help">Switch between demo, live API, and mock data.</p>
      </div>

      <div className={`ar-callout ${apiAvailable ? 'ar-callout-ok' : 'ar-callout-warn'}`}>
        {apiAvailable ? (
          <span>API healthy{apiVersion ? ` (${apiVersion})` : ''}.</span>
        ) : (
          <span>API offline. Demo mode is recommended.</span>
        )}
      </div>

      <div className="space-y-2">
        <label className="ar-label">Project</label>
        <select
          className="ar-select"
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
        <p className="ar-help">Select a registered project workspace.</p>
      </div>

      <div className="space-y-2">
        <label className="ar-label">Snapshot</label>
        <select
          className="ar-select"
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
        <p className="ar-help">Pick a scan result to browse.</p>
      </div>

      <div className="space-y-2">
        <label className="ar-label">Layer</label>
        <select
          className="ar-select"
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
        <p className="ar-help">L0 for overview, L1/L2 for drilldowns.</p>
      </div>

      {showSnapshotHint && (
        <div className="ar-callout ar-callout-muted">
          No snapshots yet. Run a scan to populate layers.
        </div>
      )}
    </div>
  );
};

export default SnapshotPanel;
