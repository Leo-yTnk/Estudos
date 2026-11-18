import { ArrowRight, CalendarDays, CheckCircle2, Clock3, LayoutGrid, ListTodo, Timer } from 'lucide-react';
import { Button, Surface } from '../components/ui';
import { asLocalDate, dueLabel, rankedTasks, weekActivity } from '../lib/engine';
import { useApp } from '../state/AppState';
import { SubjectCard } from './Subjects';
import { Week } from './Planner';

export function Dashboard({ subject, subjects, newSubject, focus, add, openTask }: {
  subject: (id: string) => void; subjects: () => void; newSubject: () => void; focus: () => void;
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
          <h2>{data.focus ? 'Sessão em andamento' : data.break ? 'Pausa em andamento' : next ? 'Sua próxima tarefa' : 'Uma tarefa de cada vez'}</h2>
          <p>{data.focus ? data.entries.find(({ id }) => id === data.focus?.entryId)?.title : data.break ? 'Seu intervalo de ' + data.break.minutes + ' minutos está ativo.' : next ? next.title + ' · ' + dueLabel(next.dueAt) + ' · ' + next.minutes + ' min' : 'Adicione um exercício ou uma entrega para começar a organizar seus estudos.'}</p>
          <div className="ds-toolbar">
            <Button icon={<ArrowRight size={16} />} onClick={data.focus || data.break ? focus : next ? () => openTask(next.id) : () => add()}>
              {data.focus || data.break ? 'Ver sessão' : next ? 'Abrir tarefa' : 'Criar tarefa'}
            </Button>
          </div>
        </div>
        <div className="nw-focus-rings" aria-hidden="true"><span /><span /><span /><Timer size={38} strokeWidth={1.15} /></div>
      </Surface>
      <Week onAdd={add} compact />
    </div>
    <section className="nw-stack">
      <div className="nw-section-heading"><h2><LayoutGrid size={19} /> Minhas matérias</h2>
        <Button size="sm" variant="ghost" icon={<ArrowRight size={16} />} onClick={subjects}>Ver todas</Button></div>
      {data.subjects.length ? <div className="subject-grid dashboard-subjects">{data.subjects.slice(0, 4).map((item) =>
        <SubjectCard key={item.id} subject={item} open={() => subject(item.id)} />)}</div> :
        <Button onClick={newSubject}>Criar primeira matéria</Button>}
    </section>

  </div>;
}
