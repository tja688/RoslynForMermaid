# ArchRadar — 项目总览

- TL;DR
- 本仓库包含后端 API + CLI + 核心扫描库 + 前端 UI 四块（`ArchRadar.Api/`, `ArchRadar.Cli/`, `ArchRadar.Core/`, `frontend-ui/`）。
- 核心能力是扫描 C# 代码并生成审计图（audit.json）与 Mermaid 分层图（L0/L1/L2）（`ArchRadar.Core/` + `ArchRadar.Api/Services/ScanService.cs` + `ArchRadar.Cli/Program.cs`）。
- 后端以最小 API 暴露 `/api/*`，并可直接托管 `frontend-ui/dist` 静态资源（`ArchRadar.Api/Program.cs`）。
- 前端是单页 React + Vite 应用，通过 `frontend-ui/src/services/api.ts` 调用后端；也支持 demo/mock 数据源（`frontend-ui/src/app/App.tsx`）。

## 项目目标（1-2 句）
ArchRadar 是一个面向 C# 项目的架构扫描与可视化工具：扫描目录或 .sln，构建调用/依赖图，并输出 Mermaid 视图供 UI 展示与交互（`ArchRadar.Core/Scanning/*`、`ArchRadar.Core/Output/*`、`frontend-ui/src/components/MermaidPreview/MermaidPreview.tsx`）。

## 仓库结构速览（最多两层）
- `ArchRadar.Api/`
  - `Program.cs`：后端入口与路由（最小 API）
  - `Services/`：扫描、配置、项目与快照管理
  - `Models/`：请求/响应 DTO
- `ArchRadar.Core/`
  - `Scanning/`：C# 解析与扫描
  - `Processing/`：外部折叠、L2 图构建
  - `Output/`：audit.json + Mermaid 写出
  - `Config/`：扫描配置模型与加载
- `ArchRadar.Cli/`
  - `Program.cs`：CLI 扫描入口
- `frontend-ui/`
  - `src/app/App.tsx`：UI 主逻辑
  - `src/services/`：API / mock client
  - `src/components/`：面板与 Mermaid 预览
- `.archradar/`
  - `config.json`：本仓库扫描规则示例
- `start-archradar.bat`：一键启动脚本（后端 + 前端 + 自动注册，扫描需手动触发）
- `logs/`：启动脚本日志输出目录

## 主要入口
- 后端入口：`ArchRadar.Api/Program.cs`（`WebApplication.CreateBuilder` + `app.MapGet/MapPost`）
- CLI 入口：`ArchRadar.Cli/Program.cs`（`RunScanAsync` 及输出写入）
- 前端入口：`frontend-ui/src/main.tsx` + `frontend-ui/src/app/App.tsx`

## 数据与输出位置
- API 的工作区根目录来自 `ARCHRADAR_WORKSPACE` 环境变量；未配置时使用 `LocalApplicationData/ArchRadar`（`ArchRadar.Api/Program.cs`）。
- 目录结构由 `WorkspacePaths` 定义：
  - `catalog.json`：项目列表
  - `projects/{projectId}/profile.json`：项目配置
  - `projects/{projectId}/snapshots/{snapshotId}/index.json` + `audit.json` + `L0/L1/L2.mmd`（`ArchRadar.Api/Services/WorkspacePaths.cs`）。

## 快速开始
- 优先使用 `start-archradar.bat` 自动启动后端/前端（脚本内容见 `start-archradar.bat`，扫描需在 UI 手动触发）。
- 手动启动与常见问题见 `docs/RUNBOOK.md`。

## 关键文档
- `docs/ARCHITECTURE.md`：架构与交互
- `docs/RUNBOOK.md`：本地启动与调试
- `docs/CONVENTIONS.md`：目录/命名/API/错误处理约定
- `docs/MAP.md`：代码地图（去哪改）
- `docs/TODO_NEXT.md`：最安全的下一步开发路径
- `docs/WORKBENCH_UX.md`：工作台 UX 更新说明
