import type { AuditEdge, AuditNode, AuditSnapshot } from './types';
import { featureId, nodeId } from './mermaidIds';

export interface FeatureStats {
  featureKey: string;
  nodeCount: number;
  edgeCount: number;
}

export interface NodeIndex {
  mermaidIdToNode: Map<string, AuditNode>;
  nodeIdToMermaidId: Map<string, string>;
}

export const buildNodeIndex = (audit: AuditSnapshot | null): NodeIndex => {
  const mermaidIdToNode = new Map<string, AuditNode>();
  const nodeIdToMermaidId = new Map<string, string>();

  if (!audit) {
    return { mermaidIdToNode, nodeIdToMermaidId };
  }

  for (const node of audit.nodes) {
    const mermaid = nodeId(node.id);
    mermaidIdToNode.set(mermaid, node);
    nodeIdToMermaidId.set(node.id, mermaid);
  }

  return { mermaidIdToNode, nodeIdToMermaidId };
};

export const buildFeatureIndex = (audit: AuditSnapshot | null) => {
  const mermaidIdToFeature = new Map<string, string>();
  const statsByFeature = new Map<string, FeatureStats>();

  if (!audit) {
    return { mermaidIdToFeature, statsByFeature };
  }

  const featureByNodeId = new Map<string, string>();
  for (const node of audit.nodes) {
    const key = node.featureKey || 'Unresolved';
    featureByNodeId.set(node.id, key);
    const stat = statsByFeature.get(key) ?? { featureKey: key, nodeCount: 0, edgeCount: 0 };
    stat.nodeCount += 1;
    statsByFeature.set(key, stat);
  }

  for (const edge of audit.edges) {
    const key = featureByNodeId.get(edge.fromId) ?? featureByNodeId.get(edge.toId) ?? 'Unresolved';
    const stat = statsByFeature.get(key) ?? { featureKey: key, nodeCount: 0, edgeCount: 0 };
    stat.edgeCount += 1;
    statsByFeature.set(key, stat);
  }

  for (const key of statsByFeature.keys()) {
    mermaidIdToFeature.set(featureId(key), key);
  }

  return { mermaidIdToFeature, statsByFeature };
};

export const buildL2LayerMap = (audit: AuditSnapshot | null) => {
  const map = new Map<string, string>();
  if (!audit) return map;

  const nodes = audit.nodes
    .filter((node) => node.featureKey !== 'Unresolved' && node.featureKey !== 'External')
    .slice()
    .sort((a, b) => compareIgnoreCase(a.nameDisplay, b.nameDisplay));

  const counter = new Map<string, number>();
  for (const node of nodes) {
    const baseName = getShortName(node.nameDisplay);
    const safeKey = toSafeKey(baseName);
    const next = (counter.get(safeKey) ?? 0) + 1;
    counter.set(safeKey, next);

    const displayName = next > 1 ? `${baseName}_${next}` : baseName;
    map.set(node.id, `L2:${displayName}`);
  }

  return map;
};

export const findEdge = (
  audit: AuditSnapshot | null,
  fromId: string | null,
  toId: string | null,
  label?: string,
) => {
  if (!audit || !fromId || !toId) return null;
  const candidates = audit.edges.filter((edge) => edge.fromId === fromId && edge.toId === toId);
  if (candidates.length === 0) return null;
  if (!label) return candidates[0];
  const normalized = label.trim().toLowerCase();
  return candidates.find((edge) => edge.edgeKind.toLowerCase() === normalized) ?? candidates[0];
};

export const getNodeById = (audit: AuditSnapshot | null, nodeIdValue: string | null) => {
  if (!audit || !nodeIdValue) return null;
  return audit.nodes.find((node) => node.id === nodeIdValue) ?? null;
};

export const collectNodeEdges = (audit: AuditSnapshot | null, nodeIdValue: string | null) => {
  if (!audit || !nodeIdValue) return [];
  return audit.edges.filter((edge) => edge.fromId === nodeIdValue || edge.toId === nodeIdValue);
};

const compareIgnoreCase = (a: string, b: string) => {
  const left = a.toLowerCase();
  const right = b.toLowerCase();
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
};

const getShortName = (text: string) => {
  if (!text) return 'Unknown';
  let name = text;
  if (name.startsWith('Unresolved::')) {
    name = name.slice('Unresolved::'.length);
  }
  if (name.startsWith('global::')) {
    name = name.slice('global::'.length);
  }
  const lastDot = name.lastIndexOf('.');
  return lastDot >= 0 ? name.slice(lastDot + 1) : name;
};

const toSafeKey = (value: string) => {
  const sanitized = value.replace(/[\\/:*?"<>|]/g, '_');
  return sanitized.toLowerCase();
};
