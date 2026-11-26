import { analyzePassword } from '../domain/analyzer.ts';
import type { PasswordAnalysis } from '../domain/types.ts';
import type { ThemeManager, ThemeMode } from './ThemeManager.ts';
import { CriteriaChecklist } from './components/CriteriaChecklist.ts';
import { FindingsAndTips } from './components/FindingsAndTips.ts';
import { GeneratorPanel } from './components/GeneratorPanel.ts';
import { PasswordInputPanel } from './components/PasswordInputPanel.ts';
import { PrivacyNotice } from './components/PrivacyNotice.ts';
import { StrengthMeter } from './components/StrengthMeter.ts';
import { AmbientPointerController } from './AmbientPointerController.ts';
import { AmbientVideoController } from './AmbientVideoController.ts';
import {
  clearNode,
  createEl,
  createMoonIcon,
  createShieldIcon,
  createSunIcon
} from './dom.ts';

function hasClipboardWrite(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    navigator.clipboard !== undefined &&
    typeof navigator.clipboard.writeText === 'function'
  );
}

export class AppController {
  private readonly container: HTMLElement;
  private readonly themeManager: ThemeManager;
  private readonly inputPanel: PasswordInputPanel;
  private readonly strengthMeter: StrengthMeter;
  private readonly criteriaChecklist: CriteriaChecklist;
  private readonly findingsAndTips: FindingsAndTips;
  private readonly generatorPanel: GeneratorPanel;
  private readonly privacyNotice: PrivacyNotice;
  private readonly liveRegion: HTMLDivElement;
  private readonly themeToggleBtn: HTMLButtonElement;
  private readonly themeIconSlot: HTMLSpanElement;
  private ambientPointerController: AmbientPointerController | null = null;
  private ambientVideoController: AmbientVideoController | null = null;
  private navHighlightRafId: number | null = null;

  private currentPassword = '';
  private lastAnnouncedTier = '';
  private announceTimer: number | null = null;

  public constructor(container: HTMLElement, themeManager: ThemeManager) {
    this.container = container;
    this.themeManager = themeManager;

    this.liveRegion = createEl('div', {
      className: 'sr-only',
      attrs: {
        role: 'status',
        'aria-live': 'polite',
        'aria-atomic': 'true'
      }
    });

    this.themeToggleBtn = createEl('button', {
      className: 'theme-toggle',
      attrs: {
        type: 'button',
        'aria-pressed': 'false'
      }
    });
    this.themeIconSlot = createEl('span', { className: 'theme-icon-slot' });
    this.themeToggleBtn.append(
      this.themeIconSlot,
      createEl('span', { text: 'Dark mode' })
    );

    this.inputPanel = new PasswordInputPanel({
      onInput: (val) => this.handlePasswordChange(val, true),
      onCopy: () => {
        void this.copySecret(this.currentPassword, 'input');
      },
      onClearClipboard: () => {
        void this.clearClipboard();
      },
      onReset: () => this.resetAll(true)
    });

    this.strengthMeter = new StrengthMeter();
    this.criteriaChecklist = new CriteriaChecklist();
    this.findingsAndTips = new FindingsAndTips();
    this.generatorPanel = new GeneratorPanel({
      onUsePassword: (generated) => {
        this.inputPanel.setValue(generated);
        const analysis = this.handlePasswordChange(generated, false);
        this.inputPanel.setStatus('Generated password loaded into analyzer.', 'success');
        this.announceNow(`Loaded into analyzer. Strength: ${analysis.scoring.tierLabel}`);
      },
      onCopyPassword: (generated) => {
        void this.copySecret(generated, 'generator');
      },
      onGeneratedAnnouncement: (msg) => this.announceNow(msg)
    });
    this.privacyNotice = new PrivacyNotice();

    this.themeManager.setOnChange((theme) => this.syncThemeToggle(theme));
    this.syncThemeToggle(this.themeManager.getTheme());

    this.mount();
    this.bindEvents();
    this.renderAnalysis(analyzePassword(''), false);
  }

  private mount(): void {
    clearNode(this.container);

    const shell = createEl('div', { className: 'app-shell' });

    const skipLink = createEl('a', {
      className: 'skip-link',
      text: 'Skip to analyzer',
      attrs: { href: '#analyzer-section' }
    });

    const header = createEl('header', { className: 'app-header' });
    const brand = createEl('div', { className: 'header-brand' });
    const titleRow = createEl('div', { className: 'header-title-row' });

    const privacyPill = createEl('span', { className: 'privacy-pill' });
    privacyPill.append(
      createShieldIcon(),
      createEl('span', { text: 'Local analysis · Memory-only' })
    );

    titleRow.append(
      createEl('h1', { className: 'app-title', text: 'Password Strength Analyzer' }),
      privacyPill
    );

    brand.append(
      titleRow,
      createEl('p', {
        className: 'app-subtitle',
        text: 'Client-side password evaluation and Web Crypto generator.'
      })
    );

    const actions = createEl('div', { className: 'header-actions' });
    const nav = createEl('nav', {
      className: 'header-nav',
      attrs: { 'aria-label': 'Section navigation' }
    });

    const analyzerLink = createEl('a', {
      className: 'nav-link',
      text: 'Analyzer',
      attrs: { href: '#analyzer-section' }
    });
    analyzerLink.addEventListener('click', () => {
      this.triggerNavHighlight(this.inputPanel.root);
    });
    const generatorLink = createEl('a', {
      className: 'nav-link',
      text: 'Generator',
      attrs: { href: '#generator-section' }
    });
    generatorLink.addEventListener('click', () => {
      this.triggerNavHighlight(this.generatorPanel.root);
    });
    const privacyLink = createEl('a', {
      className: 'nav-link',
      text: 'Privacy',
      attrs: { href: '#privacy-section' }
    });
    privacyLink.addEventListener('click', () => {
      this.privacyNotice.expand();
      this.triggerNavHighlight(this.privacyNotice.root);
    });

    skipLink.addEventListener('click', () => {
      this.triggerNavHighlight(this.inputPanel.root);
    });

    nav.append(analyzerLink, generatorLink, privacyLink);
    actions.append(nav, this.themeToggleBtn);
    header.append(brand, actions);

    const main = createEl('main');
    const grid = createEl('div', { className: 'workspace-grid' });

    const primaryCol = createEl('div', { className: 'column-primary' });
    primaryCol.append(
      this.inputPanel.root,
      this.strengthMeter.root,
      this.criteriaChecklist.root,
      this.findingsAndTips.root
    );

    const secondaryCol = createEl('div', { className: 'column-secondary' });
    secondaryCol.append(this.generatorPanel.root, this.privacyNotice.root);

    grid.append(primaryCol, secondaryCol);
    main.append(grid);

    const ambientBg = createEl('div', {
      className: 'ambient-bg',
      attrs: { 'aria-hidden': 'true' }
    });

    const mesh = createEl('div', { className: 'ambient-mesh' });

    const videoLayer = createEl('div', {
      className: 'ambient-video-layer',
      attrs: { 'data-video-state': 'idle' }
    });
    const bgVideo = createEl('video', {
      className: 'ambient-video',
      attrs: {
        autoplay: '',
        loop: '',
        muted: '',
        playsinline: '',
        preload: 'metadata',
        tabindex: '-1',
        'aria-hidden': 'true'
      }
    });
    const fadeTop = createEl('div', { className: 'ambient-video-fade ambient-video-fade-top' });
    const fadeBottom = createEl('div', {
      className: 'ambient-video-fade ambient-video-fade-bottom'
    });
    videoLayer.append(bgVideo, fadeTop, fadeBottom);

    const gridMask = createEl('div', { className: 'ambient-grid-mask' });
    gridMask.append(createEl('div', { className: 'ambient-grid' }));

    const trails = createEl('div', { className: 'ambient-trails' });
    trails.append(
      createEl('span', { className: 'ambient-trail ambient-trail-1' }),
      createEl('span', { className: 'ambient-trail ambient-trail-2' }),
      createEl('span', { className: 'ambient-trail ambient-trail-3' })
    );

    const particlesFar = createEl('div', { className: 'ambient-particles-far' });
    const particlesNear = createEl('div', { className: 'ambient-particles-near' });

    const pulses = createEl('div', { className: 'ambient-pulses' });
    pulses.append(
      createEl('span', { className: 'ambient-pulse ambient-pulse-1' }),
      createEl('span', { className: 'ambient-pulse ambient-pulse-2' })
    );

    const pointerGlow = createEl('span', { className: 'ambient-pointer' });

    ambientBg.append(
      mesh,
      videoLayer,
      createEl('span', { className: 'ambient-orb ambient-orb-1' }),
      createEl('span', { className: 'ambient-orb ambient-orb-2' }),
      createEl('span', { className: 'ambient-orb ambient-orb-3' }),
      createEl('span', { className: 'ambient-orb ambient-orb-4' }),
      gridMask,
      trails,
      particlesFar,
      particlesNear,
      pulses,
      pointerGlow
    );

    this.ambientPointerController?.destroy();
    this.ambientPointerController = new AmbientPointerController(pointerGlow);
    this.ambientVideoController?.destroy();
    this.ambientVideoController = new AmbientVideoController(videoLayer, bgVideo);

    for (const card of [this.inputPanel.root, this.generatorPanel.root, this.privacyNotice.root]) {
      card.addEventListener('animationend', (event: AnimationEvent) => {
        if (event.target === card) {
          card.classList.remove('is-nav-highlighted');
        }
      });
    }

    shell.append(skipLink, this.liveRegion, header, main);
    this.container.append(ambientBg, shell);
  }

  private triggerNavHighlight(cardEl: HTMLElement): void {
    if (this.navHighlightRafId !== null) {
      window.cancelAnimationFrame(this.navHighlightRafId);
      this.navHighlightRafId = null;
    }
    cardEl.classList.remove('is-nav-highlighted');
    this.navHighlightRafId = window.requestAnimationFrame(() => {
      this.navHighlightRafId = null;
      cardEl.classList.add('is-nav-highlighted');
    });
  }

  private bindEvents(): void {
    this.themeToggleBtn.addEventListener('click', () => {
      const nextTheme = this.themeManager.toggle();
      this.announceNow(
        nextTheme === 'dark' ? 'Dark theme enabled' : 'Light theme enabled'
      );
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.inputPanel.hideSecret();
        this.generatorPanel.hideSecret();
      }
    });

    window.addEventListener('pagehide', () => {
      if (this.navHighlightRafId !== null) {
        window.cancelAnimationFrame(this.navHighlightRafId);
        this.navHighlightRafId = null;
      }
      this.ambientPointerController?.destroy();
      this.ambientPointerController = null;
      this.ambientVideoController?.destroy();
      this.ambientVideoController = null;
      this.resetAll(false);
      this.themeManager.destroy();
    });
  }

  private syncThemeToggle(theme: ThemeMode): void {
    const isDark = theme === 'dark';
    this.themeToggleBtn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
    this.themeIconSlot.replaceChildren(isDark ? createSunIcon() : createMoonIcon());
  }

  private handlePasswordChange(value: string, announceTier: boolean): PasswordAnalysis {
    this.currentPassword = value;
    const analysis = analyzePassword(value);
    this.renderAnalysis(analysis, announceTier);
    return analysis;
  }

  private renderAnalysis(analysis: PasswordAnalysis, announceTier: boolean): void {
    this.strengthMeter.update(analysis);
    this.criteriaChecklist.update(analysis.criteria);
    this.findingsAndTips.update(analysis);

    if (announceTier) {
      this.scheduleTierAnnouncement(analysis.scoring.tierLabel);
    }
  }

  private setLiveText(message: string): void {
    if (this.liveRegion.textContent === message) {
      this.liveRegion.textContent = '';
    }
    this.liveRegion.textContent = message;
  }

  private scheduleTierAnnouncement(tierLabel: string): void {
    if (this.announceTimer !== null) {
      window.clearTimeout(this.announceTimer);
    }
    this.announceTimer = window.setTimeout(() => {
      this.announceTimer = null;
      if (tierLabel !== this.lastAnnouncedTier) {
        this.lastAnnouncedTier = tierLabel;
        this.setLiveText(`Strength: ${tierLabel}`);
      }
    }, 350);
  }

  private announceNow(message: string): void {
    if (this.announceTimer !== null) {
      window.clearTimeout(this.announceTimer);
      this.announceTimer = null;
    }
    this.setLiveText(message);
  }

  private async copySecret(
    secret: string,
    target: 'input' | 'generator'
  ): Promise<void> {
    if (secret.length === 0) return;

    const setTargetStatus = (msg: string, state: 'success' | 'error'): void => {
      if (target === 'input') {
        this.inputPanel.setStatus(msg, state);
      } else {
        this.generatorPanel.setStatus(msg, state);
      }
    };

    if (!hasClipboardWrite()) {
      setTargetStatus('Clipboard API unavailable in this context. Copy manually.', 'error');
      this.announceNow('Clipboard unavailable');
      return;
    }

    try {
      await navigator.clipboard.writeText(secret);
      if (target === 'input') {
        this.inputPanel.markCopied();
      } else {
        this.generatorPanel.markCopied();
      }
      setTargetStatus('Copied to clipboard. Remember to clear clipboard when finished.', 'success');
      this.announceNow('Password copied to clipboard');
    } catch {
      setTargetStatus('Clipboard permission denied or unavailable. Copy manually.', 'error');
      this.announceNow('Clipboard permission denied');
    }
  }

  private async clearClipboard(): Promise<void> {
    if (!hasClipboardWrite()) {
      this.inputPanel.setStatus(
        'Clipboard API unavailable; clear clipboard manually.',
        'error'
      );
      this.announceNow('Clipboard unavailable');
      return;
    }

    try {
      await navigator.clipboard.writeText('');
      this.inputPanel.setStatus('Clipboard cleared.', 'success');
      this.announceNow('Clipboard cleared');
    } catch {
      this.inputPanel.setStatus(
        'Unable to clear clipboard automatically (permission required).',
        'error'
      );
      this.announceNow('Clipboard permission denied');
    }
  }

  public resetAll(focusInput: boolean): void {
    if (this.announceTimer !== null) {
      window.clearTimeout(this.announceTimer);
      this.announceTimer = null;
    }
    this.currentPassword = '';
    this.lastAnnouncedTier = '';
    this.inputPanel.reset(focusInput);
    this.generatorPanel.reset();
    this.renderAnalysis(analyzePassword(''), false);
    if (focusInput) {
      this.announceNow('Cleared');
    }
  }
}
