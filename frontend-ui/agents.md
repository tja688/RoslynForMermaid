## 给本地 AI 的开发提示词（切法 A / 新项目 MVP）

你是资深前端工程师。目标：从 Modern Mermaid 仓库中 **vendor copy** 出“主题/背景/字体 + Mermaid Preview 渲染引擎（含基础导出）”，构建一个 **全新的最小前端项目** （React + Vite + Tailwind），要求能独立运行并完成最小验证（MVP）。后续这个前端必须能无负担对接 .NET 后端（HTTP API），因此请在架构上明确分层、接口稳定、避免与任何现代编辑器/URL 分享功能耦合。

### A. 输入条件

* 本机已有 Modern Mermaid 源码目录：C:\Users\jinji\Tools\ArchRadar\modern_mermaid-main
* 本机有一个React/Vite/Tailwind空环境的新项目根：C:\Users\jinji\Tools\ArchRadar\frontend-ui
* 允许使用 React/Vite/Tailwind（优先减少样式清理工作，已创建最小React/Vite/Tailwind项目环境并完成最小可行验证）
* 不要求复刻 Modern Mermaid 全部 UI，只要求复用它的主题资产与渲染体验

### B. 最终交付物（必须满足）

1. 新项目可运行：`pnpm dev` 后浏览器可打开并看到页面。
2. 页面可选择主题（至少 3 个主题：例如 Cyberpunk / Handdrawn / Spotless 或同等），切换后渲染风格明显变化（背景+字体+mermaid 变量生效）。
3. 页面能渲染一段 Mermaid（默认内置 demo mmd）。
4. 页面能从“后端 API”加载 Mermaid 文本（后端暂时用 mock/fetch，本提示词要求你实现接口层与 mock 返回），并可切换“demo/local/mock”三种数据源。
5. 基础导出能力至少完成一种：导出 SVG 或导出 PNG（二选一，优先继承 Modern Mermaid 的实现方式）。
6. 代码结构必须为后续 .NET 对接准备：所有后端交互集中在 `src/services/api.ts`（或同级），不要在组件里散写 fetch。

### C. 必须复用（vendor copy）的东西（来源 Modern Mermaid）

你需要从 `<MM_ROOT>/src/` 中复制并在新项目里调整导入路径，使它们能工作：

**主题/背景/字体资产：**

* `utils/themes.ts`
* `utils/backgrounds.ts`
* `utils/fonts.ts`
* `fonts.css`（以及 fonts.css 引用的字体资源；若是 remote woff2，先保持 remote 也可，但请把它改造成“未来可本地化”的结构：所有字体入口集中到一个文件/常量）

**渲染引擎核心：**

* 以 Modern Mermaid 的 `Preview.tsx` 作为“渲染引擎壳”的参考/基础：保留 `mermaid.initialize + mermaid.render + SVG 注入 + 错误处理 +（如果存在）导出逻辑`

  你可以复制 Preview 相关文件/工具函数（比如 panzoom/export 相关 util），但请把 Preview 改造成更通用的“纯组件 API”（见下一条）。

### D. 关键改造要求（决定是否“切蛋糕成功”）

#### D1) 把 Preview 改为“纯组件 API”（必须）

新项目中的 `MermaidPreview` 组件必须只依赖 props，不得依赖 router/store/全局业务状态。要求：

`<MermaidPreview code themeKey backgroundKey fontKey renderOptions onError onNodeEvent />`

* `code`: mermaid 文本
* `themeKey/backgroundKey/fontKey`: 来自 theme catalog
* `renderOptions`: 例如 `securityLevel`, `maxTextSize`, `suppressErrors`（可以先少量）
* `onError`: 渲染错误回调（UI 用 toast/面板展示都行）
* `onNodeEvent`: 预留（后续我们要做 L0/L1/L2 点击绑定，这里先暴露事件接口，内部暂时不实现或只打日志）

渲染逻辑必须做到：

* 当 `code/theme/background/font` 变化时会触发重渲染
* 重渲染后不会让页面崩溃；错误可见、可恢复（换回 demo code 能恢复）

#### D2) 主题应用策略（必须）

* Mermaid 主题变量通过 `mermaid.initialize({ themeVariables, themeCSS, ... })` 生效
* 背景通过 preview 容器的 style/class 生效（建议保留 Tailwind，避免清理）
* 字体确保渲染内容（SVG 内）也能使用对应字体：保留 Modern Mermaid 的“注入 fontFamily 或在 SVG 加 style”策略

#### D3) 导出策略（MVP 最少完成一个）

* 优先复用 Modern Mermaid 的导出方式（如果它用 html-to-image，就沿用）
* MVP 可只做 “Export SVG”（最稳定）或 “Export PNG”（更讨喜但更坑）
* 导出时必须保持当前背景/主题（至少背景色/图本身风格不丢）

#### D4) 后端对接契约（必须先定死）

为了后续 .NET 后端无负担接入，你必须在新项目里实现如下“假后端 API 客户端层”，并写好接口类型：

* `GET /api/health` -> `{ ok: true, version: string }`
* `GET /api/projects` -> `[{ projectId, name }]`（MVP 可 mock）
* `GET /api/projects/{projectId}/snapshots` -> `[{ snapshotId, timestamp, label? }]`（MVP mock）
* `GET /api/projects/{projectId}/snapshots/{snapshotId}/layers` -> `{ layers: ["L0","L1:featureA","L2:xxx"] }`（MVP mock）
* `GET /api/.../diagram?layer=...` -> `{ mmd: string }`（MVP 实现真正使用这个接口来渲染）

要求：

* 所有 fetch 集中到 `src/services/api.ts`
* 支持 baseUrl（例如 `VITE_API_BASE`）
* UI 启动时先调用 `health`，失败则显示“后端未启动（使用 demo 模式）”
* MVP 允许 fallback：后端不可用时仍可渲染 demo mmd

### E. 新项目推荐目录结构（必须按此组织）

<pre class="overflow-visible! px-0!" data-start="3269" data-end="3669"><div class="contain-inline-size rounded-2xl corner-superellipse/1.1 relative bg-token-sidebar-surface-primary"><div class="sticky top-[calc(--spacing(9)+var(--header-height))] @w-xl/main:top-9"><div class="absolute end-0 bottom-0 flex h-9 items-center pe-2"><div class="bg-token-bg-elevated-secondary text-token-text-secondary flex items-center gap-4 rounded-sm px-2 font-sans text-xs"></div></div></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre!"><span><span>src/
  app/
    App.tsx
    routes/ (可选)
  components/
    MermaidPreview/
      MermaidPreview.tsx
      previewExport.ts (若存在)
      previewPanZoom.ts (若存在)
      </span><span>index</span><span>.ts
    ThemePicker.tsx
    SnapshotPanel.tsx (MVP 可极简)
  services/
    api.ts
    mockApi.ts (可选)
  </span><span>domain</span><span>/
    themeCatalog.ts (从 themes/backgrounds/fonts 组合出统一 catalog)
    </span><span>types</span><span>.ts
  styles/
    fonts.css
    </span><span>index</span><span>.css
</span></span></code></div></div></pre>

### F. MVP 页面功能（必须可验收）

页面布局（不追求好看，但要清晰）：

* 左侧：数据源选择（Demo / API）、项目/快照选择（MVP 可用 mock）
* 顶部：主题/背景/字体选择下拉
* 中央：MermaidPreview 画布
* 右侧（或底部）：错误面板（显示渲染错误文本）
* 一个按钮：Export（SVG/PNG）

### G. 验收标准（你必须逐条自测并写入报告）

1. `pnpm dev` 可运行；无红屏错误
2. 切换至少 3 个主题，背景/字体/图风格变化明显
3. Demo mmd 渲染成功（例如 flowchart）
4. 切换到 API 模式：mock 返回不同 mmd，渲染会更新
5. 输入非法 mmd：错误显示；切回合法 mmd 可恢复
6. 导出成功（生成文件并触发下载/保存）
7. 代码里没有任何组件直接写死后端 URL；全部走 `api.ts`，且支持环境变量 baseUrl

### H. 你需要输出给我的内容（最终回复里必须包含）

* 新项目的启动方式（依赖、命令、端口）
* 你从 Modern Mermaid 复制了哪些文件（路径列表）
* 你改造了 MermaidPreview 的哪些关键点（用文字描述，不要贴大段代码）
* 当前 MVP 支持哪些主题/背景/字体（列出 key）
* 已实现的 API 契约列表（和我上面一致）
* 已知风险/后续 TODO（例如：字体本地化、导出在某些浏览器问题）

现在开始执行。目标是“最小可运行 + 可持续扩展 + 后端对接无负担”。
