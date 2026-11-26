import { createChevronIcon, createEl } from '../dom.ts';

function isReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export class PrivacyNotice {
  public readonly root: HTMLElement;
  private readonly toggleBtn: HTMLButtonElement;
  private readonly contentEl: HTMLDivElement;
  private isExpanded = false;
  private expandRafId: number | null = null;

  public constructor() {
    this.root = createEl('section', {
      className: 'card privacy-card',
      attrs: {
        id: 'privacy-section',
        tabindex: '-1',
        'aria-labelledby': 'privacy-heading'
      }
    });

    const heading = createEl('h2', {
      className: 'card-title privacy-header',
      attrs: { id: 'privacy-heading' }
    });

    this.toggleBtn = createEl('button', {
      className: 'privacy-toggle',
      attrs: {
        type: 'button',
        'aria-expanded': 'false',
        'aria-controls': 'privacy-content'
      }
    });

    const titleText = createEl('span', { text: 'Privacy & Limitations' });
    const meta = createEl('span', { className: 'privacy-toggle-meta' });
    meta.append(
      createEl('span', { className: 'privacy-cue', text: 'Local-only · 5 notes' }),
      createChevronIcon()
    );
    this.toggleBtn.append(titleText, meta);
    heading.append(this.toggleBtn);

    this.contentEl = createEl('div', {
      className: 'privacy-content',
      attrs: {
        id: 'privacy-content',
        'data-expanded': 'false',
        'aria-hidden': 'true',
        inert: ''
      }
    });

    const inner = createEl('div', { className: 'privacy-content-inner' });
    const list = createEl('ul', { className: 'privacy-list' });
    const items = [
      'Local-only processing: All strength checks and password generation run strictly inside your browser memory using the Web Crypto API. Zero network requests are made (enforced via Content Security Policy connect-src \'none\').',
      'Zero persistence or logging: Passwords and theme preferences are never saved to localStorage, sessionStorage, cookies, IndexedDB, URL parameters, or console logs.',
      'Offline common-password limitations: Pattern checks compare input against a small bundled offline list of common passwords and simple substitutions. This cannot detect newly leaked credentials, organization-specific terms, personal names, or check live data-breach databases (such as Have I Been Pwned).',
      'No global uniqueness guarantee: Local analysis cannot determine whether a password has been used elsewhere or exposed in an external breach. Strength scores and crack-time estimates are heuristic guides, not guarantees.',
      'External trust boundaries: Browser extensions, third-party password managers, OS keyboards/IMEs, JavaScript garbage collection, and OS/cloud clipboard history operate outside this page’s control.'
    ];

    for (const text of items) {
      list.append(createEl('li', { text }));
    }

    inner.append(list);
    this.contentEl.append(inner);
    this.root.append(heading, this.contentEl);

    this.toggleBtn.addEventListener('click', () => {
      this.setExpanded(!this.isExpanded);
    });
  }

  private cancelExpandRaf(): void {
    if (this.expandRafId !== null) {
      window.cancelAnimationFrame(this.expandRafId);
      this.expandRafId = null;
    }
  }

  private setExpanded(expanded: boolean): void {
    if (this.isExpanded === expanded) return;
    this.isExpanded = expanded;
    this.cancelExpandRaf();
    this.toggleBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');

    if (expanded) {
      this.contentEl.removeAttribute('inert');
      this.contentEl.setAttribute('aria-hidden', 'false');
      if (isReducedMotion()) {
        this.contentEl.setAttribute('data-expanded', 'true');
      } else {
        this.expandRafId = window.requestAnimationFrame(() => {
          this.expandRafId = null;
          if (!this.isExpanded) return;
          this.contentEl.setAttribute('data-expanded', 'true');
        });
      }
    } else {
      this.contentEl.setAttribute('inert', '');
      this.contentEl.setAttribute('aria-hidden', 'true');
      this.contentEl.setAttribute('data-expanded', 'false');
    }
  }

  public expand(): void {
    if (!this.isExpanded) {
      this.setExpanded(true);
    }
  }
}
