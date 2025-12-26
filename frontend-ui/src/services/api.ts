import type {
  ArchRadarConfig,
  AuditSnapshot,
  DiagramResponse,
  HealthResponse,
  LayerResponse,
  ProjectSummary,
  ProjectProfile,
  SnapshotSummary,
} from '../domain/types';

const API_BASE_RAW = import.meta.env.VITE_API_BASE ?? '';
const API_BASE = API_BASE_RAW.trim();

if (import.meta.env.DEV) {
  console.info('[API] base', API_BASE || '(empty)');
  if (API_BASE_RAW !== API_BASE) {
    console.warn('[API] base trimmed', JSON.stringify(API_BASE_RAW));
  }
}

const resolveUrl = (path: string) => {
  if (!API_BASE) return path;
  if (API_BASE.endsWith('/') && path.startsWith('/')) {
    return `${API_BASE.slice(0, -1)}${path}`;
  }
  if (!API_BASE.endsWith('/') && !path.startsWith('/')) {
    return `${API_BASE}/${path}`;
  }
  return `${API_BASE}${path}`;
};

const fetchJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const url = resolveUrl(path);
  if (import.meta.env.DEV) {
    console.info('[API] request', url, init?.method ?? 'GET');
  }

  const response = await fetch(url, {
    headers: { Accept: 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });

  if (!response.ok) {
    if (import.meta.env.DEV) {
      console.warn('[API] response', response.status, response.statusText, url);
    }
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  const json = (await response.json()) as T;
  if (import.meta.env.DEV) {
    console.info('[API] response ok', url, json);
  }
  return json;
};

export const getHealth = () => fetchJson<HealthResponse>('/api/health');

export const getProjects = () => fetchJson<ProjectSummary[]>('/api/projects');

export const getSnapshots = (projectId: string) =>
  fetchJson<SnapshotSummary[]>(`/api/projects/${projectId}/snapshots`);

export const getLayers = (projectId: string, snapshotId: string) =>
  fetchJson<LayerResponse>(
    `/api/projects/${projectId}/snapshots/${snapshotId}/layers`,
  );

export const getDiagram = (
  projectId: string,
  snapshotId: string,
  layer: string,
) =>
  fetchJson<DiagramResponse>(
    `/api/projects/${projectId}/snapshots/${snapshotId}/diagram?layer=${encodeURIComponent(layer)}`,
  );

export const getAudit = (projectId: string, snapshotId: string) =>
  fetchJson<AuditSnapshot>(
    `/api/projects/${projectId}/snapshots/${snapshotId}/audit`,
  );

export const openInEditor = (file: string, line?: number, col?: number) =>
  fetchJson<{ ok: boolean; message?: string }>('/api/open', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file, line, col }),
  });

export const getProjectProfile = (projectId: string) =>
  fetchJson<ProjectProfile>(`/api/projects/${projectId}/profile`);

export const updateProjectProfile = (projectId: string, profile: ProjectProfile) =>
  fetchJson<ProjectProfile>(`/api/projects/${projectId}/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: profile.name,
      projectRoot: profile.projectRoot,
      configPath: profile.configPath,
      scanRoot: profile.scanRoot,
    }),
  });

export const getProjectConfig = (projectId: string) =>
  fetchJson<{ path: string; config: ArchRadarConfig }>(`/api/projects/${projectId}/config`);

export const updateProjectConfig = (projectId: string, config: ArchRadarConfig) =>
  fetchJson<{ path: string; config: ArchRadarConfig }>(`/api/projects/${projectId}/config`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ config }),
  });

export const startScan = (projectId: string, notes?: string) =>
  fetchJson<SnapshotSummary>(`/api/projects/${projectId}/scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ notes }),
  });
