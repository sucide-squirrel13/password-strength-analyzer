import type { PasswordAnalysis } from '../../domain/types.ts';
import { createEl } from '../dom.ts';

export class StrengthMeter {
  public readonly root: HTMLElement;
  private readonly badgeEl: HTMLSpanElement;
  private readonly scoreEl: HTMLSpanElement;
  private readonly trackEl: HTMLDivElement;
  private readonly fillEl: HTMLDivElement;
  private readonly lengthValueEl: HTMLSpanElement;
  private readonly entropyValueEl: HTMLSpanElement;
  private readonly hintValueEl: HTMLSpanElement;

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

  public update(analysis: PasswordAnalysis): void {
    const { scoring, metrics } = analysis;
    this.badgeEl.textContent = scoring.tierLabel;
    this.badgeEl.setAttribute('data-tier', scoring.tier);
    this.fillEl.setAttribute('data-tier', scoring.tier);

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
