import { useEffect, useMemo, useRef, useState } from 'react';
import mermaid from 'mermaid';
import type { MermaidRenderOptions, MermaidNodeEvent } from '../../domain/types';
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
  onError?: (message: string) => void;
  onNodeEvent?: (event: MermaidNodeEvent) => void;
}

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
  onError,
  onNodeEvent,
}: MermaidPreviewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgMarkup, setSvgMarkup] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);

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

  return (
    <section className="relative flex h-full min-h-[320px] w-full flex-col overflow-hidden rounded-2xl border border-black/10 shadow-sm">
      <div
        className={`relative flex h-full w-full items-center justify-center ${actualBgClass}`}
        style={actualBgStyle}
        ref={containerRef}
        onClick={(event) => {
          if (!onNodeEvent) return;
          const target = event.target as HTMLElement | null;
          const node = target?.closest('g[id]') ?? target?.closest('[id]');
          const nodeId = node?.id || undefined;
          onNodeEvent({ nodeId, rawEvent: event.nativeEvent });
        }}
      >
        {isRendering && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 text-sm text-slate-600">
            Rendering diagram...
          </div>
        )}
        {error && (
          <div className="absolute bottom-4 right-4 max-w-xs rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            {error}
          </div>
        )}
        <div
          id="mermaid-preview"
          className="h-full w-full overflow-auto p-6"
          style={{ fontFamily: resolvedFontFamily || 'inherit' }}
          dangerouslySetInnerHTML={{ __html: svgMarkup }}
        />
      </div>
    </section>
  );
};

export default MermaidPreview;
