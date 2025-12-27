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
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

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
}: MermaidPreviewProps) => {
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

  const [svgMarkup, setSvgMarkup] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
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
    if (event.button !== 0) return;
    const target = event.target as HTMLElement | null;
    if (resolveMermaidTarget(target)) return;
    dragDetectedRef.current = false;
    panStateRef.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      originX: viewRef.current.x,
      originY: viewRef.current.y,
    };
    setIsPanning(true);
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
      <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm">
        <button className="ar-icon-button" onClick={() => handleZoom('out')} type="button">
          -
        </button>
        <button className="ar-icon-button" onClick={() => handleZoom('in')} type="button">
          +
        </button>
        <button className="ar-chip-button" onClick={handleFit} type="button">
          Fit
        </button>
        <button className="ar-chip-button" onClick={handleReset} type="button">
          Reset
        </button>
        <span className="text-[11px] text-slate-500">
          {Math.round(view.scale * 100)}%
        </span>
      </div>

      <div
        className={`mermaid-surface relative flex h-full w-full items-stretch justify-stretch ${actualBgClass} ${
          isPanning ? 'cursor-grabbing' : 'cursor-grab'
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
        {hovered?.label && (
          <div className="absolute bottom-4 left-4 max-w-xs rounded-full border border-black/10 bg-white/80 px-3 py-1 text-[11px] text-slate-700 shadow-sm">
            {hovered.label}
          </div>
        )}
        <div className="pointer-events-none absolute bottom-4 right-4 rounded-full border border-black/10 bg-white/70 px-3 py-1 text-[11px] text-slate-500">
          Scroll to zoom - Drag background to pan
        </div>
      </div>
    </section>
  );
};

export default MermaidPreview;
