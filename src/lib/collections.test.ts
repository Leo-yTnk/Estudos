import { describe, expect, it } from 'vitest';
import { getSchema } from '@tiptap/core';
import { closeHistory, history, redo, undo } from '@tiptap/pm/history';
import { EditorState, NodeSelection } from '@tiptap/pm/state';
import { createCollection, layoutFlow, localImage, moveItem, newEvent, readCollection, timelineItems } from './collections';
import { documentExtensions, noteText, validateDocument } from './documents';
import { moveBlock } from './editorBlocks';
import { validateData } from './storage';
import { emptyData } from '../types';

const schema = getSchema(documentExtensions);
const image = { src: 'data:image/png;base64,AAAA', alt: 'Imagem do resumo' };

describe('conjuntos no documento do caderno', () => {
  it('restaura texto legado, conjuntos, imagens e a preferência do editor pelo backup', () => {
    const data = emptyData();
    const cards = createCollection('cards');
    if (cards.kind !== 'cards') throw Error('Conjunto inválido');
    cards.items[0].image = image;
    cards.items[0].crop = 140;
    const timeline = createCollection('timeline');
    const flow = createCollection('flow');
    const content = { type: 'doc', attrs: { noteWidth: 'wide' }, content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'Texto antigo', marks: [{ type: 'bold' }, { type: 'superscript' }] }] },
      ...[cards, flow, timeline].map((value) => ({ type: 'collection', attrs: { value } })),
      { type: 'noteImage', attrs: { image, width: 70, align: 'left' } },
    ] };
    data.notes.push({ id: 'test', subjectId: 'math', blocks: [], content, title: 'Teste', updatedAt: '2026-11-19' });
    data.profile.toolbarMode = 'advanced';
    const restored = validateData(JSON.parse(JSON.stringify(data)));
    expect(restored.profile.toolbarMode).toBe('advanced');
    expect(restored.notes[0].content).toEqual(validateDocument(content));
    expect(restored.notes[0].content?.content?.[1].attrs?.value).toEqual(cards);
    expect(noteText(restored.notes[0])).toContain('Texto antigo Novo card Imagem do resumo');
  });

  it('desfaz e refaz mudanças em atributos mantendo seleção e movimenta o bloco inteiro', () => {
    const value = createCollection('cards');
    const block = schema.nodes.collection.create({ value });
    const text = schema.nodes.paragraph.create(null, schema.text('Texto'));
    let state = EditorState.create({ schema, plugins: [history()], doc: schema.nodes.doc.create(null, [block, text]) });
    const dispatch = (tr: typeof state.tr) => { state = state.apply(tr); };
    dispatch(state.tr.setSelection(NodeSelection.create(state.doc, 0)));
    const next = { ...value, config: { ...value.config, columns: 4 } };
    dispatch(closeHistory(state.tr.setNodeAttribute(0, 'value', next)));
    expect(state.selection).toBeInstanceOf(NodeSelection);
    expect(state.doc.firstChild?.attrs.value).toEqual(next);
    expect(undo(state, dispatch)).toBe(true);
    expect(state.doc.firstChild?.attrs.value).toEqual(value);
    expect(redo(state, dispatch)).toBe(true);
    const moved = moveBlock(state, 1);
    expect(moved).not.toBeNull();
    dispatch(closeHistory(moved!));
    expect(state.doc.lastChild?.attrs.value).toEqual(next);
    expect(state.selection.from).toBe(text.nodeSize);
    expect(undo(state, dispatch)).toBe(true);
    expect(state.doc.firstChild?.attrs.value).toEqual(next);
  });

  it('normaliza dados importados preservando pelo menos um elemento visual ou textual', () => {
    const cards = createCollection('cards');
    const restored = readCollection({ ...cards, config: { visual: 'none', title: false, description: false, columns: 900 } });
    expect(restored?.config).toMatchObject({ visual: 'none', title: true, description: false, columns: 4 });
    expect(localImage({ src: 'https://example.org/file.png' })).toBeNull();
    expect(localImage({ src: 'data:image/svg+xml,AAAA' })).toBeNull();
    expect(localImage(image)).toEqual(image);
  });

  it('ordena datas e períodos cronologicamente sem modificar a sequência manual', () => {
    const timeline = createCollection('timeline');
    if (timeline.kind !== 'timeline') throw Error('Conjunto inválido');
    const later = { ...newEvent(), date: '2027-01-03', end: '2027-01-06' };
    const earlier = { ...newEvent(), date: '2026-11-19' };
    timeline.items = [later, earlier];
    expect(timelineItems(timeline)).toEqual([earlier, later]);
    expect(timeline.items).toEqual([later, earlier]);
    expect(moveItem(timeline.items, 0, 1)).toEqual([earlier, later]);
    expect(readCollection(timeline)).toEqual(timeline);
  });

  it('organiza ramificações, preserva ciclos e remove conectores órfãos', () => {
    const flow = createCollection('flow');
    if (flow.kind !== 'flow') throw Error('Conjunto inválido');
    flow.config.orientation = 'horizontal';
    const [start, end] = flow.nodes;
    flow.nodes.push({ ...end, id: 'decision', kind: 'decision' });
    flow.edges.push({ id: 'second', from: start.id, to: 'decision', label: 'Não' });
    const [first, second, third] = layoutFlow(flow);
    expect(first.x).toBeLessThan(second.x);
    expect(second.x).toBe(third.x);
    expect(second.y).not.toBe(third.y);
    flow.edges.push({ id: 'return', from: end.id, to: start.id, label: '' });
    expect(new Set(layoutFlow(flow).map(({ x, y }) => x + ',' + y)).size).toBe(3);
    flow.edges.push({ id: 'orphan', from: end.id, to: 'missing', label: '' });
    expect(readCollection(flow)).toMatchObject({ edges: flow.edges.slice(0, 3) });
  });
});
