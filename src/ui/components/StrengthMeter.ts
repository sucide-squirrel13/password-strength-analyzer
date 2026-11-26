import type { PasswordAnalysis, StrengthTier } from '../../domain/types.ts';
import { createEl } from '../dom.ts';

const TIER_RANK: Readonly<Record<StrengthTier, number>> = {
  empty: 0,
  'very-weak': 1,
  weak: 2,
  fair: 3,
  strong: 4,
  'very-strong': 5
};

export class StrengthMeter {
  public readonly root: HTMLElement;
  private readonly badgeEl: HTMLSpanElement;
  private readonly scoreEl: HTMLSpanElement;
  private readonly trackEl: HTMLDivElement;
  private readonly fillEl: HTMLDivElement;
  private readonly lengthValueEl: HTMLSpanElement;
  private readonly entropyValueEl: HTMLSpanElement;
  private readonly hintValueEl: HTMLSpanElement;
  private previousTier: StrengthTier = 'empty';
  private upgradeRafId: number | null = null;

  public constructor() {
    this.root = createEl('section', {
      className: 'card',
      attrs: { 'aria-labelledby': 'meter-heading' }
    });

    const heading = createEl('h2', {
      className: 'card-title',
      text: 'Strength Assessment',
      attrs: { id: 'meter-heading' }
    });

    const headerRow = createEl('div', { className: 'meter-header' });
    this.badgeEl = createEl('span', {
      className: 'tier-badge',
      text: 'No Input',
      attrs: { 'data-tier': 'empty' }
    });
    this.scoreEl = createEl('span', {
      className: 'meter-score',
      text: '0 / 100'
    });
    headerRow.append(this.badgeEl, this.scoreEl);

    this.trackEl = createEl('div', {
      className: 'meter-track',
      attrs: {
        role: 'progressbar',
        'aria-label': 'Password strength score',
        'aria-valuemin': '0',
        'aria-valuemax': '100',
        'aria-valuenow': '0',
        'aria-valuetext': 'No Input, 0 out of 100'
      }
    });
    this.fillEl = createEl('div', {
      className: 'meter-fill',
      attrs: { 'data-tier': 'empty' }
    });
    this.trackEl.append(this.fillEl);

    this.trackEl.addEventListener('animationend', (event: AnimationEvent) => {
      if (event.target === this.trackEl) {
        this.trackEl.classList.remove('is-upgraded');
      }
    });

    this.badgeEl.addEventListener('animationend', (event: AnimationEvent) => {
      if (event.target === this.badgeEl) {
        this.badgeEl.classList.remove('is-tier-pop');
      }
    });

    const metaGrid = createEl('div', { className: 'meter-meta' });

    const lengthItem = createEl('div', { className: 'meta-item' });
    lengthItem.append(createEl('span', { className: 'meta-label', text: 'Visible length' }));
    this.lengthValueEl = createEl('span', { className: 'meta-value', text: '0 chars' });
    lengthItem.append(this.lengthValueEl);

    const entropyItem = createEl('div', { className: 'meta-item' });
    entropyItem.append(createEl('span', { className: 'meta-label', text: 'Est. pool bits' }));
    this.entropyValueEl = createEl('span', { className: 'meta-value', text: '0 bits' });
    entropyItem.append(this.entropyValueEl);

    const hintItem = createEl('div', { className: 'meta-item' });
    hintItem.append(createEl('span', { className: 'meta-label', text: 'Offline estimate' }));
    this.hintValueEl = createEl('span', {
      className: 'meta-value',
      text: 'Enter a password'
    });
    hintItem.append(this.hintValueEl);

    metaGrid.append(lengthItem, entropyItem, hintItem);

    this.root.append(heading, headerRow, this.trackEl, metaGrid);
  }

  private cancelUpgradeRaf(): void {
    if (this.upgradeRafId !== null) {
      window.cancelAnimationFrame(this.upgradeRafId);
      this.upgradeRafId = null;
    }
  }

  public update(analysis: PasswordAnalysis): void {
    const { scoring, metrics } = analysis;
    const nextTier = scoring.tier;
    const prevTier = this.previousTier;
    const isTierChange = nextTier !== prevTier;
    const isUpgrade = TIER_RANK[nextTier] > TIER_RANK[prevTier];
    this.previousTier = nextTier;

    this.badgeEl.textContent = scoring.tierLabel;
    this.badgeEl.setAttribute('data-tier', nextTier);
    this.fillEl.setAttribute('data-tier', nextTier);

    if (isTierChange) {
      this.cancelUpgradeRaf();
      this.trackEl.classList.remove('is-upgraded');
      this.badgeEl.classList.remove('is-tier-pop');

      if (nextTier !== 'empty') {
        this.upgradeRafId = window.requestAnimationFrame(() => {
          this.upgradeRafId = null;
          if (this.previousTier !== nextTier) return;
          this.badgeEl.classList.add('is-tier-pop');
          if (isUpgrade) {
            this.trackEl.classList.add('is-upgraded');
          }
        });
      }
    }

    this.scoreEl.textContent = `${scoring.score} / 100`;
    this.trackEl.setAttribute('aria-valuenow', String(scoring.score));
    this.trackEl.setAttribute(
      'aria-valuetext',
      `${scoring.tierLabel}, ${scoring.score} out of 100`
    );

    const charWord = metrics.effectiveLength === 1 ? 'char' : 'chars';
    this.lengthValueEl.textContent = `${metrics.effectiveLength} ${charWord}`;
    this.entropyValueEl.textContent = `${scoring.estimatedEntropyBits} bits`;
    this.hintValueEl.textContent = scoring.crackTimeHint;
  }
}
