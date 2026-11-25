import { generatePassword, validateGeneratorOptions } from '../../domain/generator.ts';
import { MAX_GENERATED_LENGTH } from '../../domain/types.ts';
import type { GeneratorOptions } from '../../domain/types.ts';
import { createEl } from '../dom.ts';

const MIN_UI_GENERATED_LENGTH = 8;

export interface GeneratorPanelCallbacks {
  onUsePassword: (password: string) => void;
  onCopyPassword: (password: string) => void;
  onGeneratedAnnouncement: (message: string) => void;
}

export class GeneratorPanel {
  public readonly root: HTMLElement;
  private readonly lengthNumberEl: HTMLInputElement;
  private readonly lengthRangeEl: HTMLInputElement;
  private readonly lowerCb: HTMLInputElement;
  private readonly upperCb: HTMLInputElement;
  private readonly numberCb: HTMLInputElement;
  private readonly symbolCb: HTMLInputElement;
  private readonly ambiguousCb: HTMLInputElement;
  private readonly validationEl: HTMLParagraphElement;
  private readonly generateBtn: HTMLButtonElement;
  private readonly outputCodeEl: HTMLElement;
  private readonly poolHintEl: HTMLParagraphElement;
  private readonly toggleBtn: HTMLButtonElement;
  private readonly copyBtn: HTMLButtonElement;
  private readonly useBtn: HTMLButtonElement;
  private readonly clearBtn: HTMLButtonElement;
  private readonly statusEl: HTMLParagraphElement;
  private currentGenerated = '';
  private isRevealed = true;

  public constructor(callbacks: GeneratorPanelCallbacks) {
    this.root = createEl('section', {
      className: 'card',
      attrs: { 'aria-labelledby': 'generator-heading' }
    });

    const heading = createEl('h2', {
      className: 'card-title',
      text: 'Web Crypto Password Generator',
      attrs: { id: 'generator-heading' }
    });

    const lengthRow = createEl('div', { className: 'generator-length-row' });
    const lengthLabel = createEl('label', {
      className: 'field-label',
      text: `Password length (${MIN_UI_GENERATED_LENGTH}–${MAX_GENERATED_LENGTH})`,
      attrs: { for: 'generator-length-number' }
    });
    this.lengthNumberEl = createEl('input', {
      className: 'number-input',
      attrs: {
        id: 'generator-length-number',
        type: 'number',
        min: String(MIN_UI_GENERATED_LENGTH),
        max: String(MAX_GENERATED_LENGTH),
        value: '20'
      }
    });
    lengthRow.append(lengthLabel, this.lengthNumberEl);

    this.lengthRangeEl = createEl('input', {
      className: 'range-input',
      attrs: {
        id: 'generator-length-range',
        type: 'range',
        min: String(MIN_UI_GENERATED_LENGTH),
        max: String(MAX_GENERATED_LENGTH),
        value: '20',
        'aria-label': 'Password length slider'
      }
    });

    const checkboxGrid = createEl('div', { className: 'checkbox-grid' });
    this.lowerCb = this.addCheckbox(checkboxGrid, 'gen-lower', 'Lowercase (a–z)', true);
    this.upperCb = this.addCheckbox(checkboxGrid, 'gen-upper', 'Uppercase (A–Z)', true);
    this.numberCb = this.addCheckbox(checkboxGrid, 'gen-numbers', 'Numbers (0–9)', true);
    this.symbolCb = this.addCheckbox(checkboxGrid, 'gen-symbols', 'Symbols (!@#…)', true);
    this.ambiguousCb = this.addCheckbox(
      checkboxGrid,
      'gen-ambiguous',
      'Exclude ambiguous characters (0, O, o, 1, l, I, |)',
      false
    );

    this.validationEl = createEl('p', {
      className: 'validation-error',
      attrs: { hidden: 'true', role: 'alert', 'aria-live': 'polite' }
    });

    this.generateBtn = createEl('button', {
      className: 'btn btn-primary',
      text: 'Generate Secure Password',
      attrs: { type: 'button' }
    });

    const outputBox = createEl('div', { className: 'generated-output-box' });
    this.outputCodeEl = createEl('code', {
      className: 'generated-code',
      text: 'Click Generate to create a password using crypto.getRandomValues().'
    });
    outputBox.append(this.outputCodeEl);

    this.poolHintEl = createEl('p', { className: 'hint-line' });

    this.toggleBtn = createEl('button', {
      className: 'btn',
      text: 'Hide',
      attrs: {
        type: 'button',
        disabled: 'true',
        'aria-pressed': 'true',
        'aria-label': 'Hide generated password'
      }
    });
    this.copyBtn = createEl('button', {
      className: 'btn',
      text: 'Copy',
      attrs: { type: 'button', disabled: 'true' }
    });
    this.useBtn = createEl('button', {
      className: 'btn',
      text: 'Analyze this password',
      attrs: { type: 'button', disabled: 'true' }
    });
    this.clearBtn = createEl('button', {
      className: 'btn btn-subtle',
      text: 'Clear',
      attrs: { type: 'button', disabled: 'true' }
    });

    const actions = createEl('div', { className: 'button-group' });
    actions.append(this.toggleBtn, this.copyBtn, this.useBtn, this.clearBtn);

    this.statusEl = createEl('p', { className: 'status-line' });

    this.root.append(
      heading,
      lengthRow,
      this.lengthRangeEl,
      checkboxGrid,
      this.validationEl,
      this.generateBtn,
      outputBox,
      this.poolHintEl,
      actions,
      this.statusEl
    );

    this.lengthNumberEl.addEventListener('input', () => {
      const parsed = Number.parseInt(this.lengthNumberEl.value, 10);
      if (Number.isInteger(parsed)) {
        const clamped = Math.max(
          MIN_UI_GENERATED_LENGTH,
          Math.min(MAX_GENERATED_LENGTH, parsed)
        );
        this.lengthRangeEl.value = String(clamped);
      }
      this.validateCurrentOptions();
    });

    this.lengthRangeEl.addEventListener('input', () => {
      this.lengthNumberEl.value = this.lengthRangeEl.value;
      this.validateCurrentOptions();
    });

    for (const cb of [this.lowerCb, this.upperCb, this.numberCb, this.symbolCb, this.ambiguousCb]) {
      cb.addEventListener('change', () => this.validateCurrentOptions());
    }

    this.generateBtn.addEventListener('click', () => {
      if (!this.validateCurrentOptions()) return;
      try {
        const result = generatePassword(this.readOptions());
        this.currentGenerated = result.password;
        this.setRevealed(true);
        this.poolHintEl.textContent = `Character pool: ${result.charsetPoolSize} unique characters (Web Crypto CSPRNG).`;
        this.toggleBtn.disabled = false;
        this.copyBtn.disabled = false;
        this.useBtn.disabled = false;
        this.clearBtn.disabled = false;
        this.statusEl.textContent = 'New password generated locally.';
        callbacks.onGeneratedAnnouncement('Generated new password');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unable to generate password.';
        this.validationEl.textContent = msg;
        this.validationEl.removeAttribute('hidden');
      }
    });

    this.toggleBtn.addEventListener('click', () => {
      if (this.currentGenerated.length > 0) {
        this.setRevealed(!this.isRevealed);
      }
    });

    this.copyBtn.addEventListener('click', () => {
      if (this.currentGenerated.length > 0) {
        callbacks.onCopyPassword(this.currentGenerated);
      }
    });

    this.useBtn.addEventListener('click', () => {
      if (this.currentGenerated.length > 0) {
        callbacks.onUsePassword(this.currentGenerated);
      }
    });

    this.clearBtn.addEventListener('click', () => {
      this.reset();
      callbacks.onGeneratedAnnouncement('Generated password cleared');
    });

    this.validateCurrentOptions();
  }

  private addCheckbox(
    parent: HTMLElement,
    id: string,
    labelText: string,
    checked: boolean
  ): HTMLInputElement {
    const label = createEl('label', {
      className: 'checkbox-row',
      attrs: { for: id }
    });
    const cb = createEl('input', {
      className: 'checkbox-input',
      attrs: { id, type: 'checkbox' }
    });
    cb.checked = checked;
    label.append(cb, createEl('span', { text: labelText }));
    parent.append(label);
    return cb;
  }

  private setRevealed(revealed: boolean): void {
    this.isRevealed = revealed;
    if (this.currentGenerated.length > 0) {
      this.outputCodeEl.textContent = revealed
        ? this.currentGenerated
        : '•••••••••••• (hidden)';
    }
    this.toggleBtn.textContent = revealed ? 'Hide' : 'Show';
    this.toggleBtn.setAttribute('aria-pressed', revealed ? 'true' : 'false');
    this.toggleBtn.setAttribute(
      'aria-label',
      revealed ? 'Hide generated password' : 'Show generated password'
    );
  }

  public hideSecret(): void {
    if (this.currentGenerated.length > 0 && this.isRevealed) {
      this.setRevealed(false);
    }
  }

  private readOptions(): GeneratorOptions {
    const raw = this.lengthNumberEl.value.trim();
    const length = raw.length === 0 ? NaN : Number(raw);
    return {
      length,
      includeLowercase: this.lowerCb.checked,
      includeUppercase: this.upperCb.checked,
      includeNumbers: this.numberCb.checked,
      includeSymbols: this.symbolCb.checked,
      excludeAmbiguous: this.ambiguousCb.checked
    };
  }

  private validateCurrentOptions(): boolean {
    try {
      const options = this.readOptions();
      const { combinedPool } = validateGeneratorOptions(options);
      if (options.length < MIN_UI_GENERATED_LENGTH) {
        throw new RangeError(
          `Password length must be at least ${MIN_UI_GENERATED_LENGTH} characters.`
        );
      }
      this.validationEl.setAttribute('hidden', 'true');
      this.validationEl.textContent = '';
      this.generateBtn.disabled = false;
      this.poolHintEl.textContent = `Active character pool: ${combinedPool.length} unique characters.`;
      return true;
    } catch (err) {
      this.validationEl.textContent =
        err instanceof Error ? err.message : 'Invalid generator configuration.';
      this.validationEl.removeAttribute('hidden');
      this.generateBtn.disabled = true;
      return false;
    }
  }

  public setStatus(message: string): void {
    this.statusEl.textContent = message;
  }

  public reset(): void {
    this.currentGenerated = '';
    this.isRevealed = true;
    this.outputCodeEl.textContent =
      'Click Generate to create a password using crypto.getRandomValues().';
    this.toggleBtn.disabled = true;
    this.toggleBtn.textContent = 'Hide';
    this.toggleBtn.setAttribute('aria-pressed', 'true');
    this.toggleBtn.setAttribute('aria-label', 'Hide generated password');
    this.copyBtn.disabled = true;
    this.useBtn.disabled = true;
    this.clearBtn.disabled = true;
    this.statusEl.textContent = '';
    this.validateCurrentOptions();
  }
}
