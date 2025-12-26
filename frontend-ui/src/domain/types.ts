export type DataSource = 'demo' | 'local' | 'mock';

export interface HealthResponse {
  ok: true;
  version: string;
}

export interface ProjectSummary {
  projectId: string;
  name: string;
}

export interface SnapshotSummary {
  snapshotId: string;
  timestamp: string;
  label?: string;
}

export interface LayerResponse {
  layers: string[];
}

export interface DiagramResponse {
  mmd: string;
}

export interface MermaidRenderOptions {
  securityLevel?: 'strict' | 'loose' | 'antiscript';
  maxTextSize?: number;
  suppressErrors?: boolean;
}

export interface MermaidNodeEvent {
  nodeId?: string;
  rawEvent: MouseEvent;
}
