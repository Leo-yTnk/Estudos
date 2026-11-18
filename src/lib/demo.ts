import { emptyData, uid } from '../types';
import type { Entry, EntryKind, AppData } from '../types';

function deadline(days: number): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, 23, 59).toISOString();
}

function example(title: string, kind: EntryKind, days: number | null, importance: 1 | 2 | 3, minutes: number, effort: 1 | 2 | 3, note = ''): Entry {
  const now = new Date().toISOString();
  return {
    id: uid(), title, kind, note, importance, minutes, effort,
    dueAt: days === null ? null : deadline(days),
    steps: [], status: 'active', postponeCount: 0, source: 'demo',
    createdAt: now, updatedAt: now, completedAt: null,
  };
}

export function demoEntries(): Entry[] {
  return [
    example('Revisar o conteúdo de matemática', 'task', 1, 3, 35, 2, 'Estudar os exercícios mais importantes.'),
    example('Organizar os arquivos do projeto', 'task', 3, 2, 20, 1),
    example('Preparar o roteiro da apresentação', 'task', 6, 3, 45, 3),
    example('Reunião de acompanhamento', 'event', 2, 2, 40, 2),
    example('Será que estou assumindo compromissos demais?', 'worry', null, 2, 10, 1, 'Nem toda preocupação precisa virar uma tarefa.'),
    example('Criar uma seção de referências favoritas', 'idea', null, 1, 15, 1),
  ];
}

export function withDemo(data: AppData): AppData {
  const withoutDemo = data.entries.filter((entry) => entry.source !== 'demo');
  return { ...data, entries: [...demoEntries(), ...withoutDemo] };
}
