import { getSchema } from '@tiptap/core';
import { EditorState, TextSelection } from '@tiptap/pm/state';
import { describe, expect, it } from 'vitest';
import { documentExtensions } from './documents';
import { canMoveBlock, moveBlock } from './editorBlocks';

const schema = getSchema(documentExtensions);

describe('reordenação de blocos no caderno', () => {
  const doc = schema.node('doc', null, [
    schema.node('paragraph', null, schema.text('Primeiro')),
    schema.node('paragraph', null, schema.text('Segundo')),
  ]);

  it('move o bloco inteiro e preserva a seleção, inclusive invertida', () => {
    const state = EditorState.create({ doc, selection: TextSelection.create(doc, 15, 12) });
    const transaction = moveBlock(state, -1);
    expect(transaction?.doc.firstChild?.textContent).toBe('Segundo');
    expect(transaction?.selection.anchor).toBe(5);
    expect(transaction?.selection.head).toBe(2);
    const next = state.apply(transaction!);
    expect(moveBlock(next, 1)?.doc.eq(doc)).toBe(true);
  });

  it('desabilita ações no limite e em seleções que atravessam blocos', () => {
    const first = EditorState.create({ doc, selection: TextSelection.create(doc, 2) });
    expect(canMoveBlock(first, -1)).toBe(false);
    expect(moveBlock(first, -1)).toBeNull();
    const across = EditorState.create({ doc, selection: TextSelection.create(doc, 2, 12) });
    expect(canMoveBlock(across, 1)).toBe(false);
  });
});
