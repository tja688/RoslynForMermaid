Built the MVP front-end with vendor-copied theme assets, a pure-prop Mermaid preview engine, and a typed API/mock layer. Core wiring lives in **App.tsx**, the render engine is in **MermaidPreview.tsx**, and backend access is centralized in **api.ts**.

**Run**

* **cd frontend-ui**
* **pnpm install**
* **pnpm dev** (Vite serves on **http://localhost:5173**, confirmed by the dev server start log)

**Vendor-Copied Files**

* **themes.ts** -> **themes.ts**
* **backgrounds.ts** -> **backgrounds.ts**
* **fonts.ts** -> **fonts.ts**
* **fonts.css** -> **fonts.css**

**MermaidPreview Key Changes**

* Converted to pure prop API with **code**, **themeKey**, **backgroundKey**, **fontKey**, **renderOptions**, **onError**, **onNodeEvent** in **MermaidPreview.tsx**.
* Re-renders on **code/theme/background/font** changes; errors are caught, surfaced, and recoverable.
* **mermaid.initialize** applies **themeVariables** + **themeCSS**, plus injected font styles inside SVG for consistent export.
* Background handling favors the chosen background style with a fallback to theme background color when needed.
* **onNodeEvent** is wired for future use (currently logs to console).

**Supported Keys**

`<span><span>themes: cyberpunk, handDrawn, spotless, linearLight, linearDark backgrounds: default, white, black, gray, blue, green, purple, gradient-blue, gradient-sunset, dots, grid, diagonal, noise, blur-blue, blur-rainbow, pop-art, memphis, cyberpunk, gradient-cosmic, kawaii, retro-wave, paper-texture, doodle, minimalist-dark, aurora, circuit-board, watercolor fonts: default, inter, mono, serif, handwriting, rounded, system </span></span>`

**API Contracts Implemented**

* **GET /api/health** -> **{ ok: true, version: string }**
* **GET /api/projects** -> **[{ projectId, name }]**
* **GET /api/projects/{projectId}/snapshots** -> **[{ snapshotId, timestamp, label? }]**
* **GET /api/projects/{projectId}/snapshots/{snapshotId}/layers** -> **{ layers: ["L0","L1:featureA","L2:xxx"] }**
* **GET /api/projects/{projectId}/snapshots/{snapshotId}/diagram?layer=...** -> **{ mmd: string }**
  All HTTP calls are centralized in **api.ts** and respect **VITE_API_BASE** from **.env.local**.

**MVP Verification**

* 1. **pnpm dev** starts: confirmed (server bound to **http://localhost:5173**).
* 1. Theme/background/font switching: wired through props and **mermaid.initialize**; not browser-verified here.
* 1. Demo MMD render: wired via editable demo text; not browser-verified here.
* 1. API mode with mock: implemented and wired to **mockApi.ts**; not browser-verified here.
* 1. Invalid MMD: editable demo text supports this and error flow is wired; not browser-verified here.
* 1. Export SVG: implemented in **previewExport.ts**; not browser-verified here.
* 1. API base URL: confirmed in **api.ts** using **VITE_API_BASE**.

**Known Risks / TODO**

* Remote fonts are still used in **fonts.css**; localizing WOFF2 is the next step.
* SVG export uses a solid background color; gradients/patterns are not preserved.
* PNG export not implemented (SVG-only MVP).
* Tailwind class-based backgrounds may be limited when dynamic; inline **bgStyle** is relied on as a fallback.

**Next Steps**

1. Hook the real .NET backend to the API layer and verify “local API” mode end-to-end.
2. Add PNG export (likely via **html-to-image**) if needed.
3. Localize font assets and update **fonts.css** to use local paths.

If you want me to run a quick UI walkthrough (theme switch + mock API + export) in the browser, tell me which display setup to use.
