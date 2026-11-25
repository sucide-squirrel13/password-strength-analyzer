import { analyzePassword } from '../domain/analyzer.ts';
import type { PasswordAnalysis } from '../domain/types.ts';
import { CriteriaChecklist } from './components/CriteriaChecklist.ts';
import { FindingsAndTips } from './components/FindingsAndTips.ts';
import { GeneratorPanel } from './components/GeneratorPanel.ts';
import { PasswordInputPanel } from './components/PasswordInputPanel.ts';
import { PrivacyNotice } from './components/PrivacyNotice.ts';
import { StrengthMeter } from './components/StrengthMeter.ts';
import { clearNode, createEl } from './dom.ts';

function hasClipboardWrite(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    navigator.clipboard !== undefined &&
    typeof navigator.clipboard.writeText === 'function'
  );
}

export class AppController {
  private readonly container: HTMLElement;
  private readonly inputPanel: PasswordInputPanel;
  private readonly strengthMeter: StrengthMeter;
  private readonly criteriaChecklist: CriteriaChecklist;
  private readonly findingsAndTips: FindingsAndTips;
  private readonly generatorPanel: GeneratorPanel;
  private readonly privacyNotice: PrivacyNotice;
  private readonly liveRegion: HTMLDivElement;

  private currentPassword = '';
  private lastAnnouncedTier = '';
  private announceTimer: number | null = null;

  public constructor(container: HTMLElement) {
    this.container = container;

    this.liveRegion = createEl('div', {
      className: 'sr-only',
      attrs: {
        role: 'status',
        'aria-live': 'polite',
        'aria-atomic': 'true'
      }
    });

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
        this.inputPanel.setStatus('Generated password loaded into analyzer.');
        this.announceNow(`Loaded into analyzer. Strength: ${analysis.scoring.tierLabel}`);
      },
      onCopyPassword: (generated) => {
        void this.copySecret(generated, 'generator');
      },
      onGeneratedAnnouncement: (msg) => this.announceNow(msg)
    });
    this.privacyNotice = new PrivacyNotice();

    this.mount();
    this.bindLifecycleHygiene();
    this.renderAnalysis(analyzePassword(''), false);
  }

  private mount(): void {
    clearNode(this.container);

    const shell = createEl('div', { className: 'app-shell' });

    const header = createEl('header', { className: 'app-header' });
    header.append(
      createEl('h1', { className: 'app-title', text: 'Password Strength Analyzer' }),
      createEl('p', {
        className: 'app-subtitle',
        text: 'Offline client-side password evaluation and Web Crypto generator.'
      })
    );

    const main = createEl('main');
    const grid = createEl('div', { className: 'workspace-grid' });

    const leftCol = createEl('div', { className: 'column-stack' });
    leftCol.append(
      this.inputPanel.root,
      this.strengthMeter.root,
      this.criteriaChecklist.root,
      this.findingsAndTips.root
    );

    const rightCol = createEl('div', { className: 'column-stack' });
    rightCol.append(this.generatorPanel.root);

    grid.append(leftCol, rightCol);
    main.append(grid, this.privacyNotice.root);

    shell.append(this.liveRegion, header, main);
    this.container.append(shell);
  }

  private bindLifecycleHygiene(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.inputPanel.hideSecret();
        this.generatorPanel.hideSecret();
      }
    });

    window.addEventListener('pagehide', () => {
      this.resetAll(false);
    });
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

    const setTargetStatus = (msg: string): void => {
      if (target === 'input') {
        this.inputPanel.setStatus(msg);
      } else {
        this.generatorPanel.setStatus(msg);
      }
    };

    if (!hasClipboardWrite()) {
      setTargetStatus('Clipboard API unavailable in this context. Copy manually.');
      this.announceNow('Clipboard unavailable');
      return;
    }

    try {
      await navigator.clipboard.writeText(secret);
      setTargetStatus('Copied to clipboard. Remember to clear clipboard when finished.');
      this.announceNow('Password copied to clipboard');
    } catch {
      setTargetStatus('Clipboard permission denied or unavailable. Copy manually.');
      this.announceNow('Clipboard permission denied');
    }
  }

  private async clearClipboard(): Promise<void> {
    if (!hasClipboardWrite()) {
      this.inputPanel.setStatus('Clipboard API unavailable; clear clipboard manually.');
      this.announceNow('Clipboard unavailable');
      return;
    }

    try {
      await navigator.clipboard.writeText('');
      this.inputPanel.setStatus('Clipboard cleared.');
      this.announceNow('Clipboard cleared');
    } catch {
      this.inputPanel.setStatus('Unable to clear clipboard automatically (permission required).');
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
