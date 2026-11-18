import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowDownUp, CalendarDays, Check, ChevronLeft, ChevronRight, ListTodo, Plus } from 'lucide-react';
import { EntryCard } from '../components/EntryCard';
import { Button, EmptyState, Surface } from '../components/ui';
import { asLocalDate, dateToDeadline } from '../lib/engine';
import { springs } from '../lib/motion';
import { useApp } from '../state/AppState';
import type { Entry } from '../types';

const statusNames = { active: 'Pendentes', done: 'Concluídas', archived: 'Arquivo' } as const;

export function TaskList({ entries, selectedId }: { entries: Entry[]; selectedId?: string }) {
  const app = useApp();
  const reduce = !!useReducedMotion() || app.data.profile.reducedMotion;
  return <div className="nw-stack">{entries.map((entry) => <motion.div key={entry.id} layout={reduce ? false : 'position'} transition={springs.layout} className="nw-task">
    {entry.status !== 'archived' && <button type="button" className={'nw-check ' + (entry.status === 'done' ? 'checked' : '')}
      aria-label={`${entry.status === 'done' ? 'Reabrir' : 'Concluir'} ${entry.title}`}
      onClick={() => entry.status === 'done' ? app.reopenEntry(entry.id) : app.completeEntry(entry.id)}>{entry.status === 'done' && <Check size={14} />}</button>}
    <EntryCard entry={entry} initiallyExpanded={entry.id === selectedId} />
  </motion.div>)}</div>;
}

export function Tasks({ subjectId, onAdd, onlyId }: { subjectId?: string; onAdd: () => void; onlyId?: string }) {
  const app = useApp();
  const selected = app.data.entries.find((entry) => entry.id === onlyId);
  const [status, setStatus] = useState<Entry['status']>(selected?.status || 'active');
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState('due');
  const entries = app.data.entries.filter((entry) =>
    (!subjectId || entry.subjectId === subjectId) && (entry.kind === 'task' || entry.kind === 'event'));
  const visible = entries.filter((entry) => entry.status === status && (!filter || entry.subjectId === filter || (filter === 'none' && !entry.subjectId)))
    .sort((a, b) => {
      if (a.id === onlyId || b.id === onlyId) return a.id === onlyId ? -1 : 1;
      if (sort === 'importance') return b.importance - a.importance || b.createdAt.localeCompare(a.createdAt);
      if (sort === 'recent') return b.createdAt.localeCompare(a.createdAt);
      return (a.dueAt || '~').localeCompare(b.dueAt || '~') || b.importance - a.importance;
    });
  return <div className="nw-stack">
    <div className="nw-section-heading nw-wrap">
      <div className="nw-segment" aria-label="Estado das tarefas">{Object.entries(statusNames).map(([value, label]) =>
        <button type="button" key={value} aria-pressed={status === value} onClick={() => setStatus(value as Entry['status'])}>{label} <span>{entries.filter((entry) => entry.status === value).length}</span></button>)}</div>
      <Button size="sm" variant="primary" icon={<Plus size={16} />} onClick={onAdd}>Nova tarefa</Button>
    </div>
    <div className="nw-toolbar nw-filters">
      {!subjectId && <select aria-label="Filtrar tarefas por matéria" value={filter} onChange={(event) => setFilter(event.target.value)}>
        <option value="">Todas as matérias</option><option value="none">Sem matéria</option>
        {app.data.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.title}</option>)}
      </select>}
      <ArrowDownUp size={15} aria-hidden="true" />
      <select aria-label="Ordenar tarefas" value={sort} onChange={(event) => setSort(event.target.value)}>
        <option value="due">Por prazo</option><option value="importance">Por prioridade</option><option value="recent">Mais recentes</option>
      </select>
    </div>
    {visible.length ? <TaskList entries={visible} selectedId={onlyId} /> : <Surface><EmptyState icon={<ListTodo size={24} />} title="Nenhuma tarefa nesta lista"
      description={status === 'active' ? 'Adicione uma tarefa ou altere o filtro de matéria.' : 'Os registros aparecem aqui quando você muda o estado da tarefa.'} /></Surface>}
  </div>;
}

function daysOfWeek(date: Date) {
  const offset = (date.getDay() + 6) % 7;
  return Array.from({ length: 7 }, (_, index) => new Date(date.getFullYear(), date.getMonth(), date.getDate() - offset + index));
}

export function Week({ onAdd, compact = false }: { onAdd: (due?: string | null) => void; compact?: boolean }) {
  const app = useApp();
  const [selected, select] = useState(() => new Date());
  const today = asLocalDate(new Date().toISOString());
  const date = asLocalDate(selected.toISOString());
  const days = daysOfWeek(selected);
  const dayEntries = app.data.entries.filter((entry) => entry.status !== 'archived' && (entry.kind === 'event' || entry.kind === 'task'));
  const selectedEntries = dayEntries.filter((entry) => asLocalDate(entry.dueAt) === date);
  const shift = (delta: number) => select(new Date(selected.getFullYear(), selected.getMonth(), selected.getDate() + delta));
  const format = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' });
  return <Surface className={'nw-week ' + (compact ? 'compact' : '')}>
    <div className="nw-section-heading"><div><h2>{compact ? 'Esta semana' : 'Semana de ' + format.format(days[0])}</h2>
      <span className="nw-muted">{format.format(days[0])} – {format.format(days[6])}</span></div>
      <div className="nw-toolbar">
        <button type="button" className="nw-icon" aria-label="Semana anterior" onClick={() => shift(-7)}><ChevronLeft size={18} /></button>
        {!compact && <button className="nw-today" type="button" onClick={() => select(new Date())}>Hoje</button>}
        <button type="button" className="nw-icon" aria-label="Próxima semana" onClick={() => shift(7)}><ChevronRight size={18} /></button>
      </div>
    </div>
    <div className="nw-days" aria-label="Dias da semana">{days.map((day) => {
      const key = asLocalDate(day.toISOString());
      const pending = dayEntries.filter((entry) => entry.status === 'active' && asLocalDate(entry.dueAt) === key).length;
      return <button type="button" key={key} aria-pressed={key === date} aria-current={key === today ? 'date' : undefined}
        aria-label={`${format.format(day)}, ${pending} pendentes`} onClick={() => select(day)}>
        <span>{day.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}</span><strong>{day.getDate()}</strong><i className={pending ? 'has-items' : ''} />
      </button>;
    })}</div>
    <div className="nw-day-head"><strong>{selected.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</strong>
      <button className="nw-icon" aria-label="Adicionar tarefa neste dia" type="button" onClick={() => onAdd(dateToDeadline(date))}><Plus size={18} /></button></div>
    {selectedEntries.length ? <TaskList entries={selectedEntries} /> : <p className="nw-no-date"><CalendarDays size={16} /> Nenhuma entrega neste dia.</p>}
  </Surface>;
}
