import type {
  DiagramResponse,
  HealthResponse,
  LayerResponse,
  ProjectSummary,
  SnapshotSummary,
} from '../domain/types';

const API_BASE = import.meta.env.VITE_API_BASE ?? '';

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

const fetchJson = async <T>(path: string): Promise<T> => {
  const response = await fetch(resolveUrl(path), {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
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
