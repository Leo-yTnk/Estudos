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

export interface Entry {
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

export type EntryInput = Pick<Entry, 'title' | 'note' | 'kind' | 'importance' | 'effort' | 'minutes' | 'dueAt'>;

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
