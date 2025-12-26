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

export interface AuditSource {
  file: string;
  startLine: number;
  startCol: number;
}

export interface AuditCallSite {
  file: string;
  line: number;
  col: number;
  snippet?: string | null;
}

export interface AuditNode {
  id: string;
  kind: string;
  nameDisplay: string;
  featureKey: string;
  source?: AuditSource | null;
}

export interface AuditEdge {
  fromId: string;
  toId: string;
  edgeKind: string;
  weight: number;
  confidence: string;
  callSites: AuditCallSite[];
}

export interface AuditSnapshot {
  nodes: AuditNode[];
  edges: AuditEdge[];
}

export interface MermaidRenderOptions {
  securityLevel?: 'strict' | 'loose' | 'antiscript';
  maxTextSize?: number;
  suppressErrors?: boolean;
}

export interface MermaidNodeEvent {
  mermaidId?: string;
  fromMermaidId?: string;
  toMermaidId?: string;
  label?: string;
  kind: 'node' | 'edge';
  action: 'click' | 'doubleClick';
  rawEvent: MouseEvent;
}
