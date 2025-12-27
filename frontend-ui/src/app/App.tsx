import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import MermaidPreview from '../components/MermaidPreview';
import { exportSvg } from '../components/MermaidPreview';
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

type ScanPhase = 'idle' | 'preparing' | 'scanning' | 'building' | 'saving' | 'done' | 'failed';

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

  const [activeTab, setActiveTab] = useState<'config' | 'mermaid'>('config');
  const [scanPhase, setScanPhase] = useState<ScanPhase>('idle');
  const [configValidation, setConfigValidation] = useState({ hasErrors: false, hasWarnings: false });
  const [hoveredMermaid, setHoveredMermaid] = useState<{ ids: string[]; label?: string } | null>(null);
  const [leftPanelWidth, setLeftPanelWidth] = useState(320);

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
  const resizeStateRef = useRef({ active: false, startX: 0, startWidth: 320 });

  const renderOptions: MermaidRenderOptions = useMemo(
    () => ({
      securityLevel: 'loose',
      maxTextSize: 5000,
      suppressErrors: true,
    }),
    [],
  );
  const leftPanelMin = 240;
  const leftPanelMax = 520;

  useEffect(() => {
    setRenderError('');
  }, [code]);

  const nodeIndex = useMemo(() => buildNodeIndex(audit), [audit]);
  const featureIndex = useMemo(() => buildFeatureIndex(audit), [audit]);
  const l2LayerMap = useMemo(() => buildL2LayerMap(audit), [audit]);
  const selectedNode = useMemo(() => getNodeById(audit, selectedNodeId), [audit, selectedNodeId]);
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
      setScanPhase('idle');
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
    if (!selectedProjectId || !config || source === 'demo' || configValidation.hasErrors) return;
    const client = source === 'mock' ? mockApi : api;
    setConfigBusy(true);
    setScanPhase('preparing');
    try {
      setApiMessage('Preparing scan...');
      if (profile) {
        await client.updateProjectProfile(selectedProjectId, profile);
      }
      await client.updateProjectConfig(selectedProjectId, config);
      setScanPhase('scanning');
      setApiMessage('Scanning...');
      await client.startScan(selectedProjectId, 'scan from ui');
      setScanPhase('building');
      setApiMessage('Building diagrams...');
      const snapshotsData = await client.getSnapshots(selectedProjectId);
      setScanPhase('saving');
      setSnapshots(snapshotsData);
      const nextSnapshot = snapshotsData[0]?.snapshotId ?? '';
      desiredSnapshotIdRef.current = nextSnapshot;
      desiredLayerRef.current = 'L0';
      setSelectedSnapshotId(nextSnapshot);
      setSelectedLayer('');
      setSelectedNodeId(null);
      setSelectedFeatureKey(null);
      setSelectedEdgeKey(null);
      setLayerParents({});
      clearHistory();
      setScanPhase('done');
      setApiMessage('Scan complete.');
      setActiveTab('mermaid');
    } catch (error) {
      setScanPhase('failed');
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

  const handleResizeStart = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    resizeStateRef.current = {
      active: true,
      startX: event.clientX,
      startWidth: leftPanelWidth,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleResizeMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!resizeStateRef.current.active) return;
    const delta = event.clientX - resizeStateRef.current.startX;
    const nextWidth = Math.min(
      leftPanelMax,
      Math.max(leftPanelMin, resizeStateRef.current.startWidth + delta),
    );
    setLeftPanelWidth(nextWidth);
  };

  const handleResizeEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (!resizeStateRef.current.active) return;
    resizeStateRef.current.active = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleProjectChange = (value: string) => {
    setSelectedProjectId(value);
    setSelectedSnapshotId('');
    setSelectedLayer('');
    desiredSnapshotIdRef.current = '';
    desiredLayerRef.current = 'L0';
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
    desiredLayerRef.current = 'L0';
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

  const selectedProjectName = projects.find((project) => project.projectId === selectedProjectId)?.name;
  const mermaidControlsDisabled = source === 'demo' || (source === 'local' && !apiAvailable);
  const scanDisabled =
    mermaidControlsDisabled || !selectedProjectId || !config || configBusy || configValidation.hasErrors;

  const formatLayerLabel = (layer: string) => {
    if (layer === 'L0') return 'Overview';
    const parts = layer.split(':');
    return parts.length > 1 ? parts.slice(1).join(':') : layer;
  };

  const layerGroups = useMemo(
    () => [
      {
        key: 'L0',
        title: 'L0 Overview',
        layers: layers.includes('L0') ? ['L0'] : [],
      },
      {
        key: 'L1',
        title: 'L1 Features',
        layers: layers.filter((layer) => layer.startsWith('L1')),
      },
      {
        key: 'L2',
        title: 'L2 Dependencies',
        layers: layers.filter((layer) => layer.startsWith('L2')),
      },
    ],
    [layers],
  );

  const resolveMermaidLabel = (mermaidId: string) => {
    const node = nodeIndex.mermaidIdToNode.get(mermaidId);
    if (node) return node.nameDisplay;
    const featureKey = featureIndex.mermaidIdToFeature.get(mermaidId);
    if (featureKey) return featureKey;
    return mermaidId;
  };

  const hoverDisplay = useMemo(() => {
    if (!hoveredMermaid) return null;
    if (hoveredMermaid.ids.length >= 2) {
      const [fromId, toId] = hoveredMermaid.ids;
      return {
        label: `${resolveMermaidLabel(fromId)} -> ${resolveMermaidLabel(toId)}`,
        meta: hoveredMermaid.label ? `Edge - ${hoveredMermaid.label}` : 'Edge',
      };
    }
    const id = hoveredMermaid.ids[0];
    const node = nodeIndex.mermaidIdToNode.get(id);
    if (node) {
      return { label: node.nameDisplay, meta: node.kind };
    }
    const featureKey = featureIndex.mermaidIdToFeature.get(id);
    if (featureKey) {
      return { label: featureKey, meta: 'Feature' };
    }
    return { label: hoveredMermaid.label ?? id, meta: undefined };
  }, [hoveredMermaid, featureIndex, nodeIndex]);

  const selectedDisplay = useMemo(() => {
    if (selectedNode) {
      return { label: selectedNode.nameDisplay, meta: selectedNode.kind };
    }
    if (selectedFeatureKey) {
      return { label: selectedFeatureKey, meta: 'Feature' };
    }
    if (selectedEdge) {
      const fromNode = getNodeById(audit, selectedEdge.fromId);
      const toNode = getNodeById(audit, selectedEdge.toId);
      return {
        label: `${fromNode?.nameDisplay ?? selectedEdge.fromId} -> ${toNode?.nameDisplay ?? selectedEdge.toId}`,
        meta: selectedEdge.edgeKind,
      };
    }
    return null;
  }, [selectedNode, selectedFeatureKey, selectedEdge, audit]);
  const hoverText = hoverDisplay?.label ?? 'Hover a node';
  const selectedText = selectedDisplay?.label ?? 'None';

  const emptyState = (
    <div className="space-y-3">
      <div className="text-base font-semibold text-slate-700">Canvas ready</div>
      <p className="text-xs text-slate-500">
        {source === 'demo'
          ? 'Switch to Local/Mock to load snapshots, or edit the demo Mermaid in the Config tab.'
          : 'Pick a snapshot or run a scan in the Config tab to generate layers.'}
      </p>
      {source !== 'demo' && !selectedSnapshotId && (
        <div className="text-[11px] text-slate-400">
          Use Start Scan in the Config tab to create a snapshot.
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

  const scanSteps = [
    { key: 'preparing', label: 'Preparing' },
    { key: 'scanning', label: 'Scanning' },
    { key: 'building', label: 'Building Diagrams' },
    { key: 'saving', label: 'Saving Snapshot' },
    { key: 'done', label: scanPhase === 'failed' ? 'Failed' : 'Done' },
  ];
  const scanStepOrder = scanSteps.map((step) => step.key);
  const scanPhaseIndex =
    scanPhase === 'idle'
      ? -1
      : scanPhase === 'failed'
        ? scanStepOrder.length - 1
        : scanStepOrder.indexOf(scanPhase);
  const scanStatusText =
    scanPhase === 'idle'
      ? 'Ready to scan.'
      : scanPhase === 'preparing'
        ? 'Preparing workspace and config...'
        : scanPhase === 'scanning'
          ? 'Scanning codebase...'
          : scanPhase === 'building'
            ? 'Building Mermaid layers...'
            : scanPhase === 'saving'
              ? 'Saving snapshot...'
              : scanPhase === 'done'
                ? 'Scan complete. Switching to Mermaid view.'
                : 'Scan failed. Check logs and try again.';

  const configView = (
    <div className="flex h-full flex-col gap-4 overflow-hidden">
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="ar-panel px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="ar-panel-title">Data Source</p>
              <p className="text-xs text-slate-500">Environment and connectivity.</p>
            </div>
            <span className="rounded-full border border-black/10 bg-white/70 px-3 py-1 text-[11px] text-slate-500">
              {source === 'demo' ? 'Demo' : source === 'mock' ? 'Mock API' : 'Local API'}
            </span>
          </div>
          <div className="mt-3 space-y-2">
            <label className="ar-label">Source</label>
            <select
              className="ar-select"
              value={source}
              onChange={(event) => {
                setSource(event.target.value as DataSource);
                clearHistory();
                setLayerParents({});
              }}
            >
              <option value="demo">Demo (editable)</option>
              <option value="local">Local API</option>
              <option value="mock">Mock API</option>
            </select>
            <p className="ar-help">Switch between demo, live API, and mock data.</p>
          </div>
          <div
            className={`mt-3 ar-callout ${
              source === 'demo'
                ? 'ar-callout-muted'
                : apiAvailable
                  ? 'ar-callout-ok'
                  : 'ar-callout-warn'
            }`}
          >
            {source === 'demo' ? (
              <span>Demo mode active. Local scans are disabled.</span>
            ) : apiAvailable ? (
              <span>API healthy{apiVersion ? ` (${apiVersion})` : ''}.</span>
            ) : (
              <span>API offline. Demo mode is recommended.</span>
            )}
          </div>
        </section>

        <section className="ar-panel px-5 py-4">
          <p className="ar-panel-title">Project Info</p>
          <p className="text-xs text-slate-500">Current workspace (read-only).</p>
          {profile ? (
            <div className="mt-3 space-y-3">
              <div>
                <div className="ar-label">Project</div>
                <div className="ar-readonly" title={selectedProjectName ?? profile.projectId}>
                  {selectedProjectName ?? profile.projectId}
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
                <div className="ar-readonly" title={configPath || 'n/a'}>
                  {configPath || 'n/a'}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-3 ar-card-muted">No project selected.</div>
          )}
        </section>
      </div>

      <section className="ar-panel flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="px-5 pt-4">
          <p className="ar-panel-title">Scan Configuration</p>
          <p className="text-xs text-slate-500">Tune what the scanner includes.</p>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-5 pt-4">
          <div className="space-y-4">
            <ConfigPanel
              profile={profile}
              config={config}
              disabled={mermaidControlsDisabled}
              busy={configBusy}
              onProfileChange={(next) => setProfile(next)}
              onConfigChange={(next) => setConfig(next)}
              onSave={handleSaveConfig}
              onReload={handleReloadConfig}
              onValidationChange={setConfigValidation}
            />

            <div className="ar-card">
              <h3 className="ar-panel-title">Appearance</h3>
              <p className="mb-3 text-xs text-slate-500">
                Customize Mermaid colors, backgrounds, and fonts.
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
      </section>

      <section className="ar-panel px-5 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex flex-col gap-2">
            <button
              className="ar-button-primary ar-button-xl"
              disabled={scanDisabled}
              onClick={handleScan}
              type="button"
            >
              Start Scan
            </button>
            <div className="text-[11px] text-slate-500">
              {source === 'demo'
                ? 'Demo mode does not run scans.'
                : 'Run a scan to generate a fresh snapshot and layers.'}
            </div>
            {configValidation.hasErrors && (
              <div className="text-[11px] text-rose-600">Fix config errors before scanning.</div>
            )}
          </div>

          <div className="flex-1">
            <div className="grid gap-3 sm:grid-cols-5">
              {scanSteps.map((step, index) => {
                const isComplete = scanPhaseIndex > index;
                const isActive = scanPhaseIndex === index && scanPhase !== 'idle';
                const isFailed = scanPhase === 'failed' && index === scanSteps.length - 1;
                const barClass = isFailed
                  ? 'bg-rose-400'
                  : isComplete
                    ? 'bg-emerald-400'
                    : isActive
                      ? 'bg-amber-400'
                      : 'bg-slate-200';
                const labelClass = isActive || isComplete ? 'text-slate-600' : 'text-slate-400';

                return (
                  <div key={step.key} className="space-y-1">
                    <div className={`h-2 rounded-full ${barClass}`} />
                    <div className={`text-[10px] uppercase tracking-[0.2em] ${labelClass}`}>
                      {step.label}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 text-[11px] text-slate-500">{scanStatusText}</div>
          </div>
        </div>
      </section>
    </div>
  );

  const mermaidView = (
    <div className="flex h-full min-h-0 gap-4 overflow-hidden">
      <aside
        className="ar-panel relative flex h-full shrink-0 flex-col"
        style={{ width: leftPanelWidth, minWidth: leftPanelMin, maxWidth: leftPanelMax }}
      >
        <div className="px-4 pt-4">
          <p className="ar-panel-title">Mermaid Navigator</p>
          <p className="text-xs text-slate-500">Project, snapshot, and layer access.</p>
        </div>
        <div className="px-4 pb-3 pt-3 space-y-3">
          <div className="space-y-2">
            <label className="ar-label">Project</label>
            <select
              className="ar-select"
              value={selectedProjectId}
              onChange={(event) => handleProjectChange(event.target.value)}
              disabled={mermaidControlsDisabled}
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
          </div>

          <div className="space-y-2">
            <label className="ar-label">Snapshot</label>
            <select
              className="ar-select"
              value={selectedSnapshotId}
              onChange={(event) => handleSnapshotChange(event.target.value)}
              disabled={mermaidControlsDisabled || !selectedProjectId}
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
          </div>
        </div>

        {mermaidControlsDisabled ? (
          <div className="px-4 pb-3">
            <div className="ar-callout ar-callout-muted">
              Switch to Local or Mock API to browse snapshots.
            </div>
          </div>
        ) : snapshots.length === 0 ? (
          <div className="px-4 pb-3">
            <div className="ar-callout ar-callout-muted">
              No snapshots yet. Run a scan in the Config tab.
            </div>
          </div>
        ) : null}

        <div className="px-4 pb-3">
          <div className="flex flex-wrap gap-2">
            <button className="ar-chip-button" onClick={handleGoBack} disabled={!canGoBack} type="button">
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
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <div className="space-y-4">
            {layerGroups.map((group) => (
              <div key={group.key} className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  <span>{group.title}</span>
                  <span className="text-[10px] text-slate-400">{group.layers.length}</span>
                </div>
                {group.layers.length > 0 ? (
                  group.layers.map((layer) => {
                    const isActive = layer === selectedLayer;
                    return (
                      <button
                        key={layer}
                        className={`w-full rounded-xl border px-3 py-2 text-left text-[12px] font-semibold transition ${
                          isActive
                            ? 'border-amber-300 bg-amber-100 text-amber-900'
                            : 'border-black/10 bg-white/70 text-slate-700 hover:bg-white'
                        }`}
                        onClick={() => updateLayer(layer, { record: true })}
                        disabled={mermaidControlsDisabled}
                        type="button"
                        title={layer}
                      >
                        <span className="block truncate">{formatLayerLabel(layer)}</span>
                      </button>
                    );
                  })
                ) : (
                  <div className="rounded-xl border border-dashed border-black/10 px-3 py-2 text-[11px] text-slate-400">
                    No {group.key} layers.
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div
          className="ar-resize-handle"
          onPointerDown={handleResizeStart}
          onPointerMove={handleResizeMove}
          onPointerUp={handleResizeEnd}
          onPointerCancel={handleResizeEnd}
        />
      </aside>

      <main className="relative flex min-w-0 flex-1 flex-col">
        <div className="relative flex min-h-0 flex-1">
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
            onHoverChange={setHoveredMermaid}
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

          <div className="pointer-events-none absolute right-6 top-6 z-20 text-[11px] text-slate-600">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Hover
            </div>
            <div className="text-sm font-semibold text-slate-800">{hoverText}</div>
            {hoverDisplay?.meta && <div className="text-[10px] text-slate-400">{hoverDisplay.meta}</div>}
            <div className="mt-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Selected
            </div>
            <div className="text-sm font-semibold text-slate-800">{selectedText}</div>
            {selectedDisplay?.meta && (
              <div className="text-[10px] text-slate-400">{selectedDisplay.meta}</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );

  return (
    <div className="ar-workbench h-screen overflow-hidden text-slate-900">
      <div className="flex h-screen flex-col overflow-hidden">
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
            {activeTab === 'mermaid' && (
              <button className="ar-button" onClick={handleExport} type="button">
                Export SVG
              </button>
            )}
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-2 px-6 pb-3">
          <button
            className={`ar-tab ${activeTab === 'config' ? 'ar-tab-active' : ''}`}
            onClick={() => setActiveTab('config')}
            type="button"
          >
            Config & Scan
          </button>
          <button
            className={`ar-tab ${activeTab === 'mermaid' ? 'ar-tab-active' : ''}`}
            onClick={() => setActiveTab('mermaid')}
            type="button"
          >
            Mermaid
          </button>
        </div>

        <div className="flex-1 overflow-hidden px-6 pb-6">
          {activeTab === 'config' ? configView : mermaidView}
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
