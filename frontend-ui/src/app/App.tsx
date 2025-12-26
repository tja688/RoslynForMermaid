import { useEffect, useMemo, useState } from 'react';
import MermaidPreview from '../components/MermaidPreview';
import { exportSvg } from '../components/MermaidPreview';
import SnapshotPanel from '../components/SnapshotPanel';
import ConfigPanel from '../components/ConfigPanel';
import ThemePicker from '../components/ThemePicker';
import type {
  ArchRadarConfig,
  DataSource,
  AuditEdge,
  AuditSnapshot,
  MermaidRenderOptions,
  ProjectProfile,
  ProjectSummary,
  SnapshotSummary,
} from '../domain/types';
import {
  getBackgroundById,
  getThemeConfig,
  type ThemeType,
} from '../domain/themeCatalog';
import {
  buildFeatureIndex,
  buildL2LayerMap,
  buildNodeIndex,
  collectNodeEdges,
  findEdge,
  getNodeById,
} from '../domain/auditMapping';
import * as api from '../services/api';
import * as mockApi from '../services/mockApi';

const demoMermaid = `flowchart TB
  A[Architecture Radar] --> B[Signal Intake]
  B --> C[Layered Analyzer]
  C --> D{Insights}
  D -->|L0| E[Scope Map]
  D -->|L1| F[Feature Threads]
  D -->|L2| G[Dependency Paths]
  E --> H[(Snapshot Store)]
  F --> H
  G --> H`;

const App = () => {
  const [themeKey, setThemeKey] = useState<ThemeType>('spotless');
  const [backgroundKey, setBackgroundKey] = useState('default');
  const [fontKey, setFontKey] = useState('default');
  const [source, setSource] = useState<DataSource>('demo');

  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([]);
  const [layers, setLayers] = useState<string[]>([]);

  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedSnapshotId, setSelectedSnapshotId] = useState('');
  const [selectedLayer, setSelectedLayer] = useState('');

  const [code, setCode] = useState(demoMermaid);
  const [localCode, setLocalCode] = useState(demoMermaid);
  const [renderError, setRenderError] = useState('');
  const [apiMessage, setApiMessage] = useState('');
  const [apiAvailable, setApiAvailable] = useState(false);
  const [apiVersion, setApiVersion] = useState<string | undefined>(undefined);
  const [profile, setProfile] = useState<ProjectProfile | null>(null);
  const [config, setConfig] = useState<ArchRadarConfig | null>(null);
  const [configPath, setConfigPath] = useState('');
  const [configBusy, setConfigBusy] = useState(false);
  const [audit, setAudit] = useState<AuditSnapshot | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedFeatureKey, setSelectedFeatureKey] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<AuditEdge | null>(null);

  const renderOptions: MermaidRenderOptions = useMemo(
    () => ({
      securityLevel: 'loose',
      maxTextSize: 5000,
      suppressErrors: true,
    }),
    [],
  );

  useEffect(() => {
    setRenderError('');
  }, [code]);

  const nodeIndex = useMemo(() => buildNodeIndex(audit), [audit]);
  const featureIndex = useMemo(() => buildFeatureIndex(audit), [audit]);
  const l2LayerMap = useMemo(() => buildL2LayerMap(audit), [audit]);
  const selectedNode = useMemo(() => getNodeById(audit, selectedNodeId), [audit, selectedNodeId]);
  const selectedNodeEdges = useMemo(
    () => collectNodeEdges(audit, selectedNodeId),
    [audit, selectedNodeId],
  );

  useEffect(() => {
    api
      .getHealth()
      .then((data) => {
        setApiAvailable(true);
        setApiVersion(data.version);
        setApiMessage('');
      })
      .catch((error) => {
        const base = import.meta.env.VITE_API_BASE || '(empty)';
        setApiAvailable(false);
        setApiVersion(undefined);
        setApiMessage(
          error instanceof Error
            ? `Backend not started. VITE_API_BASE=${base} (${error.message})`
            : `Backend not started. VITE_API_BASE=${base}`,
        );
      });
  }, []);

  useEffect(() => {
    if (source === 'demo') {
      setCode(localCode);
      setProjects([]);
      setSnapshots([]);
      setLayers([]);
      setSelectedProjectId('');
      setSelectedSnapshotId('');
      setSelectedLayer('');
      setProfile(null);
      setConfig(null);
      setConfigPath('');
      setConfigBusy(false);
      setAudit(null);
      setSelectedNodeId(null);
      setSelectedFeatureKey(null);
      setSelectedEdge(null);
      return;
    }

    if (source === 'local' && !apiAvailable) {
      setApiMessage('Backend not started (using demo mode).');
      setCode(localCode);
      setProjects([]);
      setSnapshots([]);
      setLayers([]);
      setSelectedProjectId('');
      setSelectedSnapshotId('');
      setSelectedLayer('');
      setProfile(null);
      setConfig(null);
      setConfigPath('');
      setConfigBusy(false);
      setAudit(null);
      setSelectedNodeId(null);
      setSelectedFeatureKey(null);
      setSelectedEdge(null);
      return;
    }

    const client = source === 'mock' ? mockApi : api;
    let cancelled = false;

    client
      .getProjects()
      .then((data) => {
        if (cancelled) return;
        setApiMessage('');
        setProjects(data);
        const firstProject = data[0]?.projectId ?? '';
        setSelectedProjectId(firstProject);
      })
      .catch((error) => {
        if (cancelled) return;
        setApiMessage(error instanceof Error ? error.message : 'Failed to load projects.');
      });

    return () => {
      cancelled = true;
    };
  }, [source, apiAvailable, localCode]);

  useEffect(() => {
    if (source === 'demo' || !selectedProjectId) {
      setSnapshots([]);
      setSelectedSnapshotId('');
      setAudit(null);
      return;
    }

    const client = source === 'mock' ? mockApi : api;
    let cancelled = false;

    client
      .getSnapshots(selectedProjectId)
      .then((data) => {
        if (cancelled) return;
        setApiMessage('');
        setSnapshots(data);
        setSelectedSnapshotId(data[0]?.snapshotId ?? '');
      })
      .catch((error) => {
        if (cancelled) return;
        setApiMessage(error instanceof Error ? error.message : 'Failed to load snapshots.');
      });

    return () => {
      cancelled = true;
    };
  }, [source, selectedProjectId]);

  useEffect(() => {
    if (source === 'demo' || !selectedProjectId) {
      setProfile(null);
      setConfig(null);
      setConfigPath('');
      return;
    }

    const client = source === 'mock' ? mockApi : api;
    let cancelled = false;

    Promise.all([
      client.getProjectProfile(selectedProjectId),
      client.getProjectConfig(selectedProjectId),
    ])
      .then(([profileData, configData]) => {
        if (cancelled) return;
        setProfile(profileData);
        setConfig(configData.config);
        setConfigPath(configData.path);
      })
      .catch((error) => {
        if (cancelled) return;
        setApiMessage(error instanceof Error ? error.message : 'Failed to load project config.');
        setProfile(null);
        setConfig(null);
        setConfigPath('');
      });

    return () => {
      cancelled = true;
    };
  }, [source, selectedProjectId]);

  useEffect(() => {
    if (source === 'demo' || !selectedProjectId || !selectedSnapshotId) {
      setLayers([]);
      setSelectedLayer('');
      setAudit(null);
      return;
    }

    const client = source === 'mock' ? mockApi : api;
    let cancelled = false;

    client
      .getLayers(selectedProjectId, selectedSnapshotId)
      .then((data) => {
        if (cancelled) return;
        setApiMessage('');
        setLayers(data.layers);
        setSelectedLayer(data.layers[0] ?? '');
      })
      .catch((error) => {
        if (cancelled) return;
        setApiMessage(error instanceof Error ? error.message : 'Failed to load layers.');
      });

    return () => {
      cancelled = true;
    };
  }, [source, selectedProjectId, selectedSnapshotId]);

  useEffect(() => {
    if (source === 'demo') return;
    if (!selectedProjectId || !selectedSnapshotId || !selectedLayer) return;

    const client = source === 'mock' ? mockApi : api;
    let cancelled = false;

    client
      .getDiagram(selectedProjectId, selectedSnapshotId, selectedLayer)
      .then((data) => {
        if (cancelled) return;
        setApiMessage('');
        setCode(data.mmd);
      })
      .catch((error) => {
        if (cancelled) return;
        setApiMessage(error instanceof Error ? error.message : 'Failed to load diagram.');
      });

    return () => {
      cancelled = true;
    };
  }, [source, selectedProjectId, selectedSnapshotId, selectedLayer]);

  useEffect(() => {
    if (source === 'demo') return;
    if (!selectedProjectId || !selectedSnapshotId) return;

    const client = source === 'mock' ? mockApi : api;
    let cancelled = false;

    client
      .getAudit(selectedProjectId, selectedSnapshotId)
      .then((data) => {
        if (cancelled) return;
        setAudit(data);
        setSelectedNodeId(null);
        setSelectedFeatureKey(null);
        setSelectedEdge(null);
      })
      .catch((error) => {
        if (cancelled) return;
        setApiMessage(error instanceof Error ? error.message : 'Failed to load audit.');
        setAudit(null);
      });

    return () => {
      cancelled = true;
    };
  }, [source, selectedProjectId, selectedSnapshotId]);

  const handleReloadConfig = async () => {
    if (!selectedProjectId || source === 'demo') return;
    const client = source === 'mock' ? mockApi : api;
    setConfigBusy(true);
    try {
      const [profileData, configData] = await Promise.all([
        client.getProjectProfile(selectedProjectId),
        client.getProjectConfig(selectedProjectId),
      ]);
      setProfile(profileData);
      setConfig(configData.config);
      setConfigPath(configData.path);
      setApiMessage('Config reloaded.');
    } catch (error) {
      setApiMessage(error instanceof Error ? error.message : 'Failed to reload config.');
    } finally {
      setConfigBusy(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!selectedProjectId || !profile || !config || source === 'demo') return;
    const client = source === 'mock' ? mockApi : api;
    setConfigBusy(true);
    try {
      const updatedProfile = await client.updateProjectProfile(selectedProjectId, profile);
      const updatedConfig = await client.updateProjectConfig(selectedProjectId, config);
      setProfile(updatedProfile);
      setConfig(updatedConfig.config);
      setConfigPath(updatedConfig.path);
      setApiMessage('Config saved.');
    } catch (error) {
      setApiMessage(error instanceof Error ? error.message : 'Failed to save config.');
    } finally {
      setConfigBusy(false);
    }
  };

  const handleScan = async () => {
    if (!selectedProjectId || !config || source === 'demo') return;
    const client = source === 'mock' ? mockApi : api;
    setConfigBusy(true);
    try {
      if (profile) {
        await client.updateProjectProfile(selectedProjectId, profile);
      }
      await client.updateProjectConfig(selectedProjectId, config);
      await client.startScan(selectedProjectId, 'scan from ui');
      const snapshotsData = await client.getSnapshots(selectedProjectId);
      setSnapshots(snapshotsData);
      setSelectedSnapshotId(snapshotsData[0]?.snapshotId ?? '');
      setApiMessage('Scan complete.');
    } catch (error) {
      setApiMessage(error instanceof Error ? error.message : 'Scan failed.');
    } finally {
      setConfigBusy(false);
    }
  };

  const handleExport = () => {
    const svg = document.querySelector('#mermaid-preview svg') as SVGSVGElement | null;
    if (!svg) {
      setRenderError('No diagram available to export.');
      return;
    }

    const themeConfig = getThemeConfig(themeKey);
    const background = getBackgroundById(backgroundKey);
    const backgroundColor =
      (background.id === 'default' ? themeConfig.bgStyle?.backgroundColor : background.bgStyle?.backgroundColor) ||
      themeConfig.mermaidConfig.themeVariables?.background ||
      '#ffffff';

    exportSvg(svg, {
      filename: `archradar-${Date.now()}.svg`,
      backgroundColor,
    });
  };

  return (
    <div className="min-h-screen bg-[#f7f3ea] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-6 py-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              ArchRadar MVP
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">
              Mermaid Preview Console
            </h1>
          </div>
          <button
            className="rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            onClick={handleExport}
          >
            Export SVG
          </button>
        </header>

        <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm">
          <ThemePicker
            themeKey={themeKey}
            backgroundKey={backgroundKey}
            fontKey={fontKey}
            onThemeChange={setThemeKey}
            onBackgroundChange={setBackgroundKey}
            onFontChange={setFontKey}
          />
        </div>

        <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-[250px_minmax(0,1fr)_260px]">
          <aside className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
            <SnapshotPanel
              source={source}
              onSourceChange={setSource}
              projects={projects}
              snapshots={snapshots}
              layers={layers}
              selectedProjectId={selectedProjectId}
              selectedSnapshotId={selectedSnapshotId}
              selectedLayer={selectedLayer}
              onProjectChange={setSelectedProjectId}
              onSnapshotChange={setSelectedSnapshotId}
              onLayerChange={setSelectedLayer}
              apiAvailable={apiAvailable}
              apiVersion={apiVersion}
            />

            <div className="mt-6">
              <ConfigPanel
                profile={profile}
                config={config}
                configPath={configPath}
                disabled={source === 'demo' || (source === 'local' && !apiAvailable)}
                busy={configBusy}
                onProfileChange={(next) => setProfile(next)}
                onConfigChange={(next) => setConfig(next)}
                onSave={handleSaveConfig}
                onReload={handleReloadConfig}
                onScan={handleScan}
              />
            </div>

            {source === 'demo' && (
              <div className="mt-6 space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Demo Mermaid (editable)
                </label>
                <textarea
                  className="h-40 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
                  value={localCode}
                  onChange={(event) => {
                    const value = event.target.value;
                    setLocalCode(value);
                    setCode(value);
                  }}
                />
              </div>
            )}
          </aside>

          <main className="min-h-[360px]">
            <MermaidPreview
              code={code}
              themeKey={themeKey}
              backgroundKey={backgroundKey}
              fontKey={fontKey}
              renderOptions={renderOptions}
              onError={setRenderError}
              onNodeEvent={(event) => {
                if (event.kind === 'node') {
                  const mermaidId = event.mermaidId;
                  if (!mermaidId) return;

                  if (selectedLayer === 'L0') {
                    const featureKey = featureIndex.mermaidIdToFeature.get(mermaidId) ?? null;
                    setSelectedFeatureKey(featureKey);
                    setSelectedNodeId(null);
                    setSelectedEdge(null);
                    if (event.action === 'doubleClick' && featureKey) {
                      const nextLayer = `L1:${featureKey}`;
                      if (layers.includes(nextLayer)) {
                        setSelectedLayer(nextLayer);
                      }
                    }
                    return;
                  }

                  const node = nodeIndex.mermaidIdToNode.get(mermaidId);
                  if (!node) return;
                  setSelectedNodeId(node.id);
                  setSelectedFeatureKey(null);
                  setSelectedEdge(null);

                  if (event.action === 'doubleClick') {
                    const targetLayer = l2LayerMap.get(node.id);
                    if (targetLayer && layers.includes(targetLayer)) {
                      setSelectedLayer(targetLayer);
                    }
                  }
                }

                if (event.kind === 'edge') {
                  const fromMermaidId = event.fromMermaidId ?? null;
                  const toMermaidId = event.toMermaidId ?? null;
                  const fromNodeId =
                    fromMermaidId ? nodeIndex.mermaidIdToNode.get(fromMermaidId)?.id ?? null : null;
                  const toNodeId =
                    toMermaidId ? nodeIndex.mermaidIdToNode.get(toMermaidId)?.id ?? null : null;
                  const edge = findEdge(audit, fromNodeId, toNodeId, event.label);
                  if (!edge) return;
                  setSelectedEdge(edge);
                  setSelectedNodeId(null);
                  setSelectedFeatureKey(null);
                }
              }}
            />
          </main>

          <aside className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Inspector
            </h2>
            <div className="mt-3 space-y-3 text-xs text-slate-700">
              {selectedFeatureKey && (
                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="text-xs font-semibold text-slate-900">Feature</div>
                  <div className="text-sm font-semibold">{selectedFeatureKey}</div>
                  <div className="flex justify-between text-[11px] text-slate-600">
                    <span>Nodes</span>
                    <span>{featureIndex.statsByFeature.get(selectedFeatureKey)?.nodeCount ?? 0}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-600">
                    <span>Edges</span>
                    <span>{featureIndex.statsByFeature.get(selectedFeatureKey)?.edgeCount ?? 0}</span>
                  </div>
                </div>
              )}

              {selectedNode && (
                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="text-xs font-semibold text-slate-900">Node</div>
                  <div className="text-sm font-semibold">{selectedNode.nameDisplay}</div>
                  <div className="text-[11px] text-slate-600">Kind: {selectedNode.kind}</div>
                  <div className="text-[11px] text-slate-600">Feature: {selectedNode.featureKey}</div>
                  {selectedNode.source && (
                    <div className="text-[11px] text-slate-600">
                      {selectedNode.source.file}:{selectedNode.source.startLine}:{selectedNode.source.startCol}
                    </div>
                  )}
                </div>
              )}

              {selectedEdge && (
                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="text-xs font-semibold text-slate-900">Edge</div>
                  <div className="text-[11px] text-slate-600">Kind: {selectedEdge.edgeKind}</div>
                  <div className="text-[11px] text-slate-600">
                    From: {selectedEdge.fromId}
                  </div>
                  <div className="text-[11px] text-slate-600">
                    To: {selectedEdge.toId}
                  </div>
                  <div className="text-[11px] text-slate-600">
                    CallSites: {selectedEdge.callSites.length}
                  </div>
                  {selectedEdge.callSites.length > 0 && (
                    <div className="space-y-2">
                      {selectedEdge.callSites.map((site, index) => (
                        <button
                          key={`${site.file}-${site.line}-${site.col}-${index}`}
                          className="w-full rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-left text-[11px] text-amber-800 hover:bg-amber-100"
                          onClick={() => {
                            const client = source === 'mock' ? mockApi : api;
                            client
                              .openInEditor(site.file, site.line, site.col)
                              .then((result) => {
                                if (!result.ok) {
                                  setApiMessage(result.message ?? 'Failed to open file.');
                                }
                              })
                              .catch(() => setApiMessage('Failed to open file.'));
                          }}
                        >
                          {site.file}:{site.line}:{site.col}
                          {site.snippet ? ` — ${site.snippet}` : ''}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selectedNodeEdges.length > 0 && !selectedEdge && (
                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="text-xs font-semibold text-slate-900">Related Edges</div>
                  {selectedNodeEdges.map((edge, index) => (
                    <button
                      key={`${edge.fromId}-${edge.toId}-${edge.edgeKind}-${index}`}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-left text-[11px] text-slate-700 hover:bg-slate-100"
                      onClick={() => setSelectedEdge(edge)}
                    >
                      {edge.edgeKind}: {edge.fromId} → {edge.toId}
                    </button>
                  ))}
                </div>
              )}

              {!selectedFeatureKey && !selectedNode && !selectedEdge && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
                  Select a node or edge to inspect details.
                </div>
              )}

              <h2 className="pt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status
              </h2>
              {apiMessage ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  {apiMessage}
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  API status messages will show here.
                </div>
              )}
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
                API base: {JSON.stringify(import.meta.env.VITE_API_BASE || '(empty)')}
              </div>

              {renderError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {renderError}
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  Mermaid errors will show here.
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default App;
