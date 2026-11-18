import { ArrowDownRight, ArrowRight, ArrowUpRight, BookOpen, CalendarDays, CheckCircle2, Clock3, LayoutGrid, ListTodo, Plus, Timer } from 'lucide-react';
import { Button, Surface } from '../components/ui';
import { asLocalDate, dueLabel, rankedTasks, weekActivity } from '../lib/engine';
import { useApp } from '../state/AppState';
import type { Subject } from '../types';
import { Week } from './Planner';

export function SubjectMark({ subject }: { subject: Subject }) {
  return <span className={'nw-subject-mark tone-' + subject.color}><BookOpen size={17} strokeWidth={1.8} /></span>;
}

export function Dashboard({ subject, newSubject, tasks, focus, add, openTask }: {
  subject: (id: string) => void; newSubject: () => void; tasks: () => void; focus: () => void;
  add: (due?: string | null) => void; openTask: (id: string) => void;
}) {
  const { data } = useApp();
  const pending = rankedTasks(data);
  const next = pending[0];
  const today = asLocalDate(new Date().toISOString());
  const due = data.entries.filter((entry) => entry.status === 'active' && (entry.kind === 'task' || entry.kind === 'event') && asLocalDate(entry.dueAt) === today).length;
  const done = data.entries.filter((entry) => entry.kind === 'task' && entry.status === 'done' && asLocalDate(entry.completedAt) === today).length;
  const minutes = weekActivity(data.activity).at(-1)?.focusMinutes ?? 0;
  const date = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  return <div className="nw-stack nw-dashboard">
    <div className="nw-welcome">
      <div className="nw-date"><CalendarDays size={15} />{date}</div>
      <h1>{data.profile.name.trim() ? 'Olá, ' + data.profile.name.trim() : 'Seu espaço de estudos.'}</h1>
      <p>Organize as entregas, anote o que aprendeu e escolha o próximo passo.</p>
    </div>
    <div className="nw-stats">
      {[
        { icon: ListTodo, label: 'Para hoje', value: due, tone: 'violet' },
        { icon: CheckCircle2, label: 'Concluídas hoje', value: done, tone: 'mint' },
        { icon: Clock3, label: 'Foco hoje', value: minutes + ' min', tone: 'peach' },
      ].map(({ icon: Icon, label, value, tone }) => <Surface key={label} className="nw-stat">
        <span className={'nw-stat-icon tone-' + tone}><Icon size={18} /></span><div><strong>{value}</strong><span>{label}</span></div>
      </Surface>)}
    </div>
    <div className="nw-dashboard-grid">
      <Surface className="nw-focus-card">
        <div className="nw-focus-content">
          <span className="nw-focus-label"><Timer size={16} /> Foco</span>
          <h2>{data.focus ? 'Sessão em andamento' : data.break ? 'Pausa em andamento' : 'Uma tarefa de cada vez'}</h2>
          <p>{data.focus ? data.entries.find(({ id }) => id === data.focus?.entryId)?.title : data.break ? 'Seu intervalo de ' + data.break.minutes + ' minutos está ativo.' : 'Escolha uma tarefa, acompanhe o tempo e faça uma pausa quando precisar.'}</p>
          <Button icon={<ArrowRight size={16} />} onClick={focus}>{data.focus || data.break ? 'Ver sessão' : 'Abrir modo foco'}</Button>
        </div>
        <div className="nw-focus-rings" aria-hidden="true"><span /><span /><span /><Timer size={38} strokeWidth={1.15} /></div>
      </Surface>
      <Week onAdd={add} compact />
    </div>
    <section className="nw-stack">
      <div className="nw-section-heading"><h2><LayoutGrid size={19} /> Minhas matérias</h2>
        <Button size="sm" variant="ghost" icon={<Plus size={16} />} onClick={newSubject}>Nova matéria</Button></div>
      <div className="nw-subject-grid">{data.subjects.map((item) => {
        const count = pending.filter((entry) => entry.subjectId === item.id).length;
        const notes = data.notes.filter((note) => note.subjectId === item.id).length;
        return <Surface key={item.id} layout className="nw-subject-card"><button type="button" onClick={() => subject(item.id)}>
          <span className="nw-subject-card-top"><SubjectMark subject={item} /><ArrowUpRight size={16} /></span>
          <strong>{item.title}</strong><small>{count} {count === 1 ? 'tarefa' : 'tarefas'} · {notes} {notes === 1 ? 'página' : 'páginas'}</small>
        </button></Surface>;
      })}</div>
    </section>
    <section className="nw-stack">
      <div className="nw-section-heading"><h2><ArrowDownRight size={19} /> Próxima tarefa</h2><Button variant="ghost" size="sm" onClick={tasks}>Ver tarefas</Button></div>
      <Surface className="nw-next">{next ? <><div><strong>{next.title}</strong><span className="nw-muted">{dueLabel(next.dueAt)} · {next.minutes} min</span></div>
        <Button size="sm" onClick={() => openTask(next.id)}>Abrir tarefa</Button></> : <><div><strong>Nenhuma tarefa pendente</strong><span className="nw-muted">Adicione uma entrega ou exercício para começar.</span></div>
        <Button size="sm" onClick={() => add()}>Criar tarefa</Button></>}</Surface>
    </section>
  </div>;
}
