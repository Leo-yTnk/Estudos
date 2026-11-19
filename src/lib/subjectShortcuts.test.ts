import { describe, expect, it } from 'vitest';
import { emptyData } from '../types';
import { validateData } from './storage';
import { subjectShortcuts } from './subjectShortcuts';

const subjects = emptyData().subjects;
const at = (day: number, hour: number) => new Date(2026, 10, day, hour).toISOString();
const visits = [
  { subjectId: 'math', at: at(1, 10) },
  { subjectId: 'math', at: at(2, 10) },
  { subjectId: 'math', at: at(3, 10) },
  { subjectId: 'portuguese', at: at(2, 14) },
  { subjectId: 'science', at: at(3, 11) },
  { subjectId: 'history', at: at(8, 14) },
];

describe('atalhos de matérias', () => {
  it('sugere primeiro a mais acessada na faixa atual e usa frequência geral para as demais', () => {
    const result = subjectShortcuts(subjects, visits, new Date(2026, 10, 6, 14, 30));
    expect(result.map(({ id }) => id)).toEqual(['portuguese', 'math', 'science', 'history']);
  });

  it('usa frequência geral quando ainda não há visitas na hora atual e limita a seis', () => {
    const more = [...subjects, ...['Artes', 'Biologia', 'Filosofia', 'Química'].map((title) => ({ id: title, title, color: 'mint' as const }))];
    const result = subjectShortcuts(more, visits, new Date(2026, 10, 6, 18));
    expect(result[0].id).toBe('math');
    expect(result).toHaveLength(6);
  });

  it('aceita backups antigos e mantém a configuração de novos ícones, cores e histórico', () => {
    const data = { ...emptyData(), subjects: [{ id: 'math', color: 'cobalt', icon: 'rocket', title: 'Matemática' }] };
    expect(validateData({ ...data, subjectVisits: undefined }).subjectVisits).toEqual([]);
    const restored = validateData({ ...data, subjectVisits: [...visits, { subjectId: 'math', at: 'inválido' }] });
    expect(restored.subjects).toEqual(data.subjects);
    expect(restored.subjectVisits).toEqual(visits.slice(0, 3));
  });
});
