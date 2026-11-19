import type { Subject, SubjectVisit } from '../types';

export function subjectShortcuts(subjects: Subject[], visits: SubjectVisit[], now: Date) {
  const activity = new Map<string, { total: number; hourly: number; latest: number }>();
  for (const visit of visits) {
    const date = new Date(visit.at);
    if (date > now) continue;
    const stats = activity.get(visit.subjectId) ?? { total: 0, hourly: 0, latest: 0 };
    stats.total++;
    if (date.getHours() === now.getHours()) stats.hourly++;
    stats.latest = Math.max(stats.latest, date.getTime());
    activity.set(visit.subjectId, stats);
  }
  const stats = (id: string) => activity.get(id) ?? { total: 0, hourly: 0, latest: 0 };
  const ranked = [...subjects].sort((a, b) => stats(b.id).total - stats(a.id).total ||
    stats(b.id).latest - stats(a.id).latest || a.title.localeCompare(b.title, 'pt-BR'));
  const preferred = ranked.reduce<Subject | undefined>((best, item) =>
    stats(item.id).hourly > (best ? stats(best.id).hourly : 0) ? item : best, undefined);
  return (preferred ? [preferred, ...ranked.filter(({ id }) => id !== preferred.id)] : ranked).slice(0, 6);
}
