export interface ElementOptions {
  className?: string;
  text?: string;
  attrs?: Readonly<Record<string, string>>;
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

export function clearNode(node: HTMLElement): void {
  node.replaceChildren();
}
