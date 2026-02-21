# VS Code 插件迁移前置探查报告

> 生成时间：2026-02-09  
> 目标项目：ArchRadar

---

## 1. 项目概览

| 属性 | 值 |
|------|-----|
| 项目名称 | ArchRadar |
| 项目类型 | C# 代码架构审计与可视化工具 |
| 主要语言 | C# (.NET 10.0) + TypeScript (React) |
| 构建工具 | .NET SDK + pnpm + Vite |
| 运行模式 | 后端 API 服务 + 前端 Web UI 混合架构 |

### 核心功能列表

1. **C# 代码扫描** - 使用 Roslyn/MSBuild 分析 C# 代码结构
2. **依赖图生成** - 提取类、方法调用关系，构建依赖图
3. **Feature 规则归属** - 按命名空间/文件夹规则将代码归类到业务特性
4. **多层级 Mermaid 输出** - 生成 L0（全局）、L1（Feature级）、L2（类级）图
5. **Web 可视化预览** - 交互式 Mermaid 图预览与节点点击跳转
6. **编辑器集成** - 点击节点跳转到源码位置

---

## 2. 架构分析

### 整体架构图示

```
┌─────────────────────────────────────────────────────────────┐
│                    前端 (frontend-ui)                        │
│  React + TypeScript + Mermaid.js + Vite                     │
│  ┌────────────┬────────────┬─────────────┬───────────────┐  │
│  │ App.tsx    │ MermaidPre │ ConfigPanel │ SnapshotPanel │  │
│  │ (主控制器) │ view       │ (配置编辑)  │ (快照切换)    │  │
│  └──────┬─────┴──────┬─────┴──────┬──────┴───────┬───────┘  │
│         │            │            │              │          │
│  ┌──────▼────────────▼────────────▼──────────────▼───────┐  │
│  │                services/api.ts                         │  │
│  │          REST API 客户端 (fetch)                       │  │
│  └─────────────────────────┬─────────────────────────────┘  │
└────────────────────────────│────────────────────────────────┘
                             │ HTTP REST
                             ▼
┌─────────────────────────────────────────────────────────────┐
│               后端 API (ArchRadar.Api)                       │
│  ASP.NET Minimal API (.NET 10.0)                            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                Program.cs (路由定义)                 │    │
│  │  /api/health, /api/projects, /api/scan, /api/open   │    │
│  └─────────────────────────┬───────────────────────────┘    │
│           ┌────────────────┼────────────────────┐           │
│    ┌──────▼───────┐ ┌──────▼───────┐ ┌─────────▼────────┐   │
│    │ScanService   │ │SnapshotSvc   │ │EditorLauncher    │   │
│    │(扫描触发)    │ │(快照读取)    │ │(编辑器跳转)      │   │
│    └──────┬───────┘ └──────────────┘ └──────────────────┘   │
│           │                                                  │
└───────────│─────────────────────────────────────────────────┘
            │ 调用
            ▼
┌─────────────────────────────────────────────────────────────┐
│            核心库 (ArchRadar.Core)                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Scanning/                                              │  │
│  │  ├─ MsBuildAuditScanner (Roslyn MSBuild Workspace)    │  │
│  │  ├─ DirectoryAuditScanner (纯文件解析)                 │  │
│  │  └─ CSharpAuditWalker (语法树遍历)                     │  │
│  ├─────────────────────────────────────────────────────  │  │
│  │ Rules/ FeatureRuleEngine (Feature 规则匹配)            │  │
│  ├─────────────────────────────────────────────────────  │  │
│  │ Processing/ ExternalFoldingProcessor, L2GraphBuilder   │  │
│  ├─────────────────────────────────────────────────────  │  │
│  │ Output/ MermaidWriter, AuditJsonWriter                 │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  依赖: Microsoft.CodeAnalysis (Roslyn)                       │
│        Microsoft.Build.Locator (MSBuild 定位)                │
└─────────────────────────────────────────────────────────────┘
            │
            ▼ 读写
┌─────────────────────────────────────────────────────────────┐
│              文件系统存储                                    │
│  ├─ .archradar/config.json (项目配置)                       │
│  ├─ .archradar/snapshots/{timestamp}/                       │
│  │   ├─ audit.json (完整审计数据)                           │
│  │   ├─ L0.mmd (全局依赖图)                                 │
│  │   ├─ L1_{feature}.mmd (Feature 级图)                     │
│  │   └─ L2_{class}.mmd (类级图)                             │
│  └─ %LocalAppData%\ArchRadar\ (工作区元数据)                │
└─────────────────────────────────────────────────────────────┘
```

### 模块划分

| 模块路径 | 职责 | 技术依赖 |
|----------|------|----------|
| `ArchRadar.Core/Scanning/` | C# 代码扫描与语法分析 | Roslyn, MSBuild |
| `ArchRadar.Core/Rules/` | Feature 规则匹配引擎 | 纯 C# |
| `ArchRadar.Core/Processing/` | 图处理（折叠、分层） | 纯 C# |
| `ArchRadar.Core/Output/` | Mermaid/JSON 输出 | 纯 C# |
| `ArchRadar.Api/Services/` | 业务服务层 | ASP.NET |
| `ArchRadar.Api/Program.cs` | REST API 路由 | ASP.NET Minimal API |
| `ArchRadar.Cli/` | 命令行入口 | .NET Console |
| `frontend-ui/src/components/` | UI 组件 | React + TypeScript |
| `frontend-ui/src/services/` | API 客户端 | TypeScript fetch |

### 数据流说明

1. **扫描流程**：用户触发 → API `/scan` → `ScanService` → `Core.Scanning` → 写入 `audit.json` + `*.mmd`
2. **预览流程**：前端请求 → API `/diagram` → 读取 `.mmd` 文件 → 返回 Mermaid 文本 → 前端渲染
3. **跳转流程**：用户点击节点 → 前端解析 ID → API `/open` → `EditorLauncher` → `Process.Start(editor)`

---

## 3. 迁移评估矩阵

| 模块/功能 | 迁移策略 | 技术方案 | 工作量预估 | 风险点 |
|-----------|----------|----------|------------|--------|
| **前端 UI 整体** | 完全迁移 | VS Code WebView + 现有 React 代码 | 中 | WebView 沙箱限制、与扩展通信机制 |
| **Mermaid 预览** | 完全迁移 | WebView 内直接使用 mermaid.js | 低 | SVG 交互事件捕获 |
| **配置编辑面板** | 完全迁移 | WebView 表单 + VS Code Settings 双轨 | 中 | 需设计 WebView 与 Extension 通信协议 |
| **快照切换面板** | 完全迁移 | WebView 列表 + TreeView 备选 | 低 | 无明显风险 |
| **API 客户端层** | 重写 | VS Code Extension API 直接调用后端 | 中 | 需实现 Extension ↔ WebView 消息桥 |
| **REST API 路由层** | 不迁移 | 保留独立后端进程 | - | - |
| **ScanService** | 保留后端 | 扩展调用独立 .NET 进程 | 低 | 进程管理、生命周期 |
| **Roslyn 扫描器** | 保留后端 | 必须在 .NET 进程中运行 | - | 需 .NET SDK 环境 |
| **MSBuild 扫描器** | 保留后端 | 依赖本机 MSBuild 工具链 | - | 需 Visual Studio Build Tools |
| **Feature 规则引擎** | 保留后端 | C# 实现，非 JS 可移植 | - | - |
| **图处理逻辑** | 可考虑迁移 | 可用 TS 重写但收益有限 | 高 | 工作量大，建议保留 |
| **Mermaid 输出** | 保留后端 | 文本生成逻辑保留在 C# | - | - |
| **EditorLauncher** | 迁移 | VS Code 内置跳转 API 替代 | 低 | 原生支持反而更简单 |
| **CLI 入口** | 保留 | 可作为备用命令行工具 | - | - |
| **JSON 文件存储** | 保留 | 扩展可直接读写工作区文件 | 低 | 路径映射 |

---

## 4. 可完全迁移的模块

以下功能可以完全使用 **TypeScript + WebView** 实现：

### 4.1 前端 UI 层（整体可迁移）
- **MermaidPreview 组件** - 使用 mermaid.js 在 WebView 中渲染
- **ConfigPanel 组件** - 配置表单 UI
- **SnapshotPanel 组件** - 快照列表与切换
- **ThemePicker 组件** - 主题选择器
- **domain/mermaidIds.ts** - Mermaid ID 生成逻辑
- **domain/themeCatalog.ts** - 主题配置

### 4.2 编辑器跳转功能
- **原 EditorLauncher** → 使用 VS Code 原生 `vscode.window.showTextDocument` API
- **优势**：无需外部进程调用，直接内置支持

### 4.3 文件系统操作
- **配置文件读写** → 使用 VS Code `vscode.workspace.fs` API
- **快照目录浏览** → 使用 VS Code `vscode.workspace.fs` API

---

## 5. 需保留后端的模块

以下功能**必须保留独立 .NET 进程**执行：

### 5.1 Roslyn/MSBuild 代码分析（核心依赖）

| 组件 | 原因 |
|------|------|
| `MsBuildAuditScanner` | 依赖 `Microsoft.CodeAnalysis.Workspaces.MSBuild`，需要完整 MSBuild 工具链 |
| `CSharpAuditWalker` | 依赖 Roslyn 语法树 API，不存在 JS/WASM 等效实现 |
| `DirectoryAuditScanner` | 依赖 Roslyn 语法解析 |
| `TypeNameIndex` | 类型名称索引，与扫描器紧耦合 |
| `MSBuildLocator` | 自动定位本机 MSBuild 实例 |

### 5.2 图处理与输出

| 组件 | 原因 |
|------|------|
| `FeatureRuleEngine` | 规则匹配逻辑，C# 实现，迁移成本高于收益 |
| `ExternalFoldingProcessor` | 图处理算法，C# 实现 |
| `L2GraphBuilder` | 子图生成，C# 实现 |
| `MermaidWriter` | Mermaid 文本生成，保留在后端更高效 |
| `AuditJsonWriter` | JSON 序列化输出 |

---

## 6. 特殊环境需求

### 必须安装的运行时/工具

| 依赖 | 版本要求 | 用途 | 安装方式 |
|------|----------|------|----------|
| **.NET SDK** | 10.0+ | 运行后端扫描服务 | [官网下载](https://dot.net) |
| **Visual Studio Build Tools** | 2022+ (可选) | MsBuild 模式扫描 | VS Installer |
| **pnpm** (开发时) | - | 前端构建 | 仅开发环境 |

### 跨平台兼容性

| 平台 | 支持状态 | 备注 |
|------|----------|------|
| Windows | ✅ 完全支持 | 主要开发平台 |
| macOS | ⚠️ 需验证 | .NET SDK 可用，MSBuild 可能需额外配置 |
| Linux | ⚠️ 需验证 | .NET SDK 可用，MSBuild 需 Mono 或 .NET SDK 内置 |

### 扩展运行时检测建议

VS Code 扩展应在激活时检测：
1. `dotnet --version` - 确认 .NET SDK 可用
2. 后端进程 health check - 确认服务启动成功

---

## 7. 建议的插件架构

```
┌────────────────────────────────────────────────────────────────┐
│                VS Code Extension (ArchRadar)                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Extension Host (TypeScript)                  │  │
│  │  ├─ extension.ts (激活入口、命令注册)                     │  │
│  │  ├─ BackendManager.ts (后端进程管理)                      │  │
│  │  │   └─ spawn/kill ArchRadar.Api 或 ArchRadar.Cli        │  │
│  │  ├─ ApiClient.ts (HTTP 调用后端)                          │  │
│  │  ├─ SnapshotTreeProvider.ts (TreeView: 快照列表)          │  │
│  │  ├─ ConfigEditorProvider.ts (自定义编辑器: 配置)          │  │
│  │  └─ commands/ (命令实现)                                  │  │
│  │       ├─ scanProject.ts (触发扫描)                        │  │
│  │       ├─ openDiagram.ts (打开图表)                        │  │
│  │       └─ goToSource.ts (跳转源码)                         │  │
│  └─────────────────────────┬────────────────────────────────┘  │
│                            │ postMessage / acquireVsCodeApi    │
│  ┌─────────────────────────▼────────────────────────────────┐  │
│  │              WebView Panel (React + TS)                   │  │
│  │  ├─ 复用现有 frontend-ui 大部分代码                       │  │
│  │  ├─ MermaidPreview (交互式图表)                           │  │
│  │  ├─ ConfigPanel (配置编辑)                                │  │
│  │  └─ 通过 vscode.postMessage 与 Extension Host 通信        │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
                             │
                             │ HTTP (localhost)
                             ▼
┌────────────────────────────────────────────────────────────────┐
│            后端进程 (保持现有架构)                              │
│  方案 A: 保留 ArchRadar.Api (Web API 模式)                     │
│  方案 B: 使用 ArchRadar.Cli (CLI 模式，按需调用)               │
│  方案 C: 混合模式 (轻量操作用 CLI，复杂操作用 API)             │
└────────────────────────────────────────────────────────────────┘
```

### 推荐采用方案 A（API 模式）

**理由**：
1. 现有后端已稳定运行，无需大改
2. API 模式支持状态保持和多次请求
3. 前端代码复用率最高
4. 扫描是异步长时操作，API 模式便于状态查询

### 关键通信设计

```typescript
// Extension → WebView
webview.postMessage({ type: 'updateSnapshot', data: snapshotData });

// WebView → Extension
window.vscode.postMessage({ type: 'goToSource', file: path, line: 10 });
```

---

## 8. 迁移优先级建议

### 阶段 1：基础框架 (1-2 周)

| 任务 | 优先级 | 说明 |
|------|--------|------|
| 创建 VS Code 扩展脚手架 | P0 | yo code 生成 TypeScript 扩展模板 |
| 实现后端进程管理 | P0 | spawn/kill ArchRadar.Api 进程 |
| 实现基础 WebView 容器 | P0 | 显示简单 HTML 页面 |
| 迁移 MermaidPreview 组件 | P0 | 验证 WebView 内 mermaid.js 可用 |

### 阶段 2：核心功能 (2-3 周)

| 任务 | 优先级 | 说明 |
|------|--------|------|
| 实现 Extension ↔ WebView 消息协议 | P0 | 定义消息类型和数据结构 |
| 迁移快照面板功能 | P1 | SnapshotPanel → TreeView 或 WebView |
| 实现扫描命令 | P1 | 调用后端 `/scan` API |
| 实现图表查看命令 | P1 | 获取并渲染 Mermaid 图 |
| 实现源码跳转 | P1 | 替代 EditorLauncher，使用 VS Code API |

### 阶段 3：配置与增强 (1-2 周)

| 任务 | 优先级 | 说明 |
|------|--------|------|
| 迁移 ConfigPanel | P2 | 配置编辑 UI |
| 添加 VS Code Settings 集成 | P2 | 可选：支持 VS Code 原生设置 |
| 主题适配 | P2 | 适配 VS Code 主题 |
| 状态栏显示 | P3 | 显示后端状态、扫描进度 |

### 阶段 4：打磨与发布 (1 周)

| 任务 | 优先级 | 说明 |
|------|--------|------|
| 错误处理与用户提示 | P1 | 后端不可用时的 fallback |
| 自动检测 .NET SDK | P1 | 激活时检测环境 |
| 文档与 README | P2 | 使用说明 |
| 发布到 VS Code Marketplace | P2 | 打包发布 |

---

## 9. 潜在风险与注意事项

### 高风险项

| 风险 | 描述 | 缓解措施 |
|------|------|----------|
| **后端进程管理** | 进程启动失败、僵尸进程、端口冲突 | 实现健康检查、进程监控、端口动态分配 |
| **WebView 沙箱限制** | WebView 无法直接访问文件系统、无法使用 Node.js API | 所有 I/O 通过 Extension Host 代理 |
| **Roslyn 依赖** | 无法在 JS/WASM 中运行 Roslyn | 接受后端依赖，不尝试前端移植 |

### 中等风险项

| 风险 | 描述 | 缓解措施 |
|------|------|----------|
| **跨平台 MSBuild** | macOS/Linux 上 MSBuild 可能不可用或行为不同 | 提供 DirectoryOnly 模式 fallback |
| **React 代码复用度** | 现有代码可能需要适配 WebView 环境 | 隔离平台相关代码，使用抽象层 |
| **大型项目扫描性能** | 扫描大型 C# 项目可能耗时较长 | 实现进度反馈、取消机制 |

### 低风险项

| 风险 | 描述 | 缓解措施 |
|------|------|----------|
| **mermaid.js 兼容性** | 特殊图表可能渲染异常 | 沿用现有版本，测试覆盖 |
| **配置格式变更** | 需兼容现有配置文件 | 保持配置格式不变 |

---

## 附录：技术栈映射参考

| 原技术 | VS Code 迁移方案 |
|--------|------------------|
| React + Vite 前端 | WebView + 复用组件代码 |
| ASP.NET Minimal API | 保留独立进程 |
| Roslyn Workspace | 保留 .NET 进程调用 |
| MSBuild Locator | 保留 .NET 进程调用 |
| 文件系统存储 | Extension 使用 `vscode.workspace.fs` |
| `Process.Start()` 编辑器跳转 | `vscode.window.showTextDocument` |
| 浏览器 fetch API | Extension 使用 Node.js HTTP 或 fetch |

---

## 总结

ArchRadar 是一个**前后端分离的混合架构**工具：

- **前端 (React + TS)**：可完全迁移到 VS Code WebView，复用率高
- **后端 (C# + Roslyn)**：必须保留独立进程，无法迁移到 TS/WebView

**推荐迁移策略**：
1. 保留后端 API 服务不变
2. 将前端 UI 迁移到 WebView
3. 使用 Extension Host 管理后端进程和通信
4. 利用 VS Code 原生 API 增强用户体验（如源码跳转、TreeView）

**预计总工作量**：5-8 周（1 人）

**迁移收益**：
- 深度集成 VS Code 编辑器体验
- 无需单独启动 Web 服务
- 更好的多工作区支持
- 可发布到 VS Code Marketplace
