import type { CriterionCheck, CriterionId } from '../../domain/types.ts';
import { createEl } from '../dom.ts';

interface CriterionRowRefs {
  li: HTMLLIElement;
  markEl: HTMLSpanElement;
  labelEl: HTMLSpanElement;
  met: boolean;
  rafId: number | null;
}

export class CriteriaChecklist {
  public readonly root: HTMLElement;
  private readonly listEl: HTMLUListElement;
  private readonly rowMap = new Map<CriterionId, CriterionRowRefs>();

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
    const activeIds = new Set<CriterionId>();
    for (const item of criteria) {
      activeIds.add(item.id);
    }

    for (const [id, row] of this.rowMap.entries()) {
      if (!activeIds.has(id)) {
        if (row.rafId !== null) {
          window.cancelAnimationFrame(row.rafId);
        }
        row.li.remove();
        this.rowMap.delete(id);
      }
    }

    criteria.forEach((item, index) => {
      let row = this.rowMap.get(item.id);
      if (row === undefined) {
        const li = createEl('li', {
          className: 'criterion-item',
          attrs: { 'data-met': item.met ? 'true' : 'false' }
        });
        const markEl = createEl('span', {
          className: 'criterion-mark',
          text: item.met ? '✓' : '—',
          attrs: { 'aria-hidden': 'true' }
        });
        const labelEl = createEl('span', { text: item.label });
        li.append(markEl, labelEl);

        const created: CriterionRowRefs = {
          li,
          markEl,
          labelEl,
          met: item.met,
          rafId: null
        };

        li.addEventListener('animationend', (event: AnimationEvent) => {
          if (event.target === li) {
            li.classList.remove('is-just-met');
          }
        });

        this.rowMap.set(item.id, created);
        row = created;
      } else {
        const justMet = !row.met && item.met;
        if (row.met !== item.met) {
          row.met = item.met;
          row.li.setAttribute('data-met', item.met ? 'true' : 'false');
          row.markEl.textContent = item.met ? '✓' : '—';
        }
        if (row.labelEl.textContent !== item.label) {
          row.labelEl.textContent = item.label;
        }
        if (row.rafId !== null) {
          window.cancelAnimationFrame(row.rafId);
          row.rafId = null;
        }
        if (justMet) {
          row.li.classList.remove('is-just-met');
          const targetRow = row;
          row.rafId = window.requestAnimationFrame(() => {
            targetRow.rafId = null;
            if (!targetRow.met) return;
            targetRow.li.classList.add('is-just-met');
          });
        } else if (!item.met) {
          row.li.classList.remove('is-just-met');
        }
      }

      const currentAtSlot = this.listEl.children.item(index);
      if (currentAtSlot !== row.li) {
        this.listEl.insertBefore(row.li, currentAtSlot);
      }
    });
  }
}
