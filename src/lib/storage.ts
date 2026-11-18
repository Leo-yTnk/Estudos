import { emptyData } from '../types';
import type { AppData, Entry, Activity, Reward } from '../types';

const DB_NAME = 'brisa-app';
const STORE = 'snapshots';
const KEY = 'current';
const FALLBACK = 'brisa-fallback-v1';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('IndexedDB indisponível'));
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function validateData(value: unknown): AppData {
  if (!value || typeof value !== 'object') throw new Error('O arquivo não contém um backup válido.');
  const obj = value as Partial<AppData>;
  if (obj.version !== 1 || !obj.profile || !Array.isArray(obj.entries) || !Array.isArray(obj.activity) || !Array.isArray(obj.rewards)) {
    throw new Error('Formato de backup não reconhecido (versão 1).');
  }
  if (obj.entries.length > 3000 || obj.activity.length > 20000 || obj.rewards.length > 1000) throw new Error('Backup acima do limite de segurança.');
  const validKinds = ['task', 'event', 'worry', 'idea'];
  const validStatuses = ['active', 'done', 'archived'];
  const entries: Entry[] = obj.entries.map((entry) => {
    if (!entry || typeof entry.title !== 'string' || !validKinds.includes(entry.kind) || !validStatuses.includes(entry.status)) throw new Error('Há registros inválidos no backup.');
    return {
      id: String(entry.id || crypto.randomUUID()), title: entry.title.slice(0, 200),
      note: String(entry.note || '').slice(0, 3000), kind: entry.kind,
      status: entry.status, importance: [1,2,3].includes(entry.importance) ? entry.importance : 2,
      effort: [1,2,3].includes(entry.effort) ? entry.effort : 2,
      minutes: Math.max(5, Math.min(600, Number(entry.minutes) || 25)),
      dueAt: typeof entry.dueAt === 'string' && Number.isFinite(Date.parse(entry.dueAt)) ? entry.dueAt : null,
      steps: Array.isArray(entry.steps) ? entry.steps.slice(0, 60).filter((s) => s && typeof s.title === 'string').map((s) => ({ id: String(s.id || crypto.randomUUID()), title: s.title.slice(0, 200), done: !!s.done, awarded: !!s.awarded })) : [],
      postponeCount: Math.max(0, Math.min(100, Number(entry.postponeCount) || 0)),
      source: entry.source === 'demo' ? 'demo' : 'user',
      createdAt: String(entry.createdAt || new Date().toISOString()),
      updatedAt: String(entry.updatedAt || new Date().toISOString()),
      completedAt: typeof entry.completedAt === 'string' ? entry.completedAt : null,
    };
  });
  const activity: Activity[] = obj.activity.map((item) => {
    if (!item || typeof item.label !== 'string' || !['complete','step','rest','focus','redeem'].includes(item.kind)) throw new Error('Há eventos inválidos no backup.');
    return {
      id: String(item.id || crypto.randomUUID()),
      label: item.label.slice(0, 250),
      kind: item.kind,
      at: typeof item.at === 'string' && Number.isFinite(Date.parse(item.at)) ? item.at : new Date().toISOString(),
      points: Math.max(-100000, Math.min(100000, Math.trunc(Number(item.points) || 0))),
      minutes: item.minutes === undefined ? undefined : Math.max(0, Number(item.minutes) || 0),
      entryId: typeof item.entryId === 'string' ? item.entryId : undefined,
    };
  });
  const rewards: Reward[] = obj.rewards.map((item) => {
    if (!item || typeof item.title !== 'string') throw new Error('Há recompensas inválidas no backup.');
    return { id: String(item.id || crypto.randomUUID()), title: item.title.slice(0, 150),
      cost: Math.max(1, Math.min(100000, Math.trunc(Number(item.cost) || 1))),
      createdAt: String(item.createdAt || new Date().toISOString()) };
  });
  const base = emptyData();
  const profile = obj.profile;
  return {
    version: 1,
    profile: {
      name: String(profile.name || '').slice(0, 50),
      energy: [1,2,3].includes(profile.energy) ? profile.energy : 2,
      theme: ['light','dark','system'].includes(profile.theme) ? profile.theme : 'system',
      reducedMotion: !!profile.reducedMotion,
    },
    entries, rewards, activity,
    focus: obj.focus && typeof obj.focus.entryId === 'string' && typeof obj.focus.startedAt === 'string' ? obj.focus : null,
    break: obj.break && typeof obj.break.startedAt === 'string' && Number.isFinite(obj.break.minutes)
      ? { startedAt: obj.break.startedAt, minutes: Math.max(1, Math.min(60, obj.break.minutes)) } : null,
  };
}

export async function loadData(): Promise<AppData> {
  try {
    const db = await openDatabase();
    const raw = await new Promise<unknown>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const request = tx.objectStore(STORE).get(KEY);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    if (raw !== undefined) return validateData(raw);
  } catch (error) {
    console.warn('Brisa: leitura do IndexedDB indisponível.', error);
  }
  try {
    const fallback = localStorage.getItem(FALLBACK);
    return fallback ? validateData(JSON.parse(fallback)) : emptyData();
  } catch {
    return emptyData();
  }
}

export async function saveData(data: AppData): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(data, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    localStorage.setItem(FALLBACK, JSON.stringify(data));
  } catch (error) {
    // Último recurso para navegadores que bloqueiam armazenamento persistente.
    localStorage.setItem(FALLBACK, JSON.stringify(data));
    console.warn('Brisa: salvando no armazenamento de contingência.', error);
  }
}
