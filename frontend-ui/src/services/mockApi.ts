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

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const mockProjects: ProjectSummary[] = [
  { projectId: 'atlas', name: 'Atlas Platform' },
  { projectId: 'lumen', name: 'Lumen Services' },
];

const mockProfiles: Record<string, ProjectProfile> = {
  atlas: {
    projectId: 'atlas',
    name: 'Atlas Platform',
    projectRoot: 'D:/Projects/Atlas',
    scanRoot: 'D:/Projects/Atlas/src',
  },
  lumen: {
    projectId: 'lumen',
    name: 'Lumen Services',
    projectRoot: 'D:/Projects/Lumen',
    scanRoot: 'D:/Projects/Lumen/src',
  },
};

const mockConfig: ArchRadarConfig = {
  debugEnabled: false,
  scan: {
    mode: 'DirectoryOnly',
    solutionPath: '',
    excludeGlobs: ['**/bin/**', '**/obj/**'],
  },
  featureRules: {
    fallbackFeatureKey: 'Unresolved',
    rules: [
      {
        kind: 'NamespacePattern',
        pattern: 'MyGame.Features.{feature}.',
        featureKey: '',
      },
    ],
  },
  externalFolding: {
    enabled: true,
    defaultGroupName: 'External',
    groups: [
      { name: 'Unity', prefixes: ['UnityEngine', 'UnityEditor'] },
      { name: 'DotNet', prefixes: ['System', 'Microsoft'] },
    ],
  },
  l2: {
    enabled: true,
    targets: [],
    stopKinds: ['Command', 'Query', 'Event'],
    maxDepth: 3,
    edgeKinds: [],
  },
};

const mockSnapshots: Record<string, SnapshotSummary[]> = {
  atlas: [
    { snapshotId: 's-2024-11', timestamp: '2024-11-09T10:12:00Z', label: 'Pre-Scale' },
    { snapshotId: 's-2024-12', timestamp: '2024-12-02T07:45:00Z', label: 'Scale-Out' },
  ],
  lumen: [
    { snapshotId: 's-2024-10', timestamp: '2024-10-05T18:30:00Z', label: 'Baseline' },
  ],
};

const mockLayers: Record<string, Record<string, LayerResponse>> = {
  atlas: {
    's-2024-11': { layers: ['L0', 'L1:Gateway', 'L2:Analytics'] },
    's-2024-12': { layers: ['L0', 'L1:Gateway', 'L2:Security'] },
  },
  lumen: {
    's-2024-10': { layers: ['L0', 'L1:Accounts', 'L2:Billing'] },
  },
};

const mockDiagrams: Record<string, Record<string, Record<string, string>>> = {
  atlas: {
    's-2024-11': {
      L0: `flowchart LR
  A[Clients] --> B[Edge Gateway]
  B --> C[Core Services]
  C --> D[(Event Store)]
  C --> E[Analytics Engine]
  E --> F{Insights}
  F -->|Dashboards| G[Ops Console]
  F -->|Alerts| H[Pager Duty]`,
      'L1:Gateway': `sequenceDiagram
  participant Client
  participant Gateway
  participant Auth
  participant Router

  Client->>Gateway: Request
  Gateway->>Auth: Validate token
  Auth-->>Gateway: Ok
  Gateway->>Router: Resolve route
  Router-->>Gateway: Target
  Gateway-->>Client: Response`,
      'L2:Analytics': `flowchart TB
  A[Telemetry] --> B[Stream Ingest]
  B --> C[Feature Extractors]
  C --> D[(Cold Storage)]
  C --> E[Realtime Cache]
  E --> F[Signals API]
  D --> F`,
    },
    's-2024-12': {
      L0: `flowchart LR
  A[Clients] --> B[Gateway Mesh]
  B --> C[Domain Services]
  C --> D[(Event Bus)]
  C --> E[Security Mesh]
  E --> F[Policy Engine]
  F --> G[Audit Lake]`,
      'L1:Gateway': `flowchart TB
  A[Edge POP] --> B[Rate Limiter]
  B --> C[Identity Proxy]
  C --> D[Service Router]
  D --> E[Observability]`,
      'L2:Security': `sequenceDiagram
  participant Gateway
  participant Policy
  participant Vault
  Gateway->>Policy: Evaluate policy
  Policy->>Vault: Fetch key
  Vault-->>Policy: Key
  Policy-->>Gateway: Allow`,
    },
  },
  lumen: {
    's-2024-10': {
      L0: `flowchart LR
  A[Mobile] --> B[API Hub]
  B --> C[Account Service]
  B --> D[Billing Service]
  B --> E[Notification Service]
  C --> F[(Ledger)]
  D --> F`,
      'L1:Accounts': `flowchart TB
  A[Account UI] --> B[Account API]
  B --> C[Profile Store]
  B --> D[Consent Service]
  D --> E[(Consent DB)]`,
      'L2:Billing': `sequenceDiagram
  participant Billing
  participant Tax
  participant Ledger
  Billing->>Tax: Calc tax
  Tax-->>Billing: Tax lines
  Billing->>Ledger: Post invoice
  Ledger-->>Billing: Ledger id`,
    },
  },
};

export const getHealth = async (): Promise<HealthResponse> => {
  await delay(120);
  return { ok: true, version: 'mock-0.1.0' };
};

export const getProjects = async (): Promise<ProjectSummary[]> => {
  await delay(160);
  return mockProjects;
};

export const getSnapshots = async (projectId: string): Promise<SnapshotSummary[]> => {
  await delay(160);
  return mockSnapshots[projectId] ?? [];
};

export const getLayers = async (
  projectId: string,
  snapshotId: string,
): Promise<LayerResponse> => {
  await delay(120);
  return mockLayers[projectId]?.[snapshotId] ?? { layers: [] };
};

export const getDiagram = async (
  projectId: string,
  snapshotId: string,
  layer: string,
): Promise<DiagramResponse> => {
  await delay(180);
  const mmd = mockDiagrams[projectId]?.[snapshotId]?.[layer];
  return {
    mmd:
      mmd ??
      `flowchart TB
  A[Layer Not Found] --> B[Select another layer]`,
  };
};

export const getAudit = async (
  projectId: string,
  snapshotId: string,
): Promise<AuditSnapshot> => {
  await delay(120);
  return {
    nodes: [
      {
        id: `${projectId}:${snapshotId}:Gateway`,
        kind: 'System',
        nameDisplay: 'GatewayController',
        featureKey: 'Gateway',
        source: { file: 'src/GatewayController.cs', startLine: 12, startCol: 5 },
      },
      {
        id: `${projectId}:${snapshotId}:Auth`,
        kind: 'System',
        nameDisplay: 'AuthService',
        featureKey: 'Gateway',
        source: { file: 'src/AuthService.cs', startLine: 8, startCol: 5 },
      },
    ],
    edges: [
      {
        fromId: `${projectId}:${snapshotId}:Gateway`,
        toId: `${projectId}:${snapshotId}:Auth`,
        edgeKind: 'Calls',
        weight: 2,
        confidence: 'Medium',
        callSites: [
          { file: 'src/GatewayController.cs', line: 42, col: 15, snippet: 'auth.Login()' },
        ],
      },
    ],
  };
};

export const openInEditor = async () => {
  await delay(80);
  return { ok: true };
};

export const getProjectProfile = async (projectId: string): Promise<ProjectProfile> => {
  await delay(80);
  return (
    mockProfiles[projectId] ?? {
      projectId,
      name: projectId,
      projectRoot: 'D:/Projects/Unknown',
    }
  );
};

export const updateProjectProfile = async (
  projectId: string,
  profile: ProjectProfile,
): Promise<ProjectProfile> => {
  await delay(80);
  mockProfiles[projectId] = profile;
  return profile;
};

export const getProjectConfig = async (): Promise<{ path: string; config: ArchRadarConfig }> => {
  await delay(80);
  return { path: 'D:/Projects/mock/.archradar/config.json', config: mockConfig };
};

export const updateProjectConfig = async (
  _projectId: string,
  config: ArchRadarConfig,
): Promise<{ path: string; config: ArchRadarConfig }> => {
  await delay(80);
  return { path: 'D:/Projects/mock/.archradar/config.json', config };
};

export const startScan = async (projectId: string): Promise<SnapshotSummary> => {
  await delay(120);
  return {
    snapshotId: `${projectId}-scan-${Date.now()}`,
    timestamp: new Date().toISOString(),
    label: 'Mock Scan',
  };
};
