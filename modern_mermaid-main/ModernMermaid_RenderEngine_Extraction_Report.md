# Modern Mermaid Render Engine Extraction Report

Scope: Extract the Mermaid rendering experience (themes, backgrounds, pan/zoom, export, error handling, post-render interaction) as a reusable engine. Line numbers are approximate and traceable in the local repo.

## 0. Method and entry trace (required for traceability)
- Entry path: `src/main.tsx` -> `src/App.tsx` -> `src/components/Layout.tsx` -> `src/components/Preview.tsx`.
- Evidence: `src/main.tsx:7-9` renders `<App />`, `src/App.tsx:9-14` renders `<Layout />`, `src/components/Layout.tsx:440-446` renders `<Preview />`.

## 1. Rendering pipeline overview (From Input to SVG/Canvas)
### 1.1 Mermaid input sources (text/state/URL)
- Default text input: `src/components/Layout.tsx:24-29` defines `defaultCode` and initializes `code` state.
- Editor input: `src/components/Editor.tsx:206-209` updates `code` via `onChange`.
- Example input: `src/components/ExampleSelector.tsx:32-48` selects example code from `src/utils/examples.ts`.
- URL share input: `src/components/Layout.tsx:276-335` calls `parseShareURL` to hydrate code/theme/background/font; `src/utils/compression.ts:75-96` handles URL params with LZ-String (`src/utils/compression.ts:1`).

### 1.2 Mermaid initialization location (initialize config)
- Global init at module load: `src/components/Preview.tsx:37-41` calls `mermaid.initialize({ startOnLoad: false, securityLevel: 'loose', suppressErrorRendering: true })`.
- Per-render init for theme/font override: `src/components/Preview.tsx:1172-1177` calls `mermaid.initialize({ ...configWithFont })` inside `renderDiagram`.

### 1.3 Render API usage (mermaid.render)
- Render call: `src/components/Preview.tsx:1178` calls `mermaid.render(id, code)` with `id = mermaid-${Date.now()}`.
- No use of `mermaid.run` found in repo; only `mermaid.render` is used for SVG output.

### 1.4 Render output landing (SVG injection vs canvas)
- Output is SVG string (not canvas) stored in state: `src/components/Preview.tsx:46` (`svg` state) and `setSvg(processedSvg)` at `src/components/Preview.tsx:1287`.
- SVG injected via `dangerouslySetInnerHTML`: `src/components/Preview.tsx:1506` on `contentRef` div.

### 1.5 Render error capture and display
- Error state: `src/components/Preview.tsx:47` (`error` state) and `setError(...)` in render try/catch (`src/components/Preview.tsx:1140-1291`).
- UI surface: error banner in preview container `src/components/Preview.tsx:1388-1392`.
- Copy/export errors also funnel into `setError`: `src/components/Preview.tsx:930-934`.

### 1.6 Call chain diagram (traceable)
```
main.tsx (createRoot)
  -> App.tsx (DarkModeProvider + LanguageProvider)
    -> Layout.tsx (state: code/theme/bg/font; event handlers)
      -> Preview.tsx (renderDiagram)
        -> mermaid.initialize (theme/font)
        -> mermaid.render(code)
        -> post-process SVG
        -> setSvg -> dangerouslySetInnerHTML
```
- Reference nodes: `src/main.tsx:7-9`, `src/App.tsx:9-14`, `src/components/Layout.tsx:29-33, 440-446`, `src/components/Preview.tsx:1140-1301, 1506`.

## 2. Theme/Background system dissection
### 2.1 Theme catalog and config shape
- Defined in `src/utils/themes.ts:3-17` (`ThemeType`, `ThemeConfig`, `themes` record).
- Each theme contains:
  - `mermaidConfig` with `themeVariables` and `themeCSS` (see `src/utils/themes.ts:25+`).
  - `bgClass` (Tailwind class) and `bgStyle` (inline CSS) for backgrounds.
  - `annotationColors` for overlay tools.

### 2.2 How theme impacts rendering
- Theme selection UI: `src/components/Toolbar.tsx:44-92` reads `themes` and invokes `onThemeChange`.
- Theme state update: `src/components/Layout.tsx:220-231` sets `currentTheme`.
- Theme propagates to render: `src/components/Layout.tsx:440-445` passes `themes[currentTheme]` into `Preview`.
- Rerender trigger: `renderDiagram` depends on `themeConfig` in `src/components/Preview.tsx:1301` effect dependencies, so theme change causes re-render.

### 2.3 Background system (styles and layering)
- Background catalog: `src/utils/backgrounds.ts:1-40` defines `BackgroundStyle[]`, including gradients and data-URI patterns.
- Selection UI: `src/components/BackgroundSelector.tsx:4-32` loads from `backgrounds` and sets selected id.
- Layering location: `src/components/Preview.tsx:75-76` computes `actualBg` and `actualBgStyle` and applies to top preview container `div` at `src/components/Preview.tsx:1379-1380`.
- Export background: `actualBgStyle` is injected into export styles in `src/components/Preview.tsx:833-859` and `src/components/Preview.tsx:1029-1059`.

### 2.4 Fonts and font assets
- Font catalog: `src/utils/fonts.ts:1-22` defines font options.
- Font selector: `src/components/FontSelector.tsx:4-32` picks from `fonts`.
- Font loading: `src/main.tsx:4` imports `src/fonts.css`; `src/fonts.css:4+` defines `@font-face` with remote URLs.
- Font injection into Mermaid: `src/components/Preview.tsx:1152-1165` sets `themeVariables.fontFamily` and injects CSS into SVG.

### 2.5 Theme assets packaging
- Theme assets are inline (CSS strings) in `src/utils/themes.ts` and background patterns in `src/utils/backgrounds.ts`.
- Fonts are remote WOFF2 URLs in `src/fonts.css`. Extracting requires either bundling these fonts locally or allowing external fetch.

## 3. Pan/Zoom/Viewport (zoom + drag)
### 3.1 Implementation approach
- No external pan/zoom library. Custom state in `src/components/Preview.tsx:80-81`.
- Transform-based approach: `contentRef` uses `transform: translate(x, y) scale(scale)` at `src/components/Preview.tsx:1501`.
- Wheel zoom: `src/components/Preview.tsx:188-199` adds wheel listener to container and updates `scale`.
- Drag pan: `src/components/Preview.tsx:529-550` updates `position` on mouse drag.

### 3.2 Fit-to-view and auto scale
- Manual reset: `handleResetZoom` uses SVG width/height or viewBox and sets scale/position at `src/components/Preview.tsx:103-178`.
- Auto-scale on new SVG: `useEffect` on `svg` at `src/components/Preview.tsx:1305-1375` recalculates scale and resets position.
- No minimap present.

### 3.3 Rerender and state persistence
- `scale`/`position` are component state, but auto-scale effect resets them on every SVG change (`svg` dependency) so not fully persistent across re-render.
- Extracted pan/zoom should expose a policy: keep transform vs. auto-fit-on-change.

### 3.4 Extraction constraints
- Relies on DOM structure: `contentRef` must contain a single `<svg>` with width/height or viewBox.
- Uses `containerRef.clientWidth/Height` and `svgElement.getAttribute` for sizing.

## 4. Export (PNG/JPG, resolution, background)
### 4.1 Export entry chain
- UI trigger: `src/components/Toolbar.tsx:236-246` invokes `onDownload`.
- Layout handler: `src/components/Layout.tsx:47-58` calls `previewRef.current.exportImage`.
- Export implementation: `src/components/Preview.tsx:943-1103`.

### 4.2 Implementation details
- Library: `html-to-image` (`toPng`, `toJpeg`) imported at `src/components/Preview.tsx:3` and used at `src/components/Preview.tsx:1086-1092`.
- High-res export: `exportScale = 3` at `src/components/Preview.tsx:1027` with `pixelRatio` in params.
- Background control: `actualBgStyle` applied unless transparent (`src/components/Preview.tsx:1029-1059`).
- Text style fixups: before export, computed styles are applied to SVG text and foreignObject elements (`src/components/Preview.tsx:965-1016`).
- Output: creates `link` and triggers download via `link.click()` (`src/components/Preview.tsx:1103`).

### 4.3 Copy to clipboard (related to export)
- Clipboard pipeline uses `toPng` and `navigator.clipboard.write` (`src/components/Preview.tsx:744-921`).
- Uses `ClipboardItem` and fetches dataUrl -> blob (`src/components/Preview.tsx:906-919`).

### 4.4 Extraction constraints and browser limitations
- `html-to-image` relies on SVG + foreignObject rendering in browser; may have cross-origin font issues.
- Clipboard API requires secure context (https/localhost) and user gesture.

## 5. Post-render interaction mechanism
### 5.1 DOM-based node targeting
- Right-click handler: `src/components/Preview.tsx:555-632` walks DOM tree to identify node elements and parse IDs via regex (flowchart/state/actor/etc).
- Selected node id stored in state: `src/components/Preview.tsx:58-59` and updated in `handleContextMenu`.

### 5.2 No Mermaid click directives
- No `click` directive usage found; interaction is post-render DOM traversal.

### 5.3 Node color mutation strategy
- For flowchart: edits Mermaid source by inserting `style` directive (`src/components/Preview.tsx:681-724`).
- For other diagrams: uses CSS hack via `nodeColors` and injects style tag into SVG (`src/components/Preview.tsx:1259-1266`).

### 5.4 Can be generalized to stable nodeId mapping
- The current matcher assumes Mermaid DOM ids with prefixes/suffixes.
- For a general engine, inject a stable `data-node-id` during SVG post-processing, or map Mermaid ids to stable ids before binding. Current logic in `handleContextMenu` is the place to hook a stable id map.

## 6. Dependency and extraction boundary analysis (most important)
### 6.1 Minimal reusable core modules (suggested boundaries)
1) MermaidRenderer
- Input: `code: string`, `themeConfig: ThemeConfig`, `fontFamily?: string`, `nodeColors?: Record`, `renderKey?: number`.
- Output: `svg: string`, `error?: string`.
- Dependencies: `mermaid` (render + initialize), debounce timer, DOM-free except for post-process string ops.
- Current implementation anchor: `src/components/Preview.tsx:1140-1291`.
- Difficulty: medium (extractable with light refactor to pure function + hooks).

2) ThemeEngine
- Input: theme id; Output: `ThemeConfig` with `mermaidConfig`, `bgClass`, `bgStyle`, `annotationColors`.
- Dependencies: `src/utils/themes.ts` (inline CSS strings), Tailwind classes if you keep `bgClass`.
- Difficulty: low if you keep Tailwind, medium if you want CSS-in-JS or plain CSS output.

3) BackgroundEngine
- Input: background id; Output: `bgClass`, `bgStyle`.
- Dependencies: `src/utils/backgrounds.ts` and Tailwind.
- Difficulty: low, but note Tailwind dependency.

4) PanZoomEngine
- Input: containerRef + contentRef + SVG sizing; Output: `scale`, `position`, handlers (wheel + drag), `resetFit()`.
- Dependencies: DOM measurement and transform, no external libraries.
- Anchor: `src/components/Preview.tsx:80-199, 529-550, 1305-1375, 1501`.
- Difficulty: medium (DOM-dependent, must preserve the same DOM structure or adapt to a new one).

5) ExportEngine
- Input: container node, options (format, transparent, background), scale; Output: dataUrl/blob and/or download/clipboard action.
- Dependencies: `html-to-image`, `navigator.clipboard`, `ClipboardItem`, DOM styles.
- Anchor: `src/components/Preview.tsx:744-1103`.
- Difficulty: medium-high due to browser API constraints and layout coupling.

### 6.2 Internal state and structure dependencies
- `Preview` assumes:
  - a DOM container with `contentRef` containing a single SVG (for sizing and export).
  - themes/backgrounds supply Tailwind class strings.
  - export uses computed styles + inline overrides (text styling, background).
- These are hard assumptions that must be preserved or re-implemented.

### 6.3 Two extraction routes
Route A: Internal package (recommended if long-term reuse)
- Create a package (monorepo or npm) with the modules above.
- Expose React hooks/components (e.g., `useMermaidRenderer`, `usePanZoom`, `useExport`) and data catalogs (themes/backgrounds/fonts).
- Pros: clean API, testable, versioned, reusable across apps.
- Cons: upfront refactor, must de-Tailwind or document Tailwind dependency.

Route B: Vendor copy (fastest to validate)
- Copy `Preview.tsx` and supporting utils into your app, then delete UI you do not need.
- Pros: fast, minimal re-architecture.
- Cons: still coupled to Tailwind class names and current DOM assumptions; less maintainable.

## 7. Reuse landing plan (practical extraction)
### 7.1 Files to copy (minimum viable rendering engine)
- `src/components/Preview.tsx` (core render + export + pan/zoom).
- `src/utils/themes.ts` (theme catalog).
- `src/utils/backgrounds.ts` (background catalog).
- `src/utils/fonts.ts` (font catalog).
- `src/fonts.css` (font-face definitions; consider local hosting).
- Optional (only if you want these features):
  - `src/components/AnnotationLayer.tsx` + `src/types/annotation.ts` (annotation overlay).
  - `src/components/ColorPicker.tsx` (node color tooling).

### 7.2 API you need to expose in a minimal engine
- `render(mmd: string, options: { themeId, backgroundId, fontId }) -> svg string`
- `setTheme(themeId)`, `setBackground(backgroundId)`, `setFont(fontId)`
- `exportPng({ transparent, scale })`, `exportJpg({ background, scale })`
- `setPanZoomEnabled(true|false)`, `resetFit()`
- `bindNodeEvents(map: { nodeId -> handler })` (for stable id mapping)

### 7.3 DOM structure requirements
- Container element to host SVG (must allow `dangerouslySetInnerHTML`).
- Separate wrapper for pan/zoom transform (like `contentRef`) to apply translate/scale.
- Optional overlay SVG layer if annotations or hit testing are required.

### 7.4 Parts that must be rewritten
- `Layout.tsx`, `Toolbar.tsx`, `Editor.tsx`, `ExampleSelector.tsx`: UI-level features are not part of a reusable engine.
- Tailwind classes in `themes.ts`/`backgrounds.ts`: if your app does not use Tailwind, convert `bgClass` to pure inline CSS.
- URL share system (`compression.ts`) unless you want URL-based Mermaid input.

## 8. Extraction difficulty and recommendation
- Difficulty: medium-high.
  - Rendering and theme engine are straightforward to extract.
  - Pan/zoom and export are DOM-coupled and require careful porting to preserve behavior.
  - Tailwind and remote fonts are cross-cutting dependencies that reduce portability.
- Recommendation: worth extracting only if you plan to reuse in multiple projects or need long-term control. For a single app, a thin vendor copy is faster but still requires cleanup.

## 9. Minimal PoC plan (1-2 days)
Day 1:
- Create a sandbox app that mounts a simplified `Preview` with only `code`, `themeConfig`, `background`, `font` props.
- Verify: `mermaid.render` -> SVG injection works; theme switching re-renders correctly.
- Verify: pan/zoom works and reset-fit produces reasonable scale.

Day 2:
- Add export button calling `exportPng` and validate background/transparent output.
- Add a simple post-render click binding (e.g., log node id on right click) using the existing DOM traversal.
- Confirm fonts load from `fonts.css` and render correctly in SVG output.

Success criteria:
- SVG renders with theme and background, no UI or editor dependencies.
- Exported PNG/JPG matches on-screen theme/background.
- Pan/zoom works and reset-fit does not break after re-render.
- Post-render node binding can be triggered with stable node id mapping in a small demo.
