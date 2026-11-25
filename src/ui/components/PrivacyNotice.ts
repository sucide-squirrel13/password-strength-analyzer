import { createEl } from '../dom.ts';

export class PrivacyNotice {
  public readonly root: HTMLElement;

  public constructor() {
    this.root = createEl('section', {
      className: 'card privacy-card',
      attrs: { 'aria-labelledby': 'privacy-heading' }
    });

    const heading = createEl('h2', {
      className: 'card-title',
      text: 'Privacy Notice & Local-Only Analysis Limitations',
      attrs: { id: 'privacy-heading' }
    });

    const list = createEl('ul', { className: 'privacy-list' });
    const items = [
      'Local-only processing: All strength checks and password generation run strictly inside your browser memory using the Web Crypto API. Zero network requests are made (enforced via Content Security Policy connect-src \'none\').',
      'Zero persistence or logging: Passwords are never saved to localStorage, sessionStorage, cookies, IndexedDB, URL parameters, or console logs.',
      'Offline common-password limitations: Pattern checks compare input against a small bundled offline list of common passwords and simple substitutions. This cannot detect newly leaked credentials, organization-specific terms, personal names, or check live data-breach databases (such as Have I Been Pwned).',
      'No global uniqueness guarantee: Local analysis cannot determine whether a password has been used elsewhere or exposed in an external breach. Strength scores and crack-time estimates are heuristic guides, not guarantees.',
      'External trust boundaries: Browser extensions, third-party password managers, OS keyboards/IMEs, JavaScript garbage collection, and OS/cloud clipboard history operate outside this page’s control.'
    ];

    for (const text of items) {
      list.append(createEl('li', { text }));
    }

    this.root.append(heading, list);
  }
}
