import type {
  ArchRadarConfig,
  FeatureRule,
  ProjectProfile,
} from '../domain/types';

interface ConfigPanelProps {
  profile: ProjectProfile | null;
  config: ArchRadarConfig | null;
  configPath: string;
  disabled?: boolean;
  busy?: boolean;
  onProfileChange: (next: ProjectProfile) => void;
  onConfigChange: (next: ArchRadarConfig) => void;
  onSave: () => void;
  onReload: () => void;
  onScan: () => void;
}

const ConfigPanel = ({
  profile,
  config,
  configPath,
  disabled,
  busy,
  onProfileChange,
  onConfigChange,
  onSave,
  onReload,
  onScan,
}: ConfigPanelProps) => {
  if (!profile || !config) {
    return (
      <div className="ar-card-muted">
        Select a project to edit scan config.
      </div>
    );
  }

  const normalizePath = (value: string) => {
    const trimmed = value.trim();
    if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length > 1) {
      return trimmed.slice(1, -1);
    }
    return trimmed;
  };

  const updateScan = (next: Partial<ArchRadarConfig['scan']>) => {
    onConfigChange({ ...config, scan: { ...config.scan, ...next } });
  };

  const updateFeatureRules = (rules: FeatureRule[]) => {
    onConfigChange({
      ...config,
      featureRules: { ...config.featureRules, rules },
    });
  };

  const updateExternalGroups = (index: number, value: string, type: 'name' | 'prefixes') => {
    const groups = config.externalFolding.groups.map((group, idx) => {
      if (idx !== index) return group;
      if (type === 'name') {
        return { ...group, name: value };
      }
      const prefixes = value
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter(Boolean);
      return { ...group, prefixes };
    });
    onConfigChange({
      ...config,
      externalFolding: { ...config.externalFolding, groups },
    });
  };

  const updateL2 = (next: Partial<ArchRadarConfig['l2']>) => {
    onConfigChange({ ...config, l2: { ...config.l2, ...next } });
  };

  const issues: { level: 'error' | 'warn'; message: string }[] = [];
  const ruleErrors = new Set<number>();
  const groupErrors = new Set<number>();

  if (!config.featureRules.fallbackFeatureKey?.trim()) {
    issues.push({ level: 'error', message: 'Fallback feature key is required.' });
  }

  config.featureRules.rules.forEach((rule, index) => {
    if (!rule.pattern.trim()) {
      ruleErrors.add(index);
      issues.push({ level: 'error', message: `Feature rule ${index + 1} needs a pattern.` });
    }
  });

  if (config.externalFolding.enabled) {
    config.externalFolding.groups.forEach((group, index) => {
      if (!group.name.trim()) {
        groupErrors.add(index);
        issues.push({ level: 'error', message: `External group ${index + 1} needs a name.` });
      }
    });
  }

  if (config.l2.enabled && config.l2.maxDepth <= 0) {
    issues.push({ level: 'error', message: 'L2 max depth must be greater than 0.' });
  }

  if (config.scan.mode === 'MsBuildSolution' && !config.scan.solutionPath) {
    issues.push({ level: 'warn', message: 'Solution path empty; .sln will be auto-detected.' });
  }

  if (
    config.scan.mode === 'MsBuildSolution' &&
    config.scan.solutionPath &&
    !config.scan.solutionPath.toLowerCase().endsWith('.sln')
  ) {
    issues.push({ level: 'warn', message: 'Solution path should point to a .sln file.' });
  }

  const hasErrors = issues.some((issue) => issue.level === 'error');
  const actionDisabled = disabled || busy || hasErrors;

  return (
    <div className="space-y-4">
      {issues.length > 0 && (
        <div className={`ar-callout ${hasErrors ? 'ar-callout-error' : 'ar-callout-warn'}`}>
          <div className="text-xs font-semibold">
            {hasErrors ? 'Fix issues before saving.' : 'Review warnings before scanning.'}
          </div>
          <ul className="mt-2 space-y-1 text-[11px]">
            {issues.map((issue, index) => (
              <li key={`${issue.level}-${index}`}>{issue.message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="ar-card">
        <h3 className="ar-panel-title">Project Info</h3>
        <p className="ar-help">Read-only fields from the workspace profile.</p>
        <div className="mt-3 space-y-3">
          <div>
            <div className="ar-label">Project Id</div>
            <div className="ar-readonly" title={profile.projectId}>
              {profile.projectId}
            </div>
          </div>
          <div>
            <div className="ar-label">Project Root</div>
            <div className="ar-readonly" title={profile.projectRoot}>
              {profile.projectRoot}
            </div>
          </div>
          <div>
            <div className="ar-label">Config Path</div>
            <div className="ar-readonly" title={configPath}>
              {configPath}
            </div>
          </div>
        </div>
      </div>

      <div className="ar-card">
        <h3 className="ar-panel-title">Scan Roots</h3>
        <p className="ar-help">Optional overrides to narrow what the scanner traverses.</p>
        <label className="mt-3 flex flex-col gap-2">
          <span className="ar-label">Scan Root (optional)</span>
          <input
            className="ar-input"
            value={profile.scanRoot ?? ''}
            disabled={disabled}
            onChange={(event) =>
              onProfileChange({ ...profile, scanRoot: normalizePath(event.target.value) })
            }
          />
        </label>
      </div>

      <div className="ar-card">
        <h3 className="ar-panel-title">Scan Mode</h3>
        <p className="ar-help">Directory scans are fastest, solution scans are richer.</p>
        <div className="mt-3 space-y-3">
          <label className="flex flex-col gap-2">
            <span className="ar-label">Mode</span>
            <select
              className="ar-select"
              value={config.scan.mode}
              disabled={disabled}
              onChange={(event) => updateScan({ mode: event.target.value })}
            >
              <option value="DirectoryOnly">DirectoryOnly</option>
              <option value="MsBuildSolution">MsBuildSolution</option>
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className="ar-label">Solution Path (optional)</span>
            <input
              className="ar-input"
              value={config.scan.solutionPath ?? ''}
              disabled={disabled}
              onChange={(event) => updateScan({ solutionPath: normalizePath(event.target.value) })}
            />
          </label>
        </div>
      </div>

      <div className="ar-card">
        <h3 className="ar-panel-title">Exclude Globs</h3>
        <p className="ar-help">One per line. Use to keep test fixtures or build outputs out.</p>
        <textarea
          className="ar-textarea mt-3 h-28"
          value={config.scan.excludeGlobs.join('\n')}
          disabled={disabled}
          onChange={(event) =>
            updateScan({
              excludeGlobs: event.target.value
                .split(/\r?\n/)
                .map((item) => item.trim())
                .filter(Boolean),
            })
          }
        />
      </div>

      <div className="ar-card">
        <h3 className="ar-panel-title">Feature Rules</h3>
        <p className="ar-help">Map namespaces or folders into feature keys.</p>
        <div className="mt-3 space-y-3">
          <label className="flex flex-col gap-2">
            <span className="ar-label">Fallback Feature Key</span>
            <input
              className={`ar-input ${!config.featureRules.fallbackFeatureKey.trim() ? 'ar-input-error' : ''}`}
              value={config.featureRules.fallbackFeatureKey}
              disabled={disabled}
              onChange={(event) =>
                onConfigChange({
                  ...config,
                  featureRules: {
                    ...config.featureRules,
                    fallbackFeatureKey: event.target.value,
                  },
                })
              }
            />
          </label>
          {config.featureRules.rules.map((rule, index) => (
            <div
              key={`${rule.kind}-${rule.pattern}-${index}`}
              className="rounded-2xl border border-black/10 bg-white/70 p-3"
            >
              <div className="flex items-center gap-2">
                <select
                  className="ar-select"
                  value={rule.kind}
                  disabled={disabled}
                  onChange={(event) => {
                    const next = config.featureRules.rules.slice();
                    next[index] = { ...rule, kind: event.target.value };
                    updateFeatureRules(next);
                  }}
                >
                  <option value="NamespacePattern">NamespacePattern</option>
                  <option value="FolderPattern">FolderPattern</option>
                </select>
                <button
                  className="ar-link-button ml-auto"
                  disabled={disabled}
                  onClick={() => {
                    const next = config.featureRules.rules.filter((_, idx) => idx !== index);
                    updateFeatureRules(next);
                  }}
                  type="button"
                >
                  Remove
                </button>
              </div>
              <input
                className={`ar-input mt-3 ${ruleErrors.has(index) ? 'ar-input-error' : ''}`}
                placeholder="Pattern"
                value={rule.pattern}
                disabled={disabled}
                onChange={(event) => {
                  const next = config.featureRules.rules.slice();
                  next[index] = { ...rule, pattern: event.target.value };
                  updateFeatureRules(next);
                }}
              />
              <input
                className="ar-input mt-3"
                placeholder="FeatureKey (optional)"
                value={rule.featureKey ?? ''}
                disabled={disabled}
                onChange={(event) => {
                  const next = config.featureRules.rules.slice();
                  next[index] = { ...rule, featureKey: event.target.value };
                  updateFeatureRules(next);
                }}
              />
            </div>
          ))}
          <button
            className="ar-ghost-button"
            disabled={disabled}
            onClick={() => {
              updateFeatureRules([
                ...config.featureRules.rules,
                { kind: 'NamespacePattern', pattern: '', featureKey: '' },
              ]);
            }}
            type="button"
          >
            Add Rule
          </button>
        </div>
      </div>

      <div className="ar-card">
        <h3 className="ar-panel-title">External Folding</h3>
        <p className="ar-help">Group external namespaces into rollup buckets.</p>
        <div className="mt-3 space-y-3">
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={config.externalFolding.enabled}
              disabled={disabled}
              onChange={(event) =>
                onConfigChange({
                  ...config,
                  externalFolding: {
                    ...config.externalFolding,
                    enabled: event.target.checked,
                  },
                })
              }
            />
            Enabled
          </label>
          <label className="flex flex-col gap-2">
            <span className="ar-label">Default Group Name</span>
            <input
              className="ar-input"
              value={config.externalFolding.defaultGroupName}
              disabled={disabled}
              onChange={(event) =>
                onConfigChange({
                  ...config,
                  externalFolding: {
                    ...config.externalFolding,
                    defaultGroupName: event.target.value,
                  },
                })
              }
            />
          </label>
          {config.externalFolding.groups.map((group, index) => (
            <div
              key={`${group.name}-${index}`}
              className="rounded-2xl border border-black/10 bg-white/70 p-3"
            >
              <div className="flex items-center gap-2">
                <input
                  className={`ar-input flex-1 ${groupErrors.has(index) ? 'ar-input-error' : ''}`}
                  placeholder="Group name"
                  value={group.name}
                  disabled={disabled}
                  onChange={(event) => updateExternalGroups(index, event.target.value, 'name')}
                />
                <button
                  className="ar-link-button"
                  disabled={disabled}
                  onClick={() => {
                    const next = config.externalFolding.groups.filter((_, idx) => idx !== index);
                    onConfigChange({
                      ...config,
                      externalFolding: { ...config.externalFolding, groups: next },
                    });
                  }}
                  type="button"
                >
                  Remove
                </button>
              </div>
              <textarea
                className="ar-textarea mt-3 h-20"
                placeholder="Prefixes (comma or newline separated)"
                value={group.prefixes.join('\n')}
                disabled={disabled}
                onChange={(event) => updateExternalGroups(index, event.target.value, 'prefixes')}
              />
            </div>
          ))}
          <button
            className="ar-ghost-button"
            disabled={disabled}
            onClick={() =>
              onConfigChange({
                ...config,
                externalFolding: {
                  ...config.externalFolding,
                  groups: [
                    ...config.externalFolding.groups,
                    { name: 'NewGroup', prefixes: [] },
                  ],
                },
              })
            }
            type="button"
          >
            Add Group
          </button>
        </div>
      </div>

      <div className="ar-card">
        <h3 className="ar-panel-title">L2 Config</h3>
        <p className="ar-help">Controls the depth and targets for L2 expansion.</p>
        <div className="mt-3 space-y-3">
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={config.l2.enabled}
              disabled={disabled}
              onChange={(event) =>
                updateL2({
                  enabled: event.target.checked,
                })
              }
            />
            Enabled
          </label>
          <label className="flex flex-col gap-2">
            <span className="ar-label">Targets (comma separated)</span>
            <input
              className="ar-input"
              value={config.l2.targets.join(', ')}
              disabled={disabled}
              onChange={(event) =>
                updateL2({
                  targets: event.target.value
                    .split(',')
                    .map((item) => item.trim())
                    .filter(Boolean),
                })
              }
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="ar-label">Max Depth</span>
            <input
              type="number"
              className={`ar-input ${config.l2.enabled && config.l2.maxDepth <= 0 ? 'ar-input-error' : ''}`}
              value={config.l2.maxDepth}
              disabled={disabled}
              onChange={(event) =>
                updateL2({
                  maxDepth: Number(event.target.value || 0),
                })
              }
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="ar-label">Stop Kinds (comma separated)</span>
            <input
              className="ar-input"
              value={config.l2.stopKinds.join(', ')}
              disabled={disabled}
              onChange={(event) =>
                updateL2({
                  stopKinds: event.target.value
                    .split(',')
                    .map((item) => item.trim())
                    .filter(Boolean),
                })
              }
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="ar-label">Edge Kinds (comma separated, optional)</span>
            <input
              className="ar-input"
              value={config.l2.edgeKinds.join(', ')}
              disabled={disabled}
              onChange={(event) =>
                updateL2({
                  edgeKinds: event.target.value
                    .split(',')
                    .map((item) => item.trim())
                    .filter(Boolean),
                })
              }
            />
          </label>
        </div>
      </div>

      <div className="ar-card">
        <h3 className="ar-panel-title">Debug & Notes</h3>
        <p className="ar-help">Diagnostics and human notes for future runs.</p>
        <div className="mt-3 space-y-3">
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={config.debugEnabled}
              disabled={disabled}
              onChange={(event) =>
                onConfigChange({ ...config, debugEnabled: event.target.checked })
              }
            />
            Debug logging enabled
          </label>
          <label className="flex flex-col gap-2">
            <span className="ar-label">Notes</span>
            <textarea
              className="ar-textarea h-24"
              value={config.notes ?? ''}
              disabled={disabled}
              onChange={(event) =>
                onConfigChange({ ...config, notes: event.target.value })
              }
            />
          </label>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className="ar-button"
          disabled={actionDisabled}
          onClick={onSave}
          type="button"
        >
          Save Config
        </button>
        <button
          className="ar-button"
          disabled={disabled || busy}
          onClick={onReload}
          type="button"
        >
          Reload
        </button>
        <button
          className="ar-button-primary"
          disabled={actionDisabled}
          onClick={onScan}
          type="button"
        >
          Start Scan
        </button>
      </div>
      {busy && (
        <div className="text-[11px] text-slate-500">Working on the requested action...</div>
      )}
      <p className="text-[11px] text-slate-500">
        Saving updates config only. Scans run only when you click Start Scan.
      </p>
    </div>
  );
};

export default ConfigPanel;
