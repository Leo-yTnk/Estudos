import { getSchema } from '@tiptap/core';
import { EditorState, TextSelection } from '@tiptap/pm/state';
import { describe, expect, it } from 'vitest';
import { documentExtensions } from './documents';
import { selectionTypography } from './selectionTypography';

const schema = getSchema(documentExtensions);
const doc = schema.nodeFromJSON({
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Título' }] },
    { type: 'paragraph', content: [
      { type: 'text', text: 'Lorem', marks: [{ type: 'textStyle', attrs: { fontWeight: 500, fontSize: '18px', fontFamily: 'Inter' } }] },
      { type: 'text', text: 'ipsum', marks: [{ type: 'bold' }] },
    ] },
  ],
});
const paragraphStart = doc.firstChild!.nodeSize + 1;
const select = (from: number, to = from) => EditorState.create({ doc, selection: TextSelection.create(doc, from, to) });

describe('tipografia da seleção do caderno', () => {
  it('relata o nível, o peso e as propriedades da fonte de um trecho uniforme', () => {
    expect(selectionTypography(select(paragraphStart, paragraphStart + 5), {})).toMatchObject({
      level: 0, weight: 500, fontSize: '18px', fontFamily: 'Inter',
    });
  });

  it('indica diferenças entre blocos e entre trechos do mesmo bloco', () => {
    const result = selectionTypography(select(1, paragraphStart + 10), {});
    expect(result).toMatchObject({ level: 'Misto', weight: 'Misto', fontSize: 'Misto', fontFamily: 'Misto' });
    expect(result.mark('bold')).toBe('Misto');
    expect(selectionTypography(select(paragraphStart, paragraphStart + 10), {}).level).toBe(0);
  });

  it('ignora o bloco seguinte quando a seleção termina antes de seu texto', () => {
    expect(selectionTypography(select(1, paragraphStart), { h2: { weight: 600 } })).toMatchObject({ level: 2, weight: 600 });
  });

  it('mostra a formatação preparada para digitação no cursor', () => {
    const state = select(paragraphStart);
    const transaction = state.tr.addStoredMark(schema.marks.textStyle.create({ fontWeight: 300 }));
    expect(selectionTypography(state.apply(transaction), {}).weight).toBe(300);
  });
});
