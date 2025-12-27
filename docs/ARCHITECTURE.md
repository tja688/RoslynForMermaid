# 架构说明

- TL;DR
- 后端采用 ASP.NET 最小 API，路由直接写在 `ArchRadar.Api/Program.cs`，并在构建后托管 `frontend-ui/dist`。
- 核心扫描与图生成集中在 `ArchRadar.Core/`：扫描（Roslyn/MSBuild）、规则归属、外部折叠与 L0/L1/L2 Mermaid 输出。
- 前端是单页 React 应用，入口在 `frontend-ui/src/main.tsx`，通过 `frontend-ui/src/services/api.ts` 调用后端接口。
- API 与 UI 交互以 JSON 传输 `AuditSnapshot`/`ProjectProfile` 等数据结构（后端模型在 `ArchRadar.Api/Models/*`，前端类型在 `frontend-ui/src/domain/types.ts`）。

## 总体结构
- 后端 API：`ArchRadar.Api/Program.cs`（路由、CORS、日志中间件、静态文件托管）
- 核心库：`ArchRadar.Core/*`（扫描、规则、图构建与输出）
- CLI：`ArchRadar.Cli/Program.cs`（直接调用 Core 进行扫描并写出结果）
- 前端 UI：`frontend-ui/src/app/App.tsx` + `frontend-ui/src/components/*`（Mermaid 预览与交互）

## 后端（ArchRadar.Api）
### 入口与路由
- 入口：`ArchRadar.Api/Program.cs`（`WebApplication.CreateBuilder`）
- 主要 API 路由（全部在 `ArchRadar.Api/Program.cs`）：
  - `/api/health`：健康检查
  - `/api/projects`（GET/POST）：项目列表与注册
  - `/api/projects/{projectId}/profile`（GET/PUT）：项目资料
  - `/api/projects/{projectId}/config`（GET/PUT）：配置读取/保存
  - `/api/projects/{projectId}/snapshots`（GET）：快照列表
  - `/api/projects/{projectId}/snapshots/{snapshotId}/layers`（GET）：层级列表
  - `/api/projects/{projectId}/snapshots/{snapshotId}/diagram?layer=...`（GET）：Mermaid 文本
  - `/api/projects/{projectId}/snapshots/{snapshotId}/audit`（GET）：audit.json
  - `/api/projects/{projectId}/scan`（POST）：触发扫描
  - `/api/open`（POST）：打开文件（编辑器跳转）

### 服务层与职责
- 项目管理：`ArchRadar.Api/Services/ProjectCatalogService.cs`
  - `LoadCatalog`/`SaveCatalog` 使用 `JsonFileStore` 读写 `catalog.json`
  - `UpsertProject`/`UpdateProfile` 写入 `profile.json`
- 扫描与输出：`ArchRadar.Api/Services/ScanService.cs`
  - `RunScanAsync` 读取配置 → 扫描 → 写出 `audit.json` 与 L0/L1/L2 Mermaid
  - 输出位置由 `WorkspacePaths` 生成（`ArchRadar.Api/Services/WorkspacePaths.cs`）
- 快照读取：`ArchRadar.Api/Services/SnapshotService.cs`
  - `ReadAudit`/`ReadLayerDiagram` 读取 `audit.json` / `L*.mmd`
- 配置管理：`ArchRadar.Api/Services/ProjectConfigService.cs`
  - `LoadOrCreateConfig`/`SaveConfig` 读写 `.archradar/config.json`
- 文件存储与路径：`ArchRadar.Api/Services/JsonFileStore.cs`、`ArchRadar.Api/Services/PathSanitizer.cs`
- 编辑器打开：`ArchRadar.Api/Services/EditorLauncher.cs`
  - 使用 `ARCHRADAR_EDITOR` + `ARCHRADAR_EDITOR_ARGS` 组装参数

### 数据持久化
- 后端使用 JSON 文件作为存储（无数据库）：`ArchRadar.Api/Services/JsonFileStore.cs`
- 目录结构由 `WorkspacePaths` 定义：`ArchRadar.Api/Services/WorkspacePaths.cs`
- 工作区根目录：`ARCHRADAR_WORKSPACE` 环境变量或 `LocalApplicationData/ArchRadar`（`ArchRadar.Api/Program.cs`）

## 核心库（ArchRadar.Core）
### 扫描入口与模式
- 目录扫描：`ArchRadar.Core/Scanning/DirectoryAuditScanner.cs`（纯文件解析）
- MSBuild 扫描：`ArchRadar.Core/Scanning/MsBuildAuditScanner.cs`（使用 Roslyn Workspace）
- 语法遍历：`ArchRadar.Core/Scanning/CSharpAuditWalker.cs`
  - 类声明 → `AuditNode`
  - 方法调用/对象创建 → `AuditEdge` + `AuditCallSite`

### 规则与归属
- Feature 规则：`ArchRadar.Core/Rules/FeatureRuleEngine.cs`
  - NamespacePattern / FolderPattern 两类规则
  - 未命中回退到 `FallbackFeatureKey`

### 图构建与输出
- 外部折叠：`ArchRadar.Core/Processing/ExternalFoldingProcessor.cs`
- L2 子图：`ArchRadar.Core/Processing/L2GraphBuilder.cs`
- Mermaid 输出：`ArchRadar.Core/Output/MermaidWriter.cs`
- audit.json 输出：`ArchRadar.Core/Output/AuditJsonWriter.cs`

### 核心数据结构
- 图结构：`ArchRadar.Core/Models/AuditGraph.cs`
- 节点/边/枚举：`ArchRadar.Core/Models/AuditNode.cs`、`AuditEdge.cs`、`AuditEnums.cs`
- 快照：`ArchRadar.Core/Models/AuditSnapshot.cs`

## 前端（frontend-ui）
### 入口与主流程
- 入口：`frontend-ui/src/main.tsx`（渲染 `<App />`）
- 主组件：`frontend-ui/src/app/App.tsx`
  - `useState/useEffect` 管理数据源、项目、快照、层级、审计结果
  - 数据源切换：demo / local / mock

### API client 与 mock
- 真实 API：`frontend-ui/src/services/api.ts`
  - 通过 `VITE_API_BASE` 决定 base URL
- mock 数据：`frontend-ui/src/services/mockApi.ts`
  - 供 UI 演示与离线调试

### Mermaid 预览与交互
- 预览组件：`frontend-ui/src/components/MermaidPreview/MermaidPreview.tsx`
  - `mermaid.render` + SVG 注入样式
  - 单击/双击识别节点或边（`extractMermaidIds`）
- Mermaid ID 生成：`frontend-ui/src/domain/mermaidIds.ts`

### UI 面板
- 快照/数据源面板：`frontend-ui/src/components/SnapshotPanel.tsx`
- 配置编辑面板：`frontend-ui/src/components/ConfigPanel.tsx`
- 主题/字体/背景：`frontend-ui/src/components/ThemePicker.tsx` + `frontend-ui/src/domain/themeCatalog.ts`

## 前后端交互（路径对齐）
- 健康检查：`frontend-ui/src/services/api.ts#getHealth` → `GET /api/health` → `ArchRadar.Api/Program.cs`
- 项目列表：`frontend-ui/src/services/api.ts#getProjects` → `GET /api/projects`
- 项目配置：`frontend-ui/src/services/api.ts#getProjectConfig/updateProjectConfig` → `GET/PUT /api/projects/{id}/config`
- 扫描触发：`frontend-ui/src/services/api.ts#startScan` → `POST /api/projects/{id}/scan` → `ArchRadar.Api/Services/ScanService.cs#RunScanAsync`
- Mermaid 文本：`frontend-ui/src/services/api.ts#getDiagram` → `GET /api/projects/{id}/snapshots/{sid}/diagram`
- audit.json：`frontend-ui/src/services/api.ts#getAudit` → `GET /api/projects/{id}/snapshots/{sid}/audit`
- 编辑器跳转：`frontend-ui/src/services/api.ts#openInEditor` → `POST /api/open` → `ArchRadar.Api/Services/EditorLauncher.cs#OpenFile`

## 【推测】可能的隐藏依赖
- 【推测】MsBuild 模式可能要求安装 Visual Studio Build Tools / MSBuild 组件，否则 `MsBuildAuditScanner` 会在 `MSBuildLocator` 查找失败时记录日志。验证方式：运行扫描并观察 `ArchRadar.Core/Scanning/MsBuildAuditScanner.cs` 的 DebugLog 输出。
