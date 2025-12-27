# 代码地图（MAP）

- TL;DR
- 扫描核心在 `ArchRadar.Core/`；API/CLI 只是调用与输出编排。
- API 路由全部在 `ArchRadar.Api/Program.cs`，不要到处找 Controller。
- 前端主逻辑集中在 `frontend-ui/src/app/App.tsx`，组件在 `frontend-ui/src/components/`。
- 配置与规则模型在 `ArchRadar.Core/Config/`，UI 编辑入口在 `frontend-ui/src/components/ConfigPanel.tsx`。

## 顶层目录
- `ArchRadar.Api/`：后端最小 API + 服务层
- `ArchRadar.Core/`：扫描、规则与输出
- `ArchRadar.Cli/`：CLI 扫描入口
- `frontend-ui/`：React + Vite 前端
- `.archradar/`：本仓库扫描配置示例
- `start-archradar.bat`：一键启动脚本

## 后端（API）
- 路由与中间件：`ArchRadar.Api/Program.cs`
- 服务层：`ArchRadar.Api/Services/`
  - 项目注册/更新：`ProjectCatalogService.cs`
  - 扫描与输出：`ScanService.cs`
  - 配置读写：`ProjectConfigService.cs`
  - 快照读取：`SnapshotService.cs`
  - JSON 文件存储：`JsonFileStore.cs`
- DTO：`ArchRadar.Api/Models/*`

## 核心库（扫描与图生成）
- 扫描入口：`ArchRadar.Core/Scanning/DirectoryAuditScanner.cs`、`MsBuildAuditScanner.cs`
- 语法树遍历与边/节点抽取：`ArchRadar.Core/Scanning/CSharpAuditWalker.cs`
- 规则归属：`ArchRadar.Core/Rules/FeatureRuleEngine.cs`
- 图处理：`ArchRadar.Core/Processing/ExternalFoldingProcessor.cs`、`L2GraphBuilder.cs`
- 输出：`ArchRadar.Core/Output/MermaidWriter.cs`、`AuditJsonWriter.cs`
- 模型：`ArchRadar.Core/Models/*`

## CLI
- 入口与输出：`ArchRadar.Cli/Program.cs`

## 前端
- 应用入口：`frontend-ui/src/main.tsx`
- 主页面逻辑：`frontend-ui/src/app/App.tsx`
- API client：`frontend-ui/src/services/api.ts`
- Mock client：`frontend-ui/src/services/mockApi.ts`
- Mermaid 预览与交互：`frontend-ui/src/components/MermaidPreview/MermaidPreview.tsx`
- 面板组件：`frontend-ui/src/components/SnapshotPanel.tsx`、`ConfigPanel.tsx`、`ThemePicker.tsx`
- 数据与映射：`frontend-ui/src/domain/types.ts`、`frontend-ui/src/domain/auditMapping.ts`、`frontend-ui/src/domain/mermaidIds.ts`

## 去哪改（快速索引）
- 改扫描逻辑：`ArchRadar.Core/Scanning/*` + `ArchRadar.Core/Rules/FeatureRuleEngine.cs`
- 改输出结构：`ArchRadar.Core/Output/*` + `ArchRadar.Api/Services/ScanService.cs`
- 新增 API：`ArchRadar.Api/Program.cs` + `ArchRadar.Api/Models/*` + `frontend-ui/src/services/api.ts`
- 改 UI 交互：`frontend-ui/src/app/App.tsx` + `frontend-ui/src/components/*`
