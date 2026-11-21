import { useEffect, useState } from 'react';
import { ArrowRight, BarChart3, BookOpen, CalendarDays, CheckCircle2, Clock3, LayoutGrid, ListTodo, Sparkles, TriangleAlert } from 'lucide-react';
import { Button, Surface } from '../components/ui';
import { asLocalDate, dueLabel, rankedTasks, weekActivity } from '../lib/engine';
import { areas, routeHref, subjectViews, type SubjectView } from '../lib/navigation';
import { subjectShortcuts } from '../lib/subjectShortcuts';
import { useApp } from '../state/AppState';
import type { Entry } from '../types';
import { SubjectMark } from './Subjects';
import morningIllustration from '../assets/hero/morning.webp';
import afternoonIllustration from '../assets/hero/afternoon.webp';
import eveningIllustration from '../assets/hero/evening.webp';
import nightIllustration from '../assets/hero/night.webp';

const heroPeriods = [
  { start: 19, image: nightIllustration, greeting: 'Boa noite', message: 'Anote o que fica para amanhã e aproveite a noite para descansar.' },
  { start: 17, image: eveningIllustration, greeting: 'Bom fim de tarde', message: 'Que tal revisar o que aprendeu hoje e organizar o que ainda falta?' },
  { start: 12, image: afternoonIllustration, greeting: 'Boa tarde', message: 'Escolha uma tarefa e reserve um tempo para avançar com calma.' },
  { start: 5, image: morningIllustration, greeting: 'Bom dia', message: 'Dê uma olhada na agenda e escolha por onde começar.' },
] as const;

export function Dashboard({ subject, newSubject, focus, add, openTask }: {
  subject: (id: string, view: SubjectView) => void; newSubject: () => void; focus: () => void;
  add: () => void; openTask: (id: string) => void;
}) {
  const { data, completeEntry } = useApp();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => setNow(new Date());
    const timer = window.setInterval(refresh, 20_000);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, []);
  const today = asLocalDate(now.toISOString());
  const hour = now.getHours();
  const hero = heroPeriods.find(({ start }) => hour >= start) ?? heroPeriods[0];
  const name = data.profile.name.trim();
  const pending = rankedTasks(data, now);
  const next = pending[0];
  const tasks = data.entries.filter((item) => item.kind === 'task');
  const todayTasks = tasks.filter((item) => item.status !== 'archived' && asLocalDate(item.dueAt) === today);
  const completions = new Map<string, number>();
  for (const task of tasks) {
    const day = asLocalDate(task.completedAt);
    if (day) completions.set(day, (completions.get(day) ?? 0) + 1);
  }
  const done = completions.get(today) ?? 0;
  const todayPending = pending.find((item) => asLocalDate(item.dueAt) === today);
  const isOverdue = (item: Entry) => {
    const day = asLocalDate(item.dueAt);
    return day && day < today;
  };
  const overdue = pending.filter(isOverdue);
  const week = weekActivity(data.activity, now).map((day) => ({
    ...day, completed: completions.get(asLocalDate(day.key)) ?? 0,
  }));
  const largest = Math.max(1, ...week.map(({ completed }) => completed));
  const focusMinutes = week.at(-1)?.focusMinutes ?? 0;
  const shortcuts = subjectShortcuts(data.subjects, data.subjectVisits, now);
  const date = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(now);
  const recommended = overdue[0] ?? todayPending ?? next;
  const activeFocus = data.focus || data.break;
  const recommendation = activeFocus
    ? (data.focus ? 'Retome sua sessão de foco.' : 'Aproveite sua pausa antes de retomar os estudos.')
    : overdue.length ? 'Revise o prazo de “' + recommended.title + '” e decida qual passo dá para concluir agora.'
      : todayPending ? 'Reserve ' + todayPending.minutes + ' min para “' + todayPending.title + '”.'
        : next ? 'Adiante “' + next.title + '” se tiver ' + next.minutes + ' min disponíveis.'
          : data.subjects.length ? 'Aproveite para revisar uma matéria pelos atalhos.' : 'Crie uma matéria para começar a organizar seus estudos.';
  return <div className="nw-stack nw-dashboard">
    <header className="surface nw-welcome">
      <img className="nw-welcome-image" src={hero.image} alt="" fetchPriority="high" decoding="async" />
      <div className="nw-welcome-copy">
        <time className="nw-date" dateTime={today}><CalendarDays size={15} aria-hidden="true" />{date}</time>
        <h1>{hero.greeting}{name ? ', ' + name : ''}!</h1>
        <p>{hero.message}</p>
      </div>
    </header>
    <div className="today-summary">
      <Surface className="nw-focus-card today-next">
        <div className="nw-focus-content">
          <span className="nw-focus-label"><Clock3 size={16} /> Próxima tarefa</span>
          <h2>{next?.title || 'Dia livre de pendências'}</h2>
          <p>{next ? dueLabel(next.dueAt) + ' · ' + next.minutes + ' min' : 'Crie uma tarefa quando tiver algo para fazer.'}</p>
          <Button icon={<ArrowRight size={16} />} onClick={next ? () => openTask(next.id) : add}>{next ? 'Abrir tarefa' : 'Criar tarefa'}</Button>
        </div>
      </Surface>
      <Surface className="today-checklist">
        <h2 className="nw-small-heading"><ListTodo size={18} /> Próximas tarefas</h2>
        {pending.length ? <ul>{pending.slice(0, 4).map((item) => <li key={item.id}>
          <input type="checkbox" aria-label={'Concluir ' + item.title} checked={false} onChange={() => completeEntry(item.id)} />
          <button type="button" onClick={() => openTask(item.id)}>{item.title}<small>{dueLabel(item.dueAt)}</small></button>
        </li>)}</ul> : <p className="nw-muted">Suas próximas tarefas aparecem aqui.</p>}
      </Surface>
      {[
        { label: 'Tarefas no dia', Icon: CalendarDays, tone: 'violet', value: todayTasks.length },
        { label: 'Concluídas no dia', Icon: CheckCircle2, tone: 'mint', value: done },
      ].map(({ label, Icon, tone, value }) => <Surface key={label} className="nw-stat today-stat">
        <span className={'nw-stat-icon tone-' + tone}><Icon size={18} /></span><div><strong>{value}</strong><span>{label}</span></div>
      </Surface>)}
    </div>

    <section className="nw-stack" aria-labelledby="today-dashboard">
      <div className="nw-section-heading"><h2 id="today-dashboard"><BarChart3 size={19} /> Dashboard</h2></div>
      <div className="today-insights">
        <Surface className="today-activity">
          <div className="nw-section-heading"><h3 className="nw-small-heading">Entregas na semana</h3><span className="nw-muted">Últimos 7 dias</span></div>
          <div className="today-chart" role="list" aria-label="Tarefas concluídas nos últimos sete dias">
            {week.map(({ key, label, completed }) => <div key={key} role="listitem" aria-label={new Date(key).toLocaleDateString('pt-BR') + ', ' + completed + ' concluídas'}>
              <strong aria-hidden="true">{completed}</strong>
              <span className="today-bar" aria-hidden="true"><i style={{ height: (completed / largest * 100) + '%' }} /></span>
              <span aria-hidden="true">{label}</span>
            </div>)}
          </div>
          <div className="today-focus nw-muted"><Clock3 size={15} /> {focusMinutes} min de foco hoje</div>
        </Surface>
        <Surface className={'today-advice' + (overdue.length ? ' today-alert' : '')}>
          <span>{overdue.length ? <TriangleAlert size={18} /> : <Sparkles size={18} />}</span>
          <h3>{overdue.length ? overdue.length + (overdue.length === 1 ? ' tarefa atrasada' : ' tarefas atrasadas')
            : done ? done + (done === 1 ? ' tarefa concluída hoje' : ' tarefas concluídas hoje') : todayPending ? 'Seu plano de hoje' : 'Sem prazos atrasados'}</h3>
          <p>{recommendation}</p>
          <Button size="sm" icon={<ArrowRight size={15} />}
            onClick={activeFocus ? focus : recommended ? () => openTask(recommended.id) : shortcuts.length ? () => subject(shortcuts[0].id, 'revisao') : newSubject}>
            {activeFocus ? 'Ver sessão' : recommended ? 'Ver tarefa' : shortcuts.length ? 'Abrir revisão' : 'Nova matéria'}
          </Button>
        </Surface>
      </div>
    </section>

    <section className="nw-stack" aria-labelledby="today-shortcuts">
      <div className="nw-section-heading"><h2 id="today-shortcuts"><LayoutGrid size={19} /> Atalhos</h2>
        <a className="subject-directory-link" href={routeHref(areas.materias)}>Ver todas <ArrowRight size={15} /></a></div>
      {shortcuts.length ? <div className="subject-grid today-shortcuts">{shortcuts.map((item) =>
        <Surface key={item.id} layout className="today-subject">
          <div className="today-subject-heading"><SubjectMark subject={item} /><strong>{item.title}</strong></div>
          <div className="today-subject-actions">
            {subjectViews.map(({ id, label }) => <Button key={id} size="sm" variant="ghost" aria-label={label + ' de ' + item.title}
              onClick={() => subject(item.id, id)}>{label}</Button>)}
          </div>
        </Surface>)}</div> : <Surface className="today-advice"><BookOpen size={18} /><p>Crie uma matéria para acessar caderno, tarefas e revisão por aqui.</p>
          <Button onClick={newSubject}>Criar primeira matéria</Button></Surface>}
    </section>
  </div>;
}
