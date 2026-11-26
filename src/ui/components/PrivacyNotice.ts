import { createChevronIcon, createEl } from '../dom.ts';

export class PrivacyNotice {
  public readonly root: HTMLElement;
  private readonly toggleBtn: HTMLButtonElement;
  private readonly contentEl: HTMLDivElement;

  public constructor() {
    this.root = createEl('section', {
      className: 'card privacy-card',
      attrs: {
        id: 'privacy-section',
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
      attrs: { id: 'privacy-content', hidden: 'true' }
    });

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

    this.contentEl.append(list);
    this.root.append(heading, this.contentEl);

    this.toggleBtn.addEventListener('click', () => {
      const expanded = this.toggleBtn.getAttribute('aria-expanded') === 'true';
      this.setExpanded(!expanded);
    });
  }

  private setExpanded(expanded: boolean): void {
    this.toggleBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    if (expanded) {
      this.contentEl.removeAttribute('hidden');
    } else {
      this.contentEl.setAttribute('hidden', 'true');
    }
  }

  public expand(): void {
    this.setExpanded(true);
  }
}
