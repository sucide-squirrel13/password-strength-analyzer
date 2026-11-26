import { MAX_INPUT_CODE_UNITS } from '../../domain/types.ts';
import { createEl } from '../dom.ts';

export type StatusState = 'neutral' | 'success' | 'error';

export interface PasswordInputCallbacks {
  onInput: (value: string) => void;
  onCopy: () => void;
  onClearClipboard: () => void;
  onReset: () => void;
}

export class PasswordInputPanel {
  public readonly root: HTMLElement;
  private readonly inputEl: HTMLInputElement;
  private readonly toggleBtn: HTMLButtonElement;
  private readonly copyBtn: HTMLButtonElement;
  private readonly clearClipboardBtn: HTMLButtonElement;
  private readonly resetBtn: HTMLButtonElement;
  private readonly statusLine: HTMLParagraphElement;
  private isRevealed = false;
  private copyFeedbackTimer: number | null = null;

  public constructor(callbacks: PasswordInputCallbacks) {
    this.root = createEl('section', {
      className: 'card',
      attrs: {
        id: 'analyzer-section',
        tabindex: '-1',
        'aria-labelledby': 'input-heading'
      }
    });

    const heading = createEl('h2', {
      className: 'card-title',
      text: 'Analyze Password',
      attrs: { id: 'input-heading' }
    });

    const label = createEl('label', {
      className: 'field-label',
      text: 'Enter a password or passphrase to inspect locally',
      attrs: { for: 'analyzer-password-input' }
    });

    this.inputEl = createEl('input', {
      className: 'password-input',
      attrs: {
        id: 'analyzer-password-input',
        type: 'password',
        maxlength: String(MAX_INPUT_CODE_UNITS),
        placeholder: 'Type or paste password…',
        autocomplete: 'new-password',
        spellcheck: 'false',
        autocapitalize: 'off',
        autocorrect: 'off',
        enterkeyhint: 'done',
        'data-lpignore': 'true',
        'data-1p-ignore': 'true',
        'data-bwignore': 'true',
        'data-form-type': 'other'
      }
    });

    this.toggleBtn = createEl('button', {
      className: 'btn',
      text: 'Show',
      attrs: {
        type: 'button',
        'aria-pressed': 'false',
        'aria-label': 'Show password'
      }
    });

    const inputRow = createEl('div', { className: 'input-row' });
    inputRow.append(this.inputEl, this.toggleBtn);

    this.copyBtn = createEl('button', {
      className: 'btn',
      text: 'Copy',
      attrs: { type: 'button', disabled: 'true' }
    });

    this.clearClipboardBtn = createEl('button', {
      className: 'btn btn-subtle',
      text: 'Clear clipboard',
      attrs: { type: 'button' }
    });

    this.resetBtn = createEl('button', {
      className: 'btn btn-subtle',
      text: 'Clear / Reset',
      attrs: { type: 'button' }
    });

    const btnGroup = createEl('div', { className: 'button-group' });
    btnGroup.append(this.copyBtn, this.clearClipboardBtn, this.resetBtn);

    this.statusLine = createEl('p', {
      className: 'status-line',
      attrs: { 'data-state': 'neutral' }
    });
    const clipboardHint = createEl('p', {
      className: 'hint-line',
      text: 'Note: Copied passwords may remain in your OS or cloud clipboard history until overwritten or cleared.'
    });

    this.root.append(heading, label, inputRow, btnGroup, this.statusLine, clipboardHint);

    this.inputEl.addEventListener('input', () => {
      const value = this.inputEl.value;
      this.syncActionState(value.length > 0);
      if (value.length === 0) {
        this.clearCopyFeedback();
      }
      callbacks.onInput(value);
    });

    this.toggleBtn.addEventListener('click', () => {
      this.setRevealed(!this.isRevealed);
    });

    this.copyBtn.addEventListener('click', () => callbacks.onCopy());
    this.clearClipboardBtn.addEventListener('click', () => callbacks.onClearClipboard());
    this.resetBtn.addEventListener('click', () => callbacks.onReset());
  }

  private syncActionState(hasValue: boolean): void {
    this.copyBtn.disabled = !hasValue;
  }

  private setRevealed(revealed: boolean): void {
    this.isRevealed = revealed;
    this.inputEl.type = revealed ? 'text' : 'password';
    this.toggleBtn.textContent = revealed ? 'Hide' : 'Show';
    this.toggleBtn.setAttribute('aria-pressed', revealed ? 'true' : 'false');
    this.toggleBtn.setAttribute('aria-label', revealed ? 'Hide password' : 'Show password');
  }

  private clearCopyFeedback(): void {
    if (this.copyFeedbackTimer !== null) {
      window.clearTimeout(this.copyFeedbackTimer);
      this.copyFeedbackTimer = null;
    }
    this.copyBtn.removeAttribute('data-copied');
    this.copyBtn.textContent = 'Copy';
  }

  public markCopied(): void {
    this.clearCopyFeedback();
    this.copyBtn.setAttribute('data-copied', 'true');
    this.copyBtn.textContent = 'Copied';
    this.copyFeedbackTimer = window.setTimeout(() => {
      this.copyFeedbackTimer = null;
      this.copyBtn.removeAttribute('data-copied');
      this.copyBtn.textContent = 'Copy';
    }, 1800);
  }

  public hideSecret(): void {
    if (this.isRevealed) {
      this.setRevealed(false);
    }
  }

  public getValue(): string {
    return this.inputEl.value;
  }

  public setValue(value: string): void {
    this.inputEl.value = value;
    this.syncActionState(value.length > 0);
    if (value.length === 0) {
      this.clearCopyFeedback();
    }
  }

  public setStatus(message: string, state: StatusState = 'neutral'): void {
    if (state !== 'success') {
      this.clearCopyFeedback();
    }
    this.statusLine.textContent = message;
    this.statusLine.setAttribute('data-state', state);
  }

  public reset(focusInput = true): void {
    this.inputEl.value = '';
    this.hideSecret();
    this.clearCopyFeedback();
    this.syncActionState(false);
    this.statusLine.textContent = '';
    this.statusLine.setAttribute('data-state', 'neutral');
    if (focusInput) {
      this.inputEl.focus();
    }
  }
}
