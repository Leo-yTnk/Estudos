import type { JSONContent } from '@tiptap/core';

export type EntryKind = 'task' | 'event' | 'worry' | 'idea';
export type EntryStatus = 'active' | 'done' | 'archived';
export type Energy = 1 | 2 | 3;
export type Importance = 1 | 2 | 3;
export type Theme = 'system' | 'light' | 'dark';

export interface Step {
  id: string;
  title: string;
  done: boolean;
  awarded: boolean;
}

export const SUBJECT_COLORS = ['mint', 'violet', 'blue', 'peach', 'rose'] as const;
export type SubjectColor = typeof SUBJECT_COLORS[number];
export interface Subject { id: string; title: string; color: SubjectColor }
export const BLOCK_TYPES = ['text', 'heading', 'check', 'link'] as const;
export interface NoteBlock { id: string; type: typeof BLOCK_TYPES[number]; text: string; checked?: boolean; url?: string }
export interface StudyNote { id: string; subjectId: string; title: string; blocks: NoteBlock[]; content?: JSONContent; updatedAt: string }
export interface Flashcard { id: string; subjectId: string; front: string; back: string; due: string; interval: number }

export interface Entry {
  subjectId?: string;
  id: string;
  title: string;
  note: string;
  kind: EntryKind;
  status: EntryStatus;
  importance: Importance;
  effort: Energy;
  minutes: number;
  dueAt: string | null;
  steps: Step[];
  postponeCount: number;
  source: 'user' | 'demo';
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export type EntryInput = Pick<Entry, 'title' | 'note' | 'kind' | 'importance' | 'effort' | 'minutes' | 'dueAt' | 'subjectId'>;

export interface Reward {
  id: string;
  title: string;
  cost: number;
  createdAt: string;
}

export type ActivityKind = 'complete' | 'step' | 'rest' | 'focus' | 'redeem';

export interface Activity {
  id: string;
  kind: ActivityKind;
  label: string;
  points: number;
  minutes?: number;
  entryId?: string;
  at: string;
}

export interface AppData {
  version: 1;
  profile: {
    name: string;
    energy: Energy;
    theme: Theme;
    reducedMotion: boolean;
  };
  subjects: Subject[];
  notes: StudyNote[];
  flashcards: Flashcard[];
  entries: Entry[];
  rewards: Reward[];
  activity: Activity[];
  focus: { entryId: string; startedAt: string } | null;
  break: { startedAt: string; minutes: number } | null;
}

export function emptyData(): AppData {
  return {
    version: 1,
    profile: { name: '', energy: 2, theme: 'system', reducedMotion: false },
    subjects: [
      { id: 'math', title: 'Matemática', color: 'mint' },
      { id: 'portuguese', title: 'Português', color: 'violet' },
      { id: 'science', title: 'Ciências', color: 'blue' },
      { id: 'history', title: 'História', color: 'peach' },
    ],
    notes: [],
    flashcards: [],
    entries: [],
    rewards: [],
    activity: [],
    focus: null,
    break: null,
  };
}

export function uid(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const KINDS: Record<EntryKind, string> = {
  task: 'Tarefa',
  event: 'Compromisso',
  worry: 'Preocupação',
  idea: 'Ideia',
};
