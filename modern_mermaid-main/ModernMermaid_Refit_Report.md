# Modern Mermaid 改造前瞻报告（面向 ArchRadar v2）

## 1. 现有项目概况（Modern Mermaid）
- 技术栈：Vite + React + TypeScript + Tailwind + Mermaid.js + html-to-image。
- 入口链路：`src/main.tsx` → `src/App.tsx` → `src/components/Layout.tsx`。
- 核心渲染链路：Layout 维护 `code` 字符串 → `src/components/Preview.tsx` 调用 `mermaid.render` → SVG 字符串 `dangerouslySetInnerHTML` 注入 → 基于 DOM 做缩放/拖拽/导出/颜色标注。
- 交互特征：以“渲染后绑定”为主（右键节点取 DOM id），但目前仅用于节点颜色选择，并非业务级交互。

## 2. 代码架构速览（核心模块）
### 2.1 入口与全局状态
- `src/main.tsx`：应用入口，挂载根组件。
- `src/App.tsx`：包裹 DarkMode 与 Language Provider，渲染 `Layout`。
- `src/contexts/DarkModeContext.tsx`：暗色模式开关（localStorage）。
- `src/contexts/LanguageContext.tsx`：多语言与 URL 参数管理（localStorage + URL）。
- `src/config/analytics.ts` + `src/components/GoogleAnalytics.tsx`：GA 追踪（可裁剪）。

### 2.2 UI 主骨架
- `src/components/Layout.tsx`：
  - 负责主页面布局（左编辑器、右预览）。
  - 管理核心状态：`code`、主题、背景、字体、标注、全屏、URL 分享等。
  - 这是项目的“顶层工作台”，后续工作台模式、Inspector、项目/快照管理等需在此拆/重构。

### 2.3 Mermaid 渲染与交互核心
- `src/components/Preview.tsx`：
  - Mermaid 初始化与 `render`，输出 SVG 字符串。
  - 缩放/拖拽/重渲染、导出、复制、主题注入、字体注入。
  - 右键节点通过 DOM id 解析节点名 → 颜色选择器（`nodeColors` CSS hack）。
  - 标注层（AnnotationLayer）与 SVG 覆盖层协作。
  - 这是最关键的深度改造点：后续所有“点击/下钻/Inspector/callsite/overlay”都需要在此完成“渲染后绑定”。

### 2.4 编辑与示例
- `src/components/Editor.tsx`：自研文本编辑器（高亮 + 行号）。
- `src/components/ExampleSelector.tsx` + `src/utils/examples.ts`：示例选择（后续会被“项目/快照选择”替代）。
- `src/utils/compression.ts`：分享 URL 压缩/解压（与 snapshot 模式冲突，需取舍）。

### 2.5 UI 组件与体验能力
- `src/components/Toolbar.tsx`：主题、背景、字体、导出、复制、标注工具。
- `src/components/AnnotationLayer.tsx` + `src/types/annotation.ts`：标注层。
- `src/utils/themes.ts` / `src/utils/backgrounds.ts` / `src/utils/fonts.ts`：视觉底座（需尽量保留）。
- `vite.config.ts`：PWA 插件与缓存策略（本地后端集成时需评估缓存副作用）。

## 3. 与 v2 目标对照（差距与缺口）
- 目标需要“Workspace / 项目 / 快照 / 层级浏览 / Inspector / Open-in-Editor”。
- 现状仍是“单页 Mermaid 编辑器”，缺少：
  - 数据入口（snapshot 与 audit/index/lint 的读取与管理）。
  - 后端 API 通道与类型模型。
  - 节点/边稳定 ID 与点击绑定策略。
  - Inspector 视图与 callsites 列表。
  - L0/L1/L2 切换与导航。

## 4. 深度改造/整合模块清单（必须重点动）
1) `src/components/Layout.tsx`
   - 现有“编辑器 + 预览”布局需要替换为“工作台/项目/快照”骨架。
   - 需要引入：Workspace 入口页、项目列表、快照时间线、图层级树、Inspector 面板。

2) `src/components/Preview.tsx`
   - 需要从“渲染结果展示”升级为“渲染 + 业务交互入口”。
   - 关键改造：
     - 渲染后绑定节点/边事件（单击/双击/右键）。
     - 将节点/边与 audit.json 的稳定 ID 映射。
     - 重渲染后重新绑定（主题/缩放/切图均不丢）。
     - 接入 lint overlay 与 Inspector 高亮。

3) `src/components/Editor.tsx`
   - 从“输入 Mermaid 文本”转为“可选编辑模式/只读预览”。
   - 可能改成：高级模式开关，或用于源码预览（Open-in-Editor 失败兜底）。

4) `src/components/ExampleSelector.tsx` + `src/utils/examples.ts`
   - 示例选择与 snapshot 模式冲突，基本需要替换为“项目/快照选择器”。

5) `src/utils/compression.ts`
   - 目前用于分享链接（c/bg/font/theme），与快照驱动模型冲突。
   - 要么废弃，要么转为“快照 ID/项目 ID”型 URL 路由。

6) `vite.config.ts`（PWA）
   - CacheFirst 可能缓存 API / SVG / JSON，影响本地 workspace 动态更新。
   - 需要评估是否关闭或对 API/JSON 走 NetworkFirst。

## 5. 关键接口与建议分层（改造切点）
建议新增分层（便于对接 .NET 后端）：
- `src/services/backend.ts`：封装 API（projects/snapshots/audit/lint/open-in-editor）。
- `src/types/workspace.ts`：项目/快照/节点/边/调用点数据结构。
- `src/contexts/WorkspaceContext.tsx` 或 `src/hooks/useWorkspace.ts`：全局状态（项目/快照/层级）。
- `src/components/WorkspaceLayout.tsx`：替代 Layout 的工作台主壳。
- `src/components/Inspector.tsx`：节点/边详情视图。

关键交互入口（需要在 Preview 级别暴露回调）：
- `onNodeClick(nodeId)` → 查 audit.json → Inspector / 下钻
- `onNodeDoubleClick(nodeId)` → L0→L1 / L1→L2
- `onEdgeClick(edgeId)` → edgeKind + callsites
- `onCallsiteClick(file/line/col)` → backend open-in-editor

## 6. 技术难点/风险点
- 稳定 ID：Mermaid 渲染后的 DOM id 目前含随机/计数后缀，稳定性不足。
  - 必须依赖生成侧注入稳定 nodeId（v2 设计要求）。
  - 可能需要在渲染后为节点补 `data-node-id`，或约定节点 ID 规则并解析 DOM。
- 重渲染后交互不丢：当前 `Preview` 只在右键时解析 DOM，缺少系统化 bind/unbind。
- 多图类型兼容：不同图类型（flowchart/state/sequence 等）节点结构差异大，事件绑定策略要统一。
- PWA 缓存干扰：本地服务数据更新与离线缓存可能冲突。
- 性能：L1/L2 图可能很大，频繁重渲染与 DOM 扫描需优化（节流/增量绑定）。

## 7. 实现难度评估
- 总体难度：中到偏高。
  - 前端 UI 重构（中）：替换 Layout、增加 Workspace/Inspector。
  - 渲染绑定与稳定 ID（高）：涉及 Mermaid DOM 结构、重渲染、交互一致性。
  - 后端联调（中）：API 通道 + Open-in-Editor。
  - lint overlay（中）：可复用 CSS hack 或 overlay 层，但需与 Inspector 协同。

---

附：关键路径文件索引（便于快速定位）
- `src/components/Layout.tsx`
- `src/components/Preview.tsx`
- `src/components/Editor.tsx`
- `src/components/ExampleSelector.tsx`
- `src/components/Toolbar.tsx`
- `src/utils/themes.ts`
- `src/utils/backgrounds.ts`
- `src/utils/fonts.ts`
- `src/utils/compression.ts`
- `vite.config.ts`
