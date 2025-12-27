import { useEffect, useMemo, useRef, useState } from 'react';
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
import { featureId } from '../domain/mermaidIds';
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

type NavState = {
  projectId: string;
  snapshotId: string;
  layer: string;
  selectedNodeId: string | null;
  selectedFeatureKey: string | null;
  selectedEdgeKey: string | null;
};

const buildEdgeKey = (edge: AuditEdge) => `${edge.fromId}::${edge.toId}::${edge.edgeKind}`;

const parseEdgeKey = (key: string) => {
  const parts = key.split('::');
  if (parts.length < 3) return null;
  const [fromId, toId, ...rest] = parts;
  return { fromId, toId, edgeKind: rest.join('::') };
};

const App = () => {
  const [themeKey, setThemeKey] = useState<ThemeType>('spotless');
  const [backgroundKey, setBackgroundKey] = useState('default');
  const [fontKey, setFontKey] = useState('default');
  const [source, setSource] = useState<DataSource>('demo');

  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

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
  const [selectedEdgeKey, setSelectedEdgeKey] = useState<string | null>(null);
  const [history, setHistory] = useState<{ stack: NavState[]; index: number }>({
    stack: [],
    index: -1,
  });
  const [layerParents, setLayerParents] = useState<Record<string, string>>({});
  const desiredSnapshotIdRef = useRef('');
  const desiredLayerRef = useRef('');

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
  const selectedEdge = useMemo(() => {
    if (!selectedEdgeKey) return null;
    const parsed = parseEdgeKey(selectedEdgeKey);
    if (!parsed) return null;
    return findEdge(audit, parsed.fromId, parsed.toId, parsed.edgeKind);
  }, [audit, selectedEdgeKey]);

  const selectedMermaidNodes = useMemo(() => {
    const ids: string[] = [];
    if (selectedFeatureKey) {
      ids.push(featureId(selectedFeatureKey));
    }
    if (selectedNodeId) {
      const mermaidId = nodeIndex.nodeIdToMermaidId.get(selectedNodeId);
      if (mermaidId) ids.push(mermaidId);
    }
    return ids;
  }, [selectedFeatureKey, selectedNodeId, nodeIndex]);

  const selectedMermaidEdge = useMemo(() => {
    if (!selectedEdge) return null;
    const fromMermaidId = nodeIndex.nodeIdToMermaidId.get(selectedEdge.fromId);
    const toMermaidId = nodeIndex.nodeIdToMermaidId.get(selectedEdge.toId);
    if (!fromMermaidId || !toMermaidId) return null;
    return { fromMermaidId, toMermaidId };
  }, [selectedEdge, nodeIndex]);

  const buildNavState = (overrides: Partial<NavState> = {}): NavState => ({
    projectId: overrides.projectId ?? selectedProjectId,
    snapshotId: overrides.snapshotId ?? selectedSnapshotId,
    layer: overrides.layer ?? selectedLayer,
    selectedNodeId: overrides.selectedNodeId ?? selectedNodeId,
    selectedFeatureKey: overrides.selectedFeatureKey ?? selectedFeatureKey,
    selectedEdgeKey: overrides.selectedEdgeKey ?? selectedEdgeKey,
  });

  const isSameNav = (left: NavState, right: NavState) =>
    left.projectId === right.projectId &&
    left.snapshotId === right.snapshotId &&
    left.layer === right.layer &&
    left.selectedNodeId === right.selectedNodeId &&
    left.selectedFeatureKey === right.selectedFeatureKey &&
    left.selectedEdgeKey === right.selectedEdgeKey;

  const recordHistory = (nextState: NavState) => {
    setHistory((prev) => {
      const trimmed = prev.stack.slice(0, prev.index + 1);
      const last = trimmed[trimmed.length - 1];
      if (last && isSameNav(last, nextState)) {
        return prev;
      }
      const nextStack = [...trimmed, nextState];
      return { stack: nextStack, index: nextStack.length - 1 };
    });
  };

  const clearHistory = () => {
    setHistory({ stack: [], index: -1 });
  };

  useEffect(() => {
    const base = buildNavState();
    const historyBase = history.stack[0];
    const shouldSeed = history.stack.length === 0;
    const shouldRefresh =
      history.stack.length === 1 &&
      history.index === 0 &&
      historyBase &&
      historyBase.projectId === base.projectId &&
      historyBase.snapshotId === base.snapshotId &&
      !historyBase.layer &&
      !!base.layer;
    if (!shouldSeed && !shouldRefresh) return;
    if (source === 'demo' || base.projectId || base.snapshotId || base.layer) {
      setHistory({ stack: [base], index: 0 });
    }
  }, [
    history.stack.length,
    history.index,
    history.stack,
    source,
    selectedProjectId,
    selectedSnapshotId,
    selectedLayer,
  ]);

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
    const resetWorkspace = () => {
      setProjects([]);
      setSnapshots([]);
      setLayers([]);
      setSelectedProjectId('');
      setSelectedSnapshotId('');
      setSelectedLayer('');
      setApiMessage('');
      desiredSnapshotIdRef.current = '';
      desiredLayerRef.current = '';
      setProfile(null);
      setConfig(null);
      setConfigPath('');
      setConfigBusy(false);
      setAudit(null);
      setSelectedNodeId(null);
      setSelectedFeatureKey(null);
      setSelectedEdgeKey(null);
      setLayerParents({});
      clearHistory();
    };

    if (source === 'demo') {
      resetWorkspace();
      setCode(localCode);
      return;
    }

    if (source === 'local' && !apiAvailable) {
      resetWorkspace();
      setApiMessage('Backend not started (using demo mode).');
      setCode(localCode);
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
        desiredSnapshotIdRef.current = '';
        desiredLayerRef.current = '';
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
      desiredSnapshotIdRef.current = '';
      setLayers([]);
      setSelectedLayer('');
      desiredLayerRef.current = '';
      setAudit(null);
      setCode(source === 'demo' ? localCode : '');
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
        const desired = desiredSnapshotIdRef.current;
        const resolved = data.find((snapshot) => snapshot.snapshotId === desired)?.snapshotId;
        const nextSnapshot = resolved ?? data[0]?.snapshotId ?? '';
        desiredSnapshotIdRef.current = nextSnapshot;
        setSelectedSnapshotId(nextSnapshot);
      })
      .catch((error) => {
        if (cancelled) return;
        setApiMessage(error instanceof Error ? error.message : 'Failed to load snapshots.');
      });

    return () => {
      cancelled = true;
    };
  }, [source, selectedProjectId, localCode]);

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
      desiredLayerRef.current = '';
      setAudit(null);
      setCode(source === 'demo' ? localCode : '');
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
        const desired = desiredLayerRef.current;
        const resolved = data.layers.includes(desired) ? desired : data.layers[0] ?? '';
        desiredLayerRef.current = resolved;
        setSelectedLayer(resolved);
      })
      .catch((error) => {
        if (cancelled) return;
        setApiMessage(error instanceof Error ? error.message : 'Failed to load layers.');
      });

    return () => {
      cancelled = true;
    };
  }, [source, selectedProjectId, selectedSnapshotId, localCode]);

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
        setSelectedEdgeKey(null);
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

  useEffect(() => {
    if (source === 'demo') return;
    if (!selectedProjectId || !selectedSnapshotId || !selectedLayer) {
      setCode('');
      return;
    }

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
      setApiMessage('Scanning...');
      if (profile) {
        await client.updateProjectProfile(selectedProjectId, profile);
      }
      await client.updateProjectConfig(selectedProjectId, config);
      await client.startScan(selectedProjectId, 'scan from ui');
      const snapshotsData = await client.getSnapshots(selectedProjectId);
      setSnapshots(snapshotsData);
      const nextSnapshot = snapshotsData[0]?.snapshotId ?? '';
      desiredSnapshotIdRef.current = nextSnapshot;
      setSelectedSnapshotId(nextSnapshot);
      setLayerParents({});
      clearHistory();
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

  const handleProjectChange = (value: string) => {
    setSelectedProjectId(value);
    setSelectedSnapshotId('');
    setSelectedLayer('');
    desiredSnapshotIdRef.current = '';
    desiredLayerRef.current = '';
    setSelectedNodeId(null);
    setSelectedFeatureKey(null);
    setSelectedEdgeKey(null);
    setLayerParents({});
    clearHistory();
  };

  const handleSnapshotChange = (value: string) => {
    setSelectedSnapshotId(value);
    desiredSnapshotIdRef.current = value;
    setSelectedLayer('');
    desiredLayerRef.current = '';
    setSelectedNodeId(null);
    setSelectedFeatureKey(null);
    setSelectedEdgeKey(null);
    setLayerParents({});
    clearHistory();
  };

  const updateLayer = (value: string, options: { record?: boolean; parentLayer?: string } = {}) => {
    setSelectedLayer(value);
    desiredLayerRef.current = value;
    setSelectedNodeId(null);
    setSelectedFeatureKey(null);
    setSelectedEdgeKey(null);
    if (options.parentLayer) {
      setLayerParents((prev) => ({ ...prev, [value]: options.parentLayer }));
    }
    if (options.record) {
      recordHistory(
        buildNavState({
          layer: value,
          selectedNodeId: null,
          selectedFeatureKey: null,
          selectedEdgeKey: null,
        }),
      );
    }
  };

  const handleLayerChange = (value: string) => {
    updateLayer(value, { record: true });
  };

  const selectFeature = (featureKey: string) => {
    setSelectedFeatureKey(featureKey);
    setSelectedNodeId(null);
    setSelectedEdgeKey(null);
    recordHistory(
      buildNavState({
        selectedFeatureKey: featureKey,
        selectedNodeId: null,
        selectedEdgeKey: null,
      }),
    );
  };

  const selectNode = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setSelectedFeatureKey(null);
    setSelectedEdgeKey(null);
    recordHistory(
      buildNavState({
        selectedNodeId: nodeId,
        selectedFeatureKey: null,
        selectedEdgeKey: null,
      }),
    );
  };

  const selectEdge = (edgeKey: string) => {
    setSelectedEdgeKey(edgeKey);
    setSelectedNodeId(null);
    setSelectedFeatureKey(null);
    recordHistory(
      buildNavState({
        selectedEdgeKey: edgeKey,
        selectedNodeId: null,
        selectedFeatureKey: null,
      }),
    );
  };

  const clearSelection = (record = true) => {
    if (!selectedNodeId && !selectedFeatureKey && !selectedEdgeKey) return;
    setSelectedNodeId(null);
    setSelectedFeatureKey(null);
    setSelectedEdgeKey(null);
    if (record) {
      recordHistory(
        buildNavState({
          selectedNodeId: null,
          selectedFeatureKey: null,
          selectedEdgeKey: null,
        }),
      );
    }
  };

  const canGoBack = history.index > 0;
  const canGoForward = history.index >= 0 && history.index < history.stack.length - 1;

  const applyNavState = (state: NavState) => {
    setSelectedProjectId(state.projectId);
    setSelectedSnapshotId(state.snapshotId);
    setSelectedLayer(state.layer);
    desiredSnapshotIdRef.current = state.snapshotId;
    desiredLayerRef.current = state.layer;
    setSelectedNodeId(state.selectedNodeId);
    setSelectedFeatureKey(state.selectedFeatureKey);
    setSelectedEdgeKey(state.selectedEdgeKey);
  };

  const handleGoBack = () => {
    if (!canGoBack) return;
    const nextIndex = history.index - 1;
    const target = history.stack[nextIndex];
    if (!target) return;
    applyNavState(target);
    setHistory((prev) => ({ ...prev, index: nextIndex }));
  };

  const handleGoForward = () => {
    if (!canGoForward) return;
    const nextIndex = history.index + 1;
    const target = history.stack[nextIndex];
    if (!target) return;
    applyNavState(target);
    setHistory((prev) => ({ ...prev, index: nextIndex }));
  };

  const handleGoUp = () => {
    if (selectedNodeId || selectedFeatureKey || selectedEdgeKey) {
      clearSelection(true);
      return;
    }
    if (!selectedLayer || selectedLayer === 'L0') return;
    const parentLayer =
      layerParents[selectedLayer] ?? (selectedLayer.startsWith('L1:') ? 'L0' : 'L0');
    updateLayer(parentLayer, { record: true });
  };

  const handleGoHome = () => {
    const target = layers.includes('L0') ? 'L0' : layers[0] ?? '';
    if (!target) return;
    updateLayer(target, { record: true });
  };

  const layerChain = useMemo(() => {
    if (!selectedLayer) return [];
    const chain: string[] = [];
    const seen = new Set<string>();
    let current = selectedLayer;
    while (current && !seen.has(current)) {
      seen.add(current);
      chain.unshift(current);
      if (current === 'L0') break;
      const parent = layerParents[current] ?? (current.startsWith('L1:') ? 'L0' : '');
      current = parent;
    }
    if (chain[0] !== 'L0') {
      chain.unshift('L0');
    }
    return chain;
  }, [selectedLayer, layerParents]);

  const selectedProjectName = projects.find((project) => project.projectId === selectedProjectId)?.name;
  const selectedSnapshotLabel = snapshots.find((snap) => snap.snapshotId === selectedSnapshotId)?.label ?? selectedSnapshotId;

  const emptyState = (
    <div className="space-y-3">
      <div className="text-base font-semibold text-slate-700">Canvas ready</div>
      <p className="text-xs text-slate-500">
        {source === 'demo'
          ? 'Edit the demo Mermaid on the left or switch to a project to load data.'
          : 'Pick a snapshot or run a scan to generate layers.'}
      </p>
      {source !== 'demo' && !selectedSnapshotId && (
        <div className="text-[11px] text-slate-400">
          Use "Start Scan" in the config panel to create a snapshot.
        </div>
      )}
    </div>
  );

  const statusItems = useMemo(() => {
    const items: { tone: 'ok' | 'warn' | 'error'; message: string }[] = [];
    if (source !== 'demo') {
      items.push({
        tone: apiAvailable ? 'ok' : 'warn',
        message: apiAvailable
          ? `API healthy${apiVersion ? ` (${apiVersion})` : ''}`
          : 'API offline. Demo mode recommended.',
      });
    }
    if (apiMessage) {
      items.push({ tone: 'warn', message: apiMessage });
    }
    if (renderError) {
      items.push({ tone: 'error', message: renderError });
    }
    return items;
  }, [apiAvailable, apiMessage, apiVersion, renderError, source]);

  return (
    <div className="ar-workbench min-h-screen text-slate-900">
      <div className="flex min-h-screen flex-col">
        <header className="flex flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-200 text-lg font-semibold text-amber-900 shadow-sm">
              AR
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
                ArchRadar Workbench
              </p>
              <h1 className="text-2xl font-semibold text-slate-900">Architecture Radar</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="rounded-full border border-black/10 bg-white/70 px-2 py-0.5">
                  {source === 'demo' ? 'Demo' : source === 'mock' ? 'Mock API' : 'Local API'}
                </span>
                <span className="truncate">
                  {selectedProjectName ? `Project: ${selectedProjectName}` : 'No project selected'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="ar-button" onClick={handleExport}>
              Export SVG
            </button>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 overflow-hidden px-6 pb-6 lg:flex-row">
          <aside
            className={`ar-panel flex h-full w-full flex-col transition-all lg:w-[320px] ${
              leftCollapsed ? 'lg:w-[72px]' : ''
            }`}
          >
            <div className="flex items-center justify-between px-4 pt-4">
              <div>
                <p className="ar-panel-title">Workspace</p>
                <p className="text-xs text-slate-500">Data, config, and scan controls</p>
              </div>
              <button
                className="ar-icon-button"
                onClick={() => setLeftCollapsed((value) => !value)}
                type="button"
                aria-label={leftCollapsed ? 'Expand left sidebar' : 'Collapse left sidebar'}
              >
                {leftCollapsed ? '>' : '<'}
              </button>
            </div>
            <div
              className={`flex-1 overflow-y-auto px-4 pb-4 pt-4 transition-all ${
                leftCollapsed ? 'lg:pointer-events-none lg:opacity-0 lg:translate-x-2' : ''
              }`}
            >
              <div className="space-y-4">
                <div className="ar-card">
                  <SnapshotPanel
                    source={source}
                    onSourceChange={(value) => {
                      setSource(value);
                      clearHistory();
                      setLayerParents({});
                    }}
                    projects={projects}
                    snapshots={snapshots}
                    layers={layers}
                    selectedProjectId={selectedProjectId}
                    selectedSnapshotId={selectedSnapshotId}
                    selectedLayer={selectedLayer}
                    onProjectChange={handleProjectChange}
                    onSnapshotChange={handleSnapshotChange}
                    onLayerChange={handleLayerChange}
                    apiAvailable={apiAvailable}
                    apiVersion={apiVersion}
                  />
                </div>

                <div className="ar-card">
                  <h3 className="ar-panel-title">Appearance</h3>
                  <p className="mb-3 text-xs text-slate-500">
                    Tune the canvas style without touching diagram data.
                  </p>
                  <ThemePicker
                    themeKey={themeKey}
                    backgroundKey={backgroundKey}
                    fontKey={fontKey}
                    onThemeChange={setThemeKey}
                    onBackgroundChange={setBackgroundKey}
                    onFontChange={setFontKey}
                  />
                </div>

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

                {source === 'demo' && (
                  <div className="ar-card">
                    <label className="ar-panel-title">Demo Mermaid (editable)</label>
                    <textarea
                      className="ar-textarea mt-2 h-40"
                      value={localCode}
                      onChange={(event) => {
                        const value = event.target.value;
                        setLocalCode(value);
                        setCode(value);
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </aside>

          <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-4">
            <div className="ar-panel flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="flex items-center gap-2">
                <button
                  className="ar-chip-button"
                  onClick={handleGoBack}
                  disabled={!canGoBack}
                  type="button"
                >
                  Back
                </button>
                <button
                  className="ar-chip-button"
                  onClick={handleGoForward}
                  disabled={!canGoForward}
                  type="button"
                >
                  Forward
                </button>
                <div className="h-6 w-px bg-black/10" />
                <button
                  className="ar-chip-button"
                  onClick={handleGoUp}
                  disabled={!selectedLayer || selectedLayer === 'L0'}
                  type="button"
                >
                  Up
                </button>
                <button
                  className="ar-chip-button"
                  onClick={handleGoHome}
                  disabled={!layers.includes('L0')}
                  type="button"
                >
                  Home (L0)
                </button>
              </div>

              <div className="flex flex-1 flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className="rounded-full border border-black/10 bg-white/70 px-2 py-1">
                  Project: {selectedProjectName ?? 'None'}
                </span>
                <span className="rounded-full border border-black/10 bg-white/70 px-2 py-1">
                  Snapshot: {selectedSnapshotLabel || 'None'}
                </span>
                {layerChain.map((layer) => (
                  <button
                    key={layer}
                    className="ar-chip-button"
                    onClick={() => updateLayer(layer, { record: true })}
                    type="button"
                  >
                    {layer}
                  </button>
                ))}
              </div>

              {(selectedNodeId || selectedFeatureKey || selectedEdgeKey) && (
                <button className="ar-chip-button" onClick={() => clearSelection(true)} type="button">
                  Clear Selection
                </button>
              )}
            </div>

            <div className="min-h-[360px] flex-1">
              <MermaidPreview
                code={code}
                themeKey={themeKey}
                backgroundKey={backgroundKey}
                fontKey={fontKey}
                renderOptions={renderOptions}
                selectedNodeIds={selectedMermaidNodes}
                selectedEdge={selectedMermaidEdge}
                emptyState={emptyState}
                onError={setRenderError}
                onCanvasClick={() => clearSelection(true)}
                onNodeEvent={(event) => {
                  if (event.kind === 'node') {
                    const mermaidId = event.mermaidId;
                    if (!mermaidId) return;

                    if (selectedLayer === 'L0') {
                      const featureKey = featureIndex.mermaidIdToFeature.get(mermaidId);
                      if (featureKey) {
                        selectFeature(featureKey);
                      }
                      if (event.action === 'doubleClick' && featureKey) {
                        const nextLayer = `L1:${featureKey}`;
                        if (layers.includes(nextLayer)) {
                          updateLayer(nextLayer, { record: true, parentLayer: 'L0' });
                        }
                      }
                      return;
                    }

                    const node = nodeIndex.mermaidIdToNode.get(mermaidId);
                    if (!node) return;
                    selectNode(node.id);

                    if (event.action === 'doubleClick') {
                      const targetLayer = l2LayerMap.get(node.id);
                      if (targetLayer && layers.includes(targetLayer)) {
                        updateLayer(targetLayer, { record: true, parentLayer: selectedLayer || 'L0' });
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
                    selectEdge(buildEdgeKey(edge));
                  }
                }}
              />
            </div>
          </main>

          <aside
            className={`ar-panel flex h-full w-full flex-col transition-all lg:w-[300px] ${
              rightCollapsed ? 'lg:w-[72px]' : ''
            }`}
          >
            <div className="flex items-center justify-between px-4 pt-4">
              <div>
                <p className="ar-panel-title">Inspector</p>
                <p className="text-xs text-slate-500">Selection details and context</p>
              </div>
              <button
                className="ar-icon-button"
                onClick={() => setRightCollapsed((value) => !value)}
                type="button"
                aria-label={rightCollapsed ? 'Expand right sidebar' : 'Collapse right sidebar'}
              >
                {rightCollapsed ? '<' : '>'}
              </button>
            </div>
            <div
              className={`flex-1 overflow-y-auto px-4 pb-4 pt-4 transition-all ${
                rightCollapsed ? 'lg:pointer-events-none lg:opacity-0 lg:-translate-x-2' : ''
              }`}
            >
              <div className="space-y-4">
                {selectedFeatureKey && (
                  <div className="ar-card">
                    <div className="ar-panel-title">Feature</div>
                    <div className="mt-2 truncate text-sm font-semibold text-slate-800" title={selectedFeatureKey}>
                      {selectedFeatureKey}
                    </div>
                    <div className="mt-3 flex justify-between text-[11px] text-slate-600">
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
                  <div className="ar-card">
                    <div className="ar-panel-title">Node</div>
                    <div
                      className="mt-2 truncate text-sm font-semibold text-slate-800"
                      title={selectedNode.nameDisplay}
                    >
                      {selectedNode.nameDisplay}
                    </div>
                    <div className="mt-2 text-[11px] text-slate-600">
                      Kind: {selectedNode.kind}
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Feature: {selectedNode.featureKey}
                    </div>
                    {selectedNode.source && (
                      <div
                        className="mt-2 truncate text-[11px] text-slate-500"
                        title={`${selectedNode.source.file}:${selectedNode.source.startLine}:${selectedNode.source.startCol}`}
                      >
                        {selectedNode.source.file}:{selectedNode.source.startLine}:{selectedNode.source.startCol}
                      </div>
                    )}
                  </div>
                )}

                {selectedEdge && (
                  <div className="ar-card">
                    <div className="ar-panel-title">Edge</div>
                    <div className="mt-2 text-[11px] text-slate-600">
                      Kind: {selectedEdge.edgeKind}
                    </div>
                    <div className="truncate text-[11px] text-slate-600" title={selectedEdge.fromId}>
                      From: {selectedEdge.fromId}
                    </div>
                    <div className="truncate text-[11px] text-slate-600" title={selectedEdge.toId}>
                      To: {selectedEdge.toId}
                    </div>
                    <div className="text-[11px] text-slate-600">
                      CallSites: {selectedEdge.callSites.length}
                    </div>
                    {selectedEdge.callSites.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {selectedEdge.callSites.map((site, index) => (
                          <button
                            key={`${site.file}-${site.line}-${site.col}-${index}`}
                            className="ar-mini-button w-full text-left"
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
                            <span className="block truncate" title={`${site.file}:${site.line}:${site.col}`}>
                              {site.file}:{site.line}:{site.col}
                            </span>
                            {site.snippet ? (
                              <span className="mt-1 block truncate text-[10px] text-slate-500" title={site.snippet}>
                                {site.snippet}
                              </span>
                            ) : null}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {selectedNodeEdges.length > 0 && !selectedEdge && (
                  <div className="ar-card">
                    <div className="ar-panel-title">Related Edges</div>
                    <div className="mt-2 space-y-2">
                      {selectedNodeEdges.map((edge, index) => (
                        <button
                          key={`${edge.fromId}-${edge.toId}-${edge.edgeKind}-${index}`}
                          className="ar-mini-button w-full text-left"
                          onClick={() => selectEdge(buildEdgeKey(edge))}
                        >
                          <span className="block truncate" title={`${edge.edgeKind}: ${edge.fromId} -> ${edge.toId}`}>
                            {edge.edgeKind}: {edge.fromId} {'->'} {edge.toId}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {!selectedFeatureKey && !selectedNode && !selectedEdge && (
                  <div className="ar-card-muted">
                    Select a node or edge to inspect details.
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {statusItems.length > 0 && (
        <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex w-[320px] flex-col gap-2">
          {statusItems.map((item, index) => (
            <div
              key={`${item.tone}-${index}`}
              className={`pointer-events-auto rounded-2xl border px-4 py-3 text-xs shadow-sm ${
                item.tone === 'ok'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : item.tone === 'error'
                    ? 'border-rose-200 bg-rose-50 text-rose-700'
                    : 'border-amber-200 bg-amber-50 text-amber-900'
              }`}
            >
              {item.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default App;
