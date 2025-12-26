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

export interface ScanConfig {
  notes?: string;
  mode: string;
  solutionPath?: string | null;
  excludeGlobs: string[];
}

export interface FeatureRule {
  kind: string;
  pattern: string;
  featureKey?: string | null;
  notes?: string;
}

export interface FeatureRuleConfig {
  notes?: string;
  fallbackFeatureKey: string;
  rules: FeatureRule[];
}

export interface ExternalGroup {
  name: string;
  prefixes: string[];
  notes?: string;
}

export interface ExternalFoldingConfig {
  notes?: string;
  enabled: boolean;
  defaultGroupName: string;
  groups: ExternalGroup[];
}

export interface L2Config {
  notes?: string;
  enabled: boolean;
  targets: string[];
  stopKinds: string[];
  maxDepth: number;
  edgeKinds: string[];
}

export interface ArchRadarConfig {
  notes?: string;
  debugEnabled: boolean;
  legacyL2Detected?: boolean;
  scan: ScanConfig;
  featureRules: FeatureRuleConfig;
  externalFolding: ExternalFoldingConfig;
  l2: L2Config;
}

export interface ProjectProfile {
  projectId: string;
  name: string;
  projectRoot: string;
  configPath?: string | null;
  scanRoot?: string | null;
  notes?: string | null;
  updatedAt?: string | null;
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
