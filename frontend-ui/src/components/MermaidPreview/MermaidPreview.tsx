import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type WheelEvent,
} from 'react';
import mermaid from 'mermaid';
import type { MermaidRenderOptions, MermaidNodeEvent } from '../../domain/types';
import { extractMermaidIds } from '../../domain/mermaidIds';
import {
  getBackgroundById,
  getFontById,
  getThemeConfig,
  themeOptions,
  backgroundOptions,
  fontOptions,
  type ThemeType,
} from '../../domain/themeCatalog';

interface MermaidPreviewProps {
  code: string;
  themeKey: ThemeType;
  backgroundKey: string;
  fontKey: string;
  renderOptions?: MermaidRenderOptions;
  selectedNodeIds?: string[];
  selectedEdge?: { fromMermaidId: string; toMermaidId: string } | null;
  emptyState?: ReactNode;
  onError?: (message: string) => void;
  onNodeEvent?: (event: MermaidNodeEvent) => void;
  onCanvasClick?: () => void;
  onHoverChange?: (info: { ids: string[]; label?: string } | null) => void;
  onThemeChange?: (value: ThemeType) => void;
  onBackgroundChange?: (value: string) => void;
  onFontChange?: (value: string) => void;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return (
    tag === 'input' ||
    tag === 'textarea' ||
    tag === 'select' ||
    tag === 'button' ||
    tag === 'a' ||
    target.isContentEditable
  );
};

const resolveMermaidTarget = (target: HTMLElement | null) => {
  if (!target) return null;

  let current: HTMLElement | null = target;
  while (current) {
    const dataId = current.getAttribute('data-id');
    const id = current.getAttribute('id');
    const ids = [...extractMermaidIds(dataId), ...extractMermaidIds(id)];
    if (ids.length > 0) {
      const unique = Array.from(new Set(ids));
      return {
        ids: unique,
        label: current.textContent?.trim() || undefined,
      };
    }
    current = current.parentElement;
  }

  return null;
};

const injectSvgStyles = (svg: string, themeCss?: string, fontFamily?: string) => {
  const fontCss = fontFamily
    ? `
text, .label, .messageText, .noteText, .labelText, .loopText, .taskText,
.sectionTitle, .titleText, .legendText, tspan {
  font-family: ${fontFamily} !important;
  text-transform: none !important;
}
`
    : '';

  const styleContent = `${themeCss ?? ''}\n${fontCss}`.trim();
  if (!styleContent) return svg;

  const styleTag = `<style>${styleContent}</style>`;
  return svg.replace(/<svg[^>]*>/, (match) => `${match}${styleTag}`);
};

const MermaidPreview = ({
  code,
  themeKey,
  backgroundKey,
  fontKey,
  renderOptions,
  selectedNodeIds,
  selectedEdge,
  emptyState,
  onError,
  onNodeEvent,
  onCanvasClick,
  onHoverChange,
  onThemeChange,
  onBackgroundChange,
  onFontChange,
}: MermaidPreviewProps) => {
  const [controlsExpanded, setControlsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const viewRef = useRef({ scale: 1, x: 0, y: 0 });
  const panStateRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });
  const dragDetectedRef = useRef(false);
  const hoverKeyRef = useRef('');
  const autoFitRef = useRef(true);
  const spacePressedRef = useRef(false);

  const [svgMarkup, setSvgMarkup] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [spacePanning, setSpacePanning] = useState(false);
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const [hovered, setHovered] = useState<{ ids: string[]; label?: string } | null>(null);

  const themeConfig = useMemo(() => getThemeConfig(themeKey), [themeKey]);
  const background = useMemo(
    () => getBackgroundById(backgroundKey),
    [backgroundKey],
  );
  const font = useMemo(() => getFontById(fontKey), [fontKey]);

  const fallbackBgStyle = themeConfig.mermaidConfig.themeVariables?.background
    ? { backgroundColor: themeConfig.mermaidConfig.themeVariables.background }
    : undefined;
  const actualBgClass =
    background.id === 'default' ? themeConfig.bgClass : background.bgClass || themeConfig.bgClass;
  const actualBgStyle =
    background.id === 'default'
      ? themeConfig.bgStyle ?? fallbackBgStyle
      : background.bgStyle || themeConfig.bgStyle || fallbackBgStyle;

  const resolvedFontFamily =
    font.id === 'default'
      ? themeConfig.mermaidConfig.themeVariables?.fontFamily
      : font.fontFamily || themeConfig.mermaidConfig.themeVariables?.fontFamily;

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return;
      if (isEditableTarget(event.target)) return;
      if (!spacePressedRef.current) {
        spacePressedRef.current = true;
        setSpacePanning(true);
      }
      event.preventDefault();
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code !== 'Space') return;
      spacePressedRef.current = false;
      setSpacePanning(false);
    };

    const handleBlur = () => {
      spacePressedRef.current = false;
      setSpacePanning(false);
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  useEffect(() => {
    onHoverChange?.(hovered);
  }, [hovered, onHoverChange]);

  useEffect(() => {
    autoFitRef.current = true;
    let cancelled = false;
    const render = async () => {
      if (!code.trim()) {
        setSvgMarkup('');
        return;
      }

      setIsRendering(true);
      setError(null);

      try {
        const config = {
          startOnLoad: false,
          ...themeConfig.mermaidConfig,
          ...renderOptions,
          themeVariables: {
            ...themeConfig.mermaidConfig.themeVariables,
            fontFamily: resolvedFontFamily,
          },
          suppressErrorRendering: renderOptions?.suppressErrors,
        };

        mermaid.initialize(config);

        const renderId = `mermaid-${Date.now()}-${Math.random()
          .toString(16)
          .slice(2)}`;
        const { svg, bindFunctions } = await mermaid.render(renderId, code);

        if (cancelled) return;

        const processedSvg = injectSvgStyles(
          svg,
          themeConfig.mermaidConfig.themeCSS,
          resolvedFontFamily,
        );
        setSvgMarkup(processedSvg);
        bindFunctions?.(containerRef.current);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error
            ? err.message
            : 'Mermaid render failed. Check syntax and try again.';
        setError(message);
        setSvgMarkup('');
        onError?.(message);
      } finally {
        if (!cancelled) {
          setIsRendering(false);
        }
      }
    };

    const timer = setTimeout(render, 180);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [code, themeConfig, resolvedFontFamily, renderOptions, onError, backgroundKey]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    svgRef.current = container.querySelector('svg');
    const svg = svgRef.current;
    if (!svg) return;

    svg.querySelectorAll('g.node, g.edgePath, g.edgeLabel').forEach((element) => {
      element.classList.add('archradar-interactive');
    });

    if (!autoFitRef.current) return;
    autoFitRef.current = false;
    requestAnimationFrame(() => {
      const viewport = viewportRef.current;
      if (!viewport || !svgRef.current) return;
      const rect = viewport.getBoundingClientRect();
      let bbox: DOMRect | null = null;
      try {
        const svgBox = svgRef.current.getBBox();
        bbox = new DOMRect(svgBox.x, svgBox.y, svgBox.width, svgBox.height);
      } catch {
        bbox = null;
      }
      if (!bbox || bbox.width <= 0 || bbox.height <= 0) return;

      const padding = 36;
      const scaleX = (rect.width - padding * 2) / bbox.width;
      const scaleY = (rect.height - padding * 2) / bbox.height;
      const scale = clamp(Math.min(scaleX, scaleY), 0.2, 3);
      const x = (rect.width - bbox.width * scale) / 2 - bbox.x * scale;
      const y = (rect.height - bbox.height * scale) / 2 - bbox.y * scale;
      setView({ scale, x, y });
    });
  }, [svgMarkup]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const selectedNodes = new Set((selectedNodeIds ?? []).map((id) => id.toUpperCase()));
    const hoveredNodes = new Set((hovered?.ids ?? []).map((id) => id.toUpperCase()));
    const hasSelection = selectedNodes.size > 0 || !!selectedEdge;

    svg.querySelectorAll<SVGGElement>('g.node').forEach((node) => {
      const dataId = node.getAttribute('data-id');
      const id = node.getAttribute('id');
      const ids = [...extractMermaidIds(dataId), ...extractMermaidIds(id)];
      const isSelected = ids.some((value) => selectedNodes.has(value));
      const isHovered = ids.some((value) => hoveredNodes.has(value));
      node.classList.toggle('archradar-selected', isSelected);
      node.classList.toggle('archradar-hovered', !isSelected && isHovered);
      node.classList.toggle('archradar-muted', hasSelection && !isSelected && !isHovered);
    });

    svg.querySelectorAll<SVGGElement>('g.edgePath, g.edgeLabel').forEach((edge) => {
      const dataId = edge.getAttribute('data-id');
      const id = edge.getAttribute('id');
      const ids = [...extractMermaidIds(dataId), ...extractMermaidIds(id)].map((value) => value.toUpperCase());
      const isSelectedEdge =
        !!selectedEdge &&
        ids.includes(selectedEdge.fromMermaidId.toUpperCase()) &&
        ids.includes(selectedEdge.toMermaidId.toUpperCase());
      const isHoveredEdge =
        hovered?.ids.length === 2 &&
        ids.includes(hovered.ids[0].toUpperCase()) &&
        ids.includes(hovered.ids[1].toUpperCase());
      edge.classList.toggle('archradar-selected', isSelectedEdge);
      edge.classList.toggle('archradar-hovered', !isSelectedEdge && !!isHoveredEdge);
      edge.classList.toggle('archradar-muted', hasSelection && !isSelectedEdge && !isHoveredEdge);
    });
  }, [selectedNodeIds, selectedEdge, hovered, svgMarkup]);

  const updateHover = (target: HTMLElement | null) => {
    const resolved = resolveMermaidTarget(target);
    const key = resolved?.ids.join('|') ?? '';
    if (key === hoverKeyRef.current) return;
    hoverKeyRef.current = key;
    setHovered(resolved);
  };

  const flashMermaidElement = (target: HTMLElement | null) => {
    if (!target) return;
    const hit = target.closest<SVGGElement>('g.node, g.edgePath, g.edgeLabel');
    if (!hit) return;
    hit.classList.remove('archradar-clicked');
    void hit.getBoundingClientRect();
    hit.classList.add('archradar-clicked');
    window.setTimeout(() => hit.classList.remove('archradar-clicked'), 260);
  };

  const updateView = (next: { scale: number; x: number; y: number }) => {
    viewRef.current = next;
    setView(next);
  };

  const zoomTo = (nextScale: number, centerX: number, centerY: number) => {
    const current = viewRef.current;
    const scale = clamp(nextScale, 0.2, 3);
    const ratio = scale / current.scale;
    const x = centerX - ratio * (centerX - current.x);
    const y = centerY - ratio * (centerY - current.y);
    updateView({ scale, x, y });
  };

  const handleZoom = (direction: 'in' | 'out') => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const nextScale =
      direction === 'in' ? viewRef.current.scale * 1.15 : viewRef.current.scale / 1.15;
    zoomTo(nextScale, centerX, centerY);
  };

  const handleReset = () => {
    updateView({ scale: 1, x: 0, y: 0 });
  };

  const handleFit = () => {
    const viewport = viewportRef.current;
    const svg = svgRef.current;
    if (!viewport || !svg) return;
    const rect = viewport.getBoundingClientRect();
    let bbox: DOMRect | null = null;
    try {
      const svgBox = svg.getBBox();
      bbox = new DOMRect(svgBox.x, svgBox.y, svgBox.width, svgBox.height);
    } catch {
      bbox = null;
    }
    if (!bbox || bbox.width <= 0 || bbox.height <= 0) return;

    const padding = 36;
    const scaleX = (rect.width - padding * 2) / bbox.width;
    const scaleY = (rect.height - padding * 2) / bbox.height;
    const scale = clamp(Math.min(scaleX, scaleY), 0.2, 3);
    const x = (rect.width - bbox.width * scale) / 2 - bbox.x * scale;
    const y = (rect.height - bbox.height * scale) / 2 - bbox.y * scale;
    updateView({ scale, x, y });
  };

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!viewportRef.current) return;
    event.preventDefault();
    const rect = viewportRef.current.getBoundingClientRect();
    const centerX = event.clientX - rect.left;
    const centerY = event.clientY - rect.top;
    const direction = event.deltaY < 0 ? 1.1 : 0.9;
    zoomTo(viewRef.current.scale * direction, centerX, centerY);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    dragDetectedRef.current = false;
    const isMiddleButton = event.button === 1;
    const isSpaceDrag = event.button === 0 && spacePressedRef.current;
    if (!isMiddleButton && !isSpaceDrag) return;
    dragDetectedRef.current = true;
    panStateRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      originX: viewRef.current.x,
      originY: viewRef.current.y,
    };
    setIsPanning(true);
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!panStateRef.current.active) {
      updateHover(event.target as HTMLElement | null);
      return;
    }

    const dx = event.clientX - panStateRef.current.startX;
    const dy = event.clientY - panStateRef.current.startY;
    if (!dragDetectedRef.current && Math.hypot(dx, dy) > 4) {
      dragDetectedRef.current = true;
    }

    updateView({
      scale: viewRef.current.scale,
      x: panStateRef.current.originX + dx,
      y: panStateRef.current.originY + dy,
    });
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!panStateRef.current.active) return;
    panStateRef.current.active = false;
    setIsPanning(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handlePointerLeave = () => {
    if (panStateRef.current.active) {
      panStateRef.current.active = false;
      setIsPanning(false);
    }
    hoverKeyRef.current = '';
    setHovered(null);
  };

  const handleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!onNodeEvent && !onCanvasClick) return;
    if (dragDetectedRef.current) {
      dragDetectedRef.current = false;
      return;
    }
    const target = event.target as HTMLElement | null;
    const resolved = resolveMermaidTarget(target);
    flashMermaidElement(target);
    if (!resolved) {
      onCanvasClick?.();
      return;
    }
    if (!onNodeEvent) return;
    if (resolved.ids.length >= 2) {
      onNodeEvent({
        kind: 'edge',
        action: 'click',
        fromMermaidId: resolved.ids[0],
        toMermaidId: resolved.ids[1],
        label: resolved.label,
        rawEvent: event.nativeEvent,
      });
      return;
    }
    onNodeEvent({
      kind: 'node',
      action: 'click',
      mermaidId: resolved.ids[0],
      label: resolved.label,
      rawEvent: event.nativeEvent,
    });
  };

  const handleDoubleClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!onNodeEvent) {
      handleReset();
      return;
    }
    const target = event.target as HTMLElement | null;
    const resolved = resolveMermaidTarget(target);
    flashMermaidElement(target);
    if (!resolved) {
      handleReset();
      return;
    }
    if (resolved.ids.length >= 2) {
      onNodeEvent({
        kind: 'edge',
        action: 'doubleClick',
        fromMermaidId: resolved.ids[0],
        toMermaidId: resolved.ids[1],
        label: resolved.label,
        rawEvent: event.nativeEvent,
      });
      return;
    }
    onNodeEvent({
      kind: 'node',
      action: 'doubleClick',
      mermaidId: resolved.ids[0],
      label: resolved.label,
      rawEvent: event.nativeEvent,
    });
  };

  const isEmpty = !code.trim();

  return (
    <section className="relative flex h-full min-h-[320px] w-full flex-col overflow-hidden rounded-[28px] border border-black/10 shadow-[0_20px_40px_-30px_rgba(17,24,39,0.4)]">
      <div
        className={`absolute left-4 top-4 z-10 flex flex-col gap-3 rounded-3xl border border-black/10 bg-white/90 p-1.5 shadow-xl transition-all duration-300 ease-in-out ${controlsExpanded ? 'w-[780px]' : 'w-auto'
          }`}
      >
        <div className="flex items-center gap-2 px-1.5 py-1">
          <div className="flex items-center gap-1.5 rounded-full bg-slate-100/50 p-1">
            <button
              className="ar-icon-button hover:bg-white"
              onClick={() => handleZoom('out')}
              type="button"
              title="Zoom Out"
            >
              -
            </button>
            <button
              className="ar-icon-button hover:bg-white"
              onClick={() => handleZoom('in')}
              type="button"
              title="Zoom In"
            >
              +
            </button>
          </div>

          <div className="h-4 w-px bg-black/5 mx-1" />

          <button className="ar-chip-button" onClick={handleFit} type="button">
            Fit
          </button>
          <button className="ar-chip-button" onClick={handleReset} type="button">
            Reset
          </button>

          <span className="min-w-[40px] text-center text-[10px] font-bold text-slate-400">
            {Math.round(view.scale * 100)}%
          </span>

          <div className="h-4 w-px bg-black/5 mx-1" />

          <button
            className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all ${controlsExpanded
              ? 'bg-amber-100 text-amber-900 shadow-sm'
              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            onClick={() => setControlsExpanded(!controlsExpanded)}
            type="button"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z" />
              <path d="M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
              <path d="M12 2v2" />
              <path d="M12 20v2" />
              <path d="m4.93 4.93 1.41 1.41" />
              <path d="m17.66 17.66 1.41 1.41" />
              <path d="M2 12h2" />
              <path d="M20 12h2" />
              <path d="m6.34 17.66-1.41 1.41" />
              <path d="m19.07 4.93-1.41 1.41" />
            </svg>
            <span>Appearance</span>
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform duration-300 ${controlsExpanded ? 'rotate-180' : ''}`}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </div>

        {controlsExpanded && (
          <div className="border-t border-black/5 px-3 py-3 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Theme</span>
                <select
                  className="ar-select !py-1 !px-2 !text-[11px] w-32"
                  value={themeKey}
                  onChange={(e) => onThemeChange?.(e.target.value as ThemeType)}
                >
                  {themeOptions.map((opt) => (
                    <option key={opt.key} value={opt.key}>{opt.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Background</span>
                <select
                  className="ar-select !py-1 !px-2 !text-[11px] w-32"
                  value={backgroundKey}
                  onChange={(e) => onBackgroundChange?.(e.target.value)}
                >
                  {backgroundOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.name.en}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Font</span>
                <select
                  className="ar-select !py-1 !px-2 !text-[11px] w-32"
                  value={fontKey}
                  onChange={(e) => onFontChange?.(e.target.value)}
                >
                  {fontOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.name.en}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      <div
        className={`mermaid-surface relative flex h-full w-full items-stretch justify-stretch ${actualBgClass} ${isPanning ? 'cursor-grabbing' : spacePanning ? 'cursor-grab' : 'cursor-default'
          }`}
        style={actualBgStyle}
        ref={containerRef}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        <div ref={viewportRef} className="h-full w-full overflow-hidden">
          <div
            className="h-full w-full"
            style={{
              transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
              transformOrigin: '0 0',
            }}
          >
            <div
              id="mermaid-preview"
              className="min-h-full w-full p-6"
              style={{ fontFamily: resolvedFontFamily || 'inherit' }}
              dangerouslySetInnerHTML={{ __html: svgMarkup }}
            />
          </div>
        </div>

        {isRendering && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 text-sm text-slate-600">
            Rendering diagram...
          </div>
        )}
        {isEmpty && !isRendering && !error && (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-slate-600">
            {emptyState ?? 'No diagram loaded. Run a scan or pick a snapshot to get started.'}
          </div>
        )}
        {error && (
          <div className="absolute bottom-4 right-4 max-w-xs rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </div>
        )}
        <div className="pointer-events-none absolute bottom-4 right-4 rounded-full border border-black/10 bg-white/70 px-3 py-1 text-[11px] text-slate-500">
          Scroll to zoom - Middle mouse or Space + drag to pan
        </div>
      </div>
    </section>
  );
};

export default MermaidPreview;
