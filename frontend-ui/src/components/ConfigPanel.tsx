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
      <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
        <div className="text-xs text-slate-500">Select a project to edit scan config.</div>
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

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Project Settings
        </h2>
        <div className="mt-3 space-y-3 text-xs text-slate-700">
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Project Root
            <input
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
              value={profile.projectRoot}
              readOnly
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Scan Root (optional)
            <input
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
              value={profile.scanRoot ?? ''}
              disabled={disabled}
              onChange={(event) =>
                onProfileChange({ ...profile, scanRoot: normalizePath(event.target.value) })
              }
            />
          </label>
          <div className="text-[11px] text-slate-500">Config: {configPath}</div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Scan Config
        </h2>
        <div className="mt-3 space-y-3 text-xs text-slate-700">
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Mode
            <select
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
              value={config.scan.mode}
              disabled={disabled}
              onChange={(event) => updateScan({ mode: event.target.value })}
            >
              <option value="DirectoryOnly">DirectoryOnly</option>
              <option value="MsBuildSolution">MsBuildSolution</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Solution Path (optional)
            <input
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
              value={config.scan.solutionPath ?? ''}
              disabled={disabled}
              onChange={(event) => updateScan({ solutionPath: normalizePath(event.target.value) })}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Exclude Globs (one per line)
            <textarea
              className="h-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
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
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Feature Rules
        </h2>
        <div className="mt-3 space-y-3 text-xs text-slate-700">
          {config.featureRules.rules.map((rule, index) => (
            <div key={`${rule.kind}-${rule.pattern}-${index}`} className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="flex items-center gap-2">
                <select
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
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
                  className="ml-auto text-[11px] text-rose-500 hover:underline"
                  disabled={disabled}
                  onClick={() => {
                    const next = config.featureRules.rules.filter((_, idx) => idx !== index);
                    updateFeatureRules(next);
                  }}
                >
                  Remove
                </button>
              </div>
              <input
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
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
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
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
            className="w-full rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"
            disabled={disabled}
            onClick={() => {
              updateFeatureRules([
                ...config.featureRules.rules,
                { kind: 'NamespacePattern', pattern: '', featureKey: '' },
              ]);
            }}
          >
            Add Rule
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          External Folding
        </h2>
        <div className="mt-3 space-y-3 text-xs text-slate-700">
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
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
          {config.externalFolding.groups.map((group, index) => (
            <div key={`${group.name}-${index}`} className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="flex items-center gap-2">
                <input
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                  placeholder="Group name"
                  value={group.name}
                  disabled={disabled}
                  onChange={(event) => updateExternalGroups(index, event.target.value, 'name')}
                />
                <button
                  className="text-[11px] text-rose-500 hover:underline"
                  disabled={disabled}
                  onClick={() => {
                    const next = config.externalFolding.groups.filter((_, idx) => idx !== index);
                    onConfigChange({
                      ...config,
                      externalFolding: { ...config.externalFolding, groups: next },
                    });
                  }}
                >
                  Remove
                </button>
              </div>
              <textarea
                className="h-16 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs"
                placeholder="Prefixes (comma or newline separated)"
                value={group.prefixes.join('\n')}
                disabled={disabled}
                onChange={(event) => updateExternalGroups(index, event.target.value, 'prefixes')}
              />
            </div>
          ))}
          <button
            className="w-full rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"
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
          >
            Add Group
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          L2 Config
        </h2>
        <div className="mt-3 space-y-3 text-xs text-slate-700">
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <input
              type="checkbox"
              checked={config.l2.enabled}
              disabled={disabled}
              onChange={(event) =>
                onConfigChange({
                  ...config,
                  l2: { ...config.l2, enabled: event.target.checked },
                })
              }
            />
            Enabled
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Max Depth
            <input
              type="number"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
              value={config.l2.maxDepth}
              disabled={disabled}
              onChange={(event) =>
                onConfigChange({
                  ...config,
                  l2: { ...config.l2, maxDepth: Number(event.target.value || 0) },
                })
              }
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Stop Kinds (comma separated)
            <input
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
              value={config.l2.stopKinds.join(', ')}
              disabled={disabled}
              onChange={(event) =>
                onConfigChange({
                  ...config,
                  l2: {
                    ...config.l2,
                    stopKinds: event.target.value
                      .split(',')
                      .map((item) => item.trim())
                      .filter(Boolean),
                  },
                })
              }
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Edge Kinds (comma separated, optional)
            <input
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
              value={config.l2.edgeKinds.join(', ')}
              disabled={disabled}
              onChange={(event) =>
                onConfigChange({
                  ...config,
                  l2: {
                    ...config.l2,
                    edgeKinds: event.target.value
                      .split(',')
                      .map((item) => item.trim())
                      .filter(Boolean),
                  },
                })
              }
            />
          </label>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:-translate-y-0.5 hover:shadow-md"
          disabled={disabled || busy}
          onClick={onSave}
        >
          Save Config
        </button>
        <button
          className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:-translate-y-0.5 hover:shadow-md"
          disabled={disabled || busy}
          onClick={onReload}
        >
          Reload
        </button>
        <button
          className="flex-1 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800 shadow-sm hover:-translate-y-0.5 hover:shadow-md"
          disabled={disabled || busy}
          onClick={onScan}
        >
          Start Scan
        </button>
      </div>
    </div>
  );
};

export default ConfigPanel;
