export const SVG_NS = 'http://www.w3.org/2000/svg';

export interface ElementOptions {
  className?: string | undefined;
  text?: string | undefined;
  attrs?: Readonly<Record<string, string>> | undefined;
}

export interface SvgElementOptions {
  className?: string | undefined;
  attrs?: Readonly<Record<string, string>> | undefined;
}

export function createEl<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options?: ElementOptions
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (options?.className) {
    el.className = options.className;
  }
  if (options?.text !== undefined) {
    el.textContent = options.text;
  }
  if (options?.attrs) {
    for (const [key, value] of Object.entries(options.attrs)) {
      el.setAttribute(key, value);
    }
  }
  return el;
}

export function createSvgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  options?: SvgElementOptions
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  if (options?.className) {
    el.setAttribute('class', options.className);
  }
  if (tag === 'svg') {
    el.setAttribute('aria-hidden', 'true');
    el.setAttribute('focusable', 'false');
  }
  if (options?.attrs) {
    for (const [key, value] of Object.entries(options.attrs)) {
      el.setAttribute(key, value);
    }
  }
  return el;
}

export function clearNode(node: HTMLElement): void {
  node.replaceChildren();
}

export function createShieldIcon(className = 'privacy-pill-icon'): SVGSVGElement {
  const svg = createSvgEl('svg', {
    className,
    attrs: {
      viewBox: '0 0 20 20',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '1.7',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round'
    }
  });
  svg.append(
    createSvgEl('path', {
      attrs: { d: 'M10 2.5L16 5v4.8c0 3.7-2.6 6.7-6 7.7-3.4-1-6-4-6-7.7V5l6-2.5z' }
    }),
    createSvgEl('path', {
      attrs: { d: 'M7.5 10l1.7 1.7 3.4-3.4' }
    })
  );
  return svg;
}

export function createSunIcon(className = 'theme-icon'): SVGSVGElement {
  const svg = createSvgEl('svg', {
    className,
    attrs: {
      viewBox: '0 0 20 20',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '1.7',
      'stroke-linecap': 'round'
    }
  });
  svg.append(
    createSvgEl('circle', { attrs: { cx: '10', cy: '10', r: '3.5' } }),
    createSvgEl('path', {
      attrs: {
        d: 'M10 2.2v1.8M10 16v1.8M2.2 10H4M16 10h1.8M4.5 4.5l1.3 1.3M14.2 14.2l1.3 1.3M4.5 15.5l1.3-1.3M14.2 5.8l1.3-1.3'
      }
    })
  );
  return svg;
}

export function createMoonIcon(className = 'theme-icon'): SVGSVGElement {
  const svg = createSvgEl('svg', {
    className,
    attrs: {
      viewBox: '0 0 20 20',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '1.7',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round'
    }
  });
  svg.append(
    createSvgEl('path', {
      attrs: { d: 'M15.8 12.6A6.5 6.5 0 0 1 7.4 4.2a6.5 6.5 0 1 0 8.4 8.4z' }
    })
  );
  return svg;
}

export function createChevronIcon(className = 'chevron-icon'): SVGSVGElement {
  const svg = createSvgEl('svg', {
    className,
    attrs: {
      viewBox: '0 0 20 20',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '1.8',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round'
    }
  });
  svg.append(
    createSvgEl('path', {
      attrs: { d: 'M5.5 7.75L10 12.25l4.5-4.5' }
    })
  );
  return svg;
}
