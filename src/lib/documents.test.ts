import { describe, expect, it } from 'vitest';
import { fromBlocks, noteText, safeLink, validateDocument } from './documents';
import { validateData } from './storage';
import { emptyData, type StudyNote } from '../types';

describe('documentos do NowWork', () => {
  it('preserva texto, quebra de linha, título, checklist, ordem e link dos cadernos antigos', () => {
    const note: StudyNote = {
      id: '1', subjectId: 'math', title: 'Álgebra', updatedAt: '',
      blocks: [
        { id: 'a', type: 'heading', text: 'Equações' },
        { id: 'b', type: 'text', text: 'Ler\nRevisar' },
        { id: 'c', type: 'check', text: 'Passo 1', checked: true },
        { id: 'd', type: 'check', text: 'Passo 2', checked: false },
        { id: 'e', type: 'link', text: 'Material', url: 'https://example.org/aula' },
      ],
    };
    const content = validateDocument(fromBlocks(note.blocks));
    expect(content?.content?.map((node) => node.type)).toEqual(['heading', 'paragraph', 'taskList', 'paragraph']);
    expect(content?.content?.[1]?.content?.[1]?.type).toBe('hardBreak');
    expect(content?.content?.[2]?.content?.map((item) => item.attrs?.checked)).toEqual([true, false]);
    expect(noteText({ ...note, content })).toBe('Equações Ler Revisar Passo 1 Passo 2 Material https://example.org/aula');
  });

  it('reabre um backup com formatação sem trocar o conteúdo pelos blocos antigos', () => {
    const content = {
      type: 'doc', content: [{ type: 'paragraph', content: [
        { type: 'text', text: 'Texto novo', marks: [{ type: 'bold' }, { type: 'underline' }] },
      ] }],
    };
    const data = validateData({ ...emptyData(), notes: [{
      id: '1', subjectId: 'math', title: 'Resumo', blocks: [{ id: 'a', type: 'text', text: 'Texto antigo' }], content,
    }] });
    expect(data.notes[0].content).toMatchObject(content);
    expect(noteText(data.notes[0])).toBe('Texto novo');
  });

  it('restaura tabelas, realces e alinhamento da nova barra', () => {
    const formatted = { type: 'paragraph', attrs: { textAlign: 'center' }, content: [
      { type: 'text', text: 'Fórmula', marks: [{ type: 'highlight' }] },
    ] };
    const content = { type: 'doc', content: [{ type: 'table', content: [{ type: 'tableRow', content: [
      { type: 'tableCell', content: [formatted] },
    ] }] }] };
    expect(validateDocument(content)).toMatchObject(content);
  });

  it('recusa links executáveis e estruturas fora do esquema', () => {
    expect(safeLink('javascript:alert(1)')).toBeNull();
    expect(validateDocument({ type: 'doc', content: [{ type: 'text', text: 'solto' }] })).toBeUndefined();
    expect(validateDocument({ type: 'doc', content: [{
      type: 'paragraph', content: [{ type: 'text', text: 'link', marks: [{ type: 'link', attrs: { href: 'data:text/html,body' } }] }],
    }] })).toBeUndefined();
  });
});
