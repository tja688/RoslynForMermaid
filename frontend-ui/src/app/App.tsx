import { useEffect, useMemo, useState } from 'react';
import MermaidPreview from '../components/MermaidPreview';
import { exportSvg } from '../components/MermaidPreview';
import SnapshotPanel from '../components/SnapshotPanel';
import ThemePicker from '../components/ThemePicker';
import type {
  DataSource,
  MermaidRenderOptions,
  ProjectSummary,
  SnapshotSummary,
} from '../domain/types';
import {
  getBackgroundById,
  getThemeConfig,
  type ThemeType,
} from '../domain/themeCatalog';
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

  useEffect(() => {
    api
      .getHealth()
      .then((data) => {
        setApiAvailable(true);
        setApiVersion(data.version);
        setApiMessage('');
      })
      .catch(() => {
        setApiAvailable(false);
        setApiVersion(undefined);
        setApiMessage('Backend not started (using demo mode).');
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
    if (source === 'demo' || !selectedProjectId || !selectedSnapshotId) {
      setLayers([]);
      setSelectedLayer('');
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
                if (event.nodeId) {
                  console.info('Mermaid node event:', event.nodeId);
                }
              }}
            />
          </main>

          <aside className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Error Panel
            </h2>
            <div className="mt-3 space-y-3 text-sm text-slate-700">
              {apiMessage ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  {apiMessage}
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  API status messages will show here.
                </div>
              )}

              {renderError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                  {renderError}
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  Mermaid render errors will show here.
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
