export interface ExportSvgOptions {
  filename: string;
  backgroundColor?: string;
}

export const exportSvg = (svgElement: SVGSVGElement, options: ExportSvgOptions) => {
  const clone = svgElement.cloneNode(true) as SVGSVGElement;

  if (options.backgroundColor) {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', '0');
    rect.setAttribute('y', '0');
    rect.setAttribute('width', '100%');
    rect.setAttribute('height', '100%');
    rect.setAttribute('fill', options.backgroundColor);
    clone.insertBefore(rect, clone.firstChild);
  }

  if (!clone.getAttribute('xmlns')) {
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }

  const serialized = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([serialized], {
    type: 'image/svg+xml;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = options.filename;
  anchor.click();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
};
