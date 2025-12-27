# TODO_NEXT（最安全的下一步开发方式）

- TL;DR
- 先沿着“API → Core → UI”既有链路扩展，避免改动核心数据模型的序列化格式。
- 新功能落点优先放在 `ArchRadar.Api/Program.cs`（API）与 `frontend-ui/src/services/api.ts`（客户端）。
- 扫描能力变化集中在 `ArchRadar.Core/`，其余层只做参数传递和结果展示。
- 配置字段扩展需要同步更新 Core 配置模型 + 默认配置 + 前端表单。

## 可执行的低风险下一步
1) 新增/扩展 API 接口
- 后端：在 `ArchRadar.Api/Program.cs` 增加 `app.MapGet/MapPost` 路由
- DTO：补充 `ArchRadar.Api/Models/*`
- 前端：同步在 `frontend-ui/src/services/api.ts` + `frontend-ui/src/domain/types.ts`
- 若需 mock：补充 `frontend-ui/src/services/mockApi.ts`

2) 扩展扫描配置字段
- Core 模型：`ArchRadar.Core/Config/ArchRadarConfig.cs`
- 默认配置：`ArchRadar.Api/Services/ProjectConfigService.cs#CreateDefaultConfig`
- 前端类型：`frontend-ui/src/domain/types.ts`
- UI 表单：`frontend-ui/src/components/ConfigPanel.tsx`

3) 调整扫描逻辑或规则归属
- 扫描入口：`ArchRadar.Core/Scanning/DirectoryAuditScanner.cs` / `MsBuildAuditScanner.cs`
- 节点/边抽取：`ArchRadar.Core/Scanning/CSharpAuditWalker.cs`
- Feature 归属规则：`ArchRadar.Core/Rules/FeatureRuleEngine.cs`
- 对应 UI 展示无需改动，除非字段结构变化（`frontend-ui/src/domain/types.ts`）

4) 新增图输出或层级
- 输出实现：`ArchRadar.Core/Output/MermaidWriter.cs`
- 触发写出：`ArchRadar.Api/Services/ScanService.cs` + `ArchRadar.Cli/Program.cs`
- UI 加载层级：`frontend-ui/src/app/App.tsx`（`getLayers/getDiagram` 调用链）

5) 增强 UI 交互/检视能力
- 交互入口：`frontend-ui/src/components/MermaidPreview/MermaidPreview.tsx`
- 数据映射：`frontend-ui/src/domain/auditMapping.ts`
- 展示面板：`frontend-ui/src/app/App.tsx`（Inspector 区域）
