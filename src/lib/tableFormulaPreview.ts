import { Extension } from '@tiptap/core';
import type { Node } from '@tiptap/pm/model';
import { Plugin } from '@tiptap/pm/state';
import { TableMap } from '@tiptap/pm/tables';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { evaluateTableFormulas, isTableFormula } from './tableFormulas';

const number = new Intl.NumberFormat('pt-BR', { maximumSignificantDigits: 12 });
type Preview = { position: number; label: string; error: boolean };

export const tableFormulaPreview = Extension.create({
  name: 'tableFormulaPreview',
  addProseMirrorPlugins() {
    const cache = new WeakMap<Node, Preview[]>();
    function tablePreviews(table: Node) {
      const previous = cache.get(table);
      if (previous) return previous;
      const previews: Preview[] = [];
      cache.set(table, previews);

      const cells = new Map<number, { text: string; end: number }>();
      table.forEach((row, rowOffset) => row.forEach((cell, cellOffset) => {
        const start = rowOffset + 1 + cellOffset;
        const paragraph = cell.firstChild;
        const text = cell.childCount === 1 && paragraph?.isTextblock && paragraph.content.size === paragraph.textContent.length
          ? paragraph.textContent : '';
        cells.set(start, { text, end: start + 1 + cell.content.size });
      }));
      if (!Array.from(cells.values()).some(({ text }) => isTableFormula(text))) return previews;

      const { width, height, map } = TableMap.get(table);
      const grid = Array.from({ length: height }, (_, row) => map.slice(row * width, (row + 1) * width)
        .map((offset) => cells.get(offset)));
      const results = evaluateTableFormulas(grid);
      for (const cell of cells.values()) {
        const result = results.get(cell);
        if (!result) continue;
        if ('error' in result) previews.push({ position: cell.end, label: result.error, error: true });
        else previews.push({ position: cell.end, label: 'Resultado: ' + number.format(result.value), error: false });
      }
      return previews;
    }

    function build(doc: Node) {
      const decorations: Decoration[] = [];
      doc.descendants((node, pos) => {
        if (node.type.name !== 'table') return;
        for (const { position, label, error } of tablePreviews(node)) {
          decorations.push(Decoration.widget(pos + 1 + position, (view) => {
            const output = view.dom.ownerDocument.createElement('div');
            output.className = 'note-formula-result';
            output.dataset.error = String(error);
            output.textContent = label;
            return output;
          }, { key: label, side: -1, ignoreSelection: true }));
        }
      });
      return DecorationSet.create(doc, decorations);
    }

    return [new Plugin<DecorationSet>({
      state: {
        init: (_, state) => build(state.doc),
        apply: (transaction, previous) => transaction.docChanged ? build(transaction.doc) : previous,
      },
      props: { decorations(state) { return this.getState(state); } },
    })];
  },
});
