import type { PasswordAnalysis } from '../../domain/types.ts';
import { MAX_INPUT_CODE_UNITS, MAX_PATTERN_SCAN_CHARS } from '../../domain/types.ts';
import { clearNode, createEl } from '../dom.ts';

export class FindingsAndTips {
  public readonly root: HTMLElement;
  private readonly bodyEl: HTMLDivElement;

  public constructor() {
    this.root = createEl('section', {
      className: 'card',
      attrs: { 'aria-labelledby': 'findings-heading' }
    });

    const heading = createEl('h2', {
      className: 'card-title',
      text: 'Pattern Findings & Suggestions',
      attrs: { id: 'findings-heading' }
    });

    this.bodyEl = createEl('div');
    this.root.append(heading, this.bodyEl);
  }

  public update(analysis: PasswordAnalysis): void {
    clearNode(this.bodyEl);

    if (analysis.wasTruncatedForInputCap) {
      this.bodyEl.append(
        createEl('div', {
          className: 'banner',
          text: `Input exceeded ${MAX_INPUT_CODE_UNITS} UTF-16 code units and was safely truncated before analysis. Score reflects only the analyzed prefix.`
        })
      );
    }

    if (analysis.wasInputTruncatedForPatterns) {
      this.bodyEl.append(
        createEl('div', {
          className: 'banner',
          text: `Pattern scanning is bounded to the first ${MAX_PATTERN_SCAN_CHARS} characters to keep local evaluation responsive.`
        })
      );
    }

    this.bodyEl.append(
      createEl('h3', { className: 'section-subtitle', text: 'Detected Patterns' })
    );

    if (analysis.findings.length === 0) {
      this.bodyEl.append(
        createEl('p', {
          className: 'empty-note',
          text: analysis.isEmpty
            ? 'No input to scan yet.'
            : 'No common passwords or predictable patterns detected by offline checks.'
        })
      );
    } else {
      const list = createEl('ul', { className: 'findings-list' });
      for (const finding of analysis.findings) {
        list.append(
          createEl('li', {
            className: 'finding-item',
            text: finding.message,
            attrs: { 'data-severity': finding.severity }
          })
        );
      }
      this.bodyEl.append(list);
    }

    this.bodyEl.append(
      createEl('h3', { className: 'section-subtitle', text: 'Actionable Suggestions' })
    );

    const tipsList = createEl('ul', { className: 'suggestions-list' });
    for (const tip of analysis.suggestions) {
      tipsList.append(createEl('li', { className: 'suggestion-item', text: tip }));
    }
    this.bodyEl.append(tipsList);
  }
}
