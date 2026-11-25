import type { CriterionCheck } from '../../domain/types.ts';
import { clearNode, createEl } from '../dom.ts';

export class CriteriaChecklist {
  public readonly root: HTMLElement;
  private readonly listEl: HTMLUListElement;

  public constructor() {
    this.root = createEl('section', {
      className: 'card',
      attrs: { 'aria-labelledby': 'criteria-heading' }
    });

    const heading = createEl('h2', {
      className: 'card-title',
      text: 'Character & Length Checks',
      attrs: { id: 'criteria-heading' }
    });

    this.listEl = createEl('ul', { className: 'criteria-list' });
    this.root.append(heading, this.listEl);
  }

  public update(criteria: readonly CriterionCheck[]): void {
    clearNode(this.listEl);
    for (const item of criteria) {
      const li = createEl('li', {
        className: 'criterion-item',
        attrs: { 'data-met': item.met ? 'true' : 'false' }
      });
      const mark = createEl('span', {
        className: 'criterion-mark',
        text: item.met ? '✓' : '—',
        attrs: { 'aria-hidden': 'true' }
      });
      const label = createEl('span', { text: item.label });
      li.append(mark, label);
      this.listEl.append(li);
    }
  }
}
