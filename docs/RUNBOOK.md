# 本地运行与排障（Runbook）

- TL;DR
- 推荐直接运行 `start-archradar.bat`，会自动启动后端、注册项目并启动前端（`start-archradar.bat`）。扫描需在前端手动触发。
- 后端默认监听 `http://localhost:5157`（`ArchRadar.Api/Properties/launchSettings.json`），前端 dev server 固定 `5173`（`frontend-ui/vite.config.ts`）。
- 配置文件可选：未提供时会在项目下自动生成 `.archradar/config.json`（`ArchRadar.Api/Services/ProjectConfigService.cs`）。
- 前端通过 `VITE_API_BASE` 或 Vite proxy 访问后端（`frontend-ui/src/services/api.ts`、`frontend-ui/vite.config.ts`）。

## 1) 一键启动（推荐）
运行（Windows）：
```powershell
./start-archradar.bat
```
脚本做的事（见 `start-archradar.bat`）：
- 启动后端：`dotnet run --project ArchRadar.Api`
- 健康检查 `/api/health`
- 注册项目 `/api/projects`
- 启动前端：`pnpm dev`（注入 `VITE_API_BASE=http://localhost:5157`）
- 打开浏览器并做 proxy health check

## 2) 手动启动
### 后端
```powershell
dotnet run --project ArchRadar.Api
```
- 端口：`http://localhost:5157`（`ArchRadar.Api/Properties/launchSettings.json`）
- 可选环境变量：
  - `ARCHRADAR_WORKSPACE`：工作区根目录（`ArchRadar.Api/Program.cs`）
  - `ARCHRADAR_EDITOR` / `ARCHRADAR_EDITOR_ARGS`：点击调用点时打开编辑器（`ArchRadar.Api/Services/EditorLauncher.cs`）

### 前端
```powershell
cd frontend-ui
pnpm install
pnpm dev
```
- `frontend-ui/vite.config.ts` 将 `/api` 代理到 `http://localhost:5157`
- 若不使用 proxy，可设置 `VITE_API_BASE`（`frontend-ui/src/services/api.ts`）

## 3) CLI 扫描
```powershell
# 扫描当前目录
 dotnet run --project ArchRadar.Cli -- .

# 指定配置文件
 dotnet run --project ArchRadar.Cli -- .\MyRepo .\MyRepo\.archradar\config.json
```
- CLI 读取配置：`.archradar/config.json` 或 `archradar.config.json`（`ArchRadar.Cli/Program.cs`）
- 输出目录：`<target>/.archradar/snapshots/<timestamp>/`（`ArchRadar.Cli/Program.cs`）

## 4) 常见问题
- 配置找不到：确认 `.archradar/config.json` 或 `archradar.config.json` 是否存在（`ArchRadar.Api/Services/ScanService.cs`、`ArchRadar.Cli/Program.cs`）。
- API 健康检查失败：确认后端进程启动，访问 `http://localhost:5157/api/health`（`ArchRadar.Api/Program.cs`）。
- 前端无法访问后端：
  - 检查 `VITE_API_BASE` 或 Vite proxy（`frontend-ui/src/services/api.ts`、`frontend-ui/vite.config.ts`）。
- 扫描结果为空：检查 `scan.excludeGlobs` 是否过滤了目标目录（`ArchRadar.Core/Scanning/DirectoryAuditScanner.cs`、`ArchRadar.Core/Scanning/GlobMatcher.cs`）。
- 点击调用点无法打开编辑器：设置 `ARCHRADAR_EDITOR` 与 `ARCHRADAR_EDITOR_ARGS`（`ArchRadar.Api/Services/EditorLauncher.cs`）。

## 5) 调试入口
- 后端请求日志：`ArchRadar.Api/Program.cs` 的自定义中间件
- 扫描调试日志：`ArchRadar.Core/Diagnostics/DebugLog.cs` + `config.debugEnabled`
- 前端 API 日志（开发环境）：`frontend-ui/src/services/api.ts`

## 6) 【推测】MSBuild 扫描依赖
- 【推测】MsBuild 模式可能需要安装 VS Build Tools / MSBuild 组件，否则 `MSBuildLocator` 可能找不到实例。
  - 验证方式：运行 MsBuild 扫描并查看 `ArchRadar.Core/Scanning/MsBuildAuditScanner.cs` 输出的 DebugLog。
