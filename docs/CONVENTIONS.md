# 关键约定（Conventions）

- TL;DR
- 目录边界明确：API/CLI 只做编排，扫描与图生成都在 `ArchRadar.Core/`（`ArchRadar.Api/Services/ScanService.cs`、`ArchRadar.Cli/Program.cs`）。
- 项目/快照 ID 有明确规则：`projectId` 会被清洗为安全 ID；`snapshotId` 使用时间戳格式（`ArchRadar.Api/Services/PathSanitizer.cs`、`ArchRadar.Api/Services/ScanService.cs`）。
- 前端不使用全局状态库，状态集中在 `App.tsx` 内部（`frontend-ui/src/app/App.tsx`）。
- API 错误通过 HTTP 状态码返回，前端统一用 `fetchJson` 抛错处理（`ArchRadar.Api/Program.cs`、`frontend-ui/src/services/api.ts`）。

## 目录与模块约定
- 后端 API：`ArchRadar.Api/`，所有路由集中在 `ArchRadar.Api/Program.cs`。
- 核心扫描逻辑：`ArchRadar.Core/`，API/CLI 通过调用 Core 执行扫描（`ArchRadar.Api/Services/ScanService.cs`、`ArchRadar.Cli/Program.cs`）。
- 前端：`frontend-ui/`，入口 `frontend-ui/src/main.tsx`，页面逻辑 `frontend-ui/src/app/App.tsx`。

## 命名与 ID 规则
- `projectId` 需要安全化：仅保留字母数字并转小写，其他字符替换为 `-`（`ArchRadar.Api/Services/PathSanitizer.cs#ToSafeId`）。
- `snapshotId` 采用时间戳命名（`yyyy-MM-dd_HHmmss`）：`ArchRadar.Api/Services/ScanService.cs`、`ArchRadar.Cli/Program.cs`。
- Mermaid 节点/Feature ID 使用 FNV-1a 64 位哈希生成（`frontend-ui/src/domain/mermaidIds.ts`）。

## 状态管理
- React 状态全部由 `useState/useEffect/useMemo` 管理，无 Redux/Zustand（`frontend-ui/src/app/App.tsx`）。
- 组件间通过 props 传递数据与回调（`frontend-ui/src/components/SnapshotPanel.tsx`、`frontend-ui/src/components/ConfigPanel.tsx`）。

## API 约定
- 路由集中在 `ArchRadar.Api/Program.cs`，客户端封装在 `frontend-ui/src/services/api.ts`。
- JSON 字段命名：前端按 camelCase 发送与读取（`frontend-ui/src/domain/types.ts` + `frontend-ui/src/services/api.ts`）。
  - 【推测】后端使用 ASP.NET Core 默认 JSON 命名策略（camelCase）。验证方式：`curl http://localhost:5157/api/health` 查看字段名。

## 错误处理与返回
- 后端在路由中直接返回 `Results.BadRequest`/`Results.NotFound`/`Results.Problem`（`ArchRadar.Api/Program.cs`）。
- 前端 `fetchJson` 在 `response.ok` 为 false 时抛错（`frontend-ui/src/services/api.ts`）。

## 日志与调试
- 后端请求日志：`ArchRadar.Api/Program.cs` 中间件打印 REQ/RES。
- 扫描调试日志：`ArchRadar.Core/Diagnostics/DebugLog.cs`，由 `config.debugEnabled` 控制（`ArchRadar.Api/Services/ScanService.cs`、`ArchRadar.Cli/Program.cs`）。

## 配置文件约定
- 扫描配置文件路径优先级：`.archradar/config.json` → `archradar.config.json`（`ArchRadar.Api/Services/ScanService.cs`、`ArchRadar.Cli/Program.cs`）。
- 默认配置生成逻辑在 `ArchRadar.Api/Services/ProjectConfigService.cs#CreateDefaultConfig`。
