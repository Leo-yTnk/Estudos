import { useState } from 'react';
import { ArrowRight, BookOpen, Layers, LibraryBig, ListTodo, Plus, Search } from 'lucide-react';
import { Button, EmptyState, PageHeading, Stack, Surface } from '../components/ui';
import { useApp } from '../state/AppState';
import type { Subject } from '../types';

export const subjectTools = [
  { id: 'tasks', label: 'Tarefas', Icon: ListTodo },
  { id: 'notes', label: 'Caderno', Icon: BookOpen },
  { id: 'review', label: 'Revisão', Icon: Layers },
] as const;
export type SubjectTool = typeof subjectTools[number]['id'];

function useSubjectCounts(id: string) {
  const { data } = useApp();
  return {
    tasks: data.entries.filter((entry) => entry.subjectId === id && entry.status === 'active' && ['task', 'event'].includes(entry.kind)).length,
    notes: data.notes.filter((note) => note.subjectId === id).length,
    review: data.flashcards.filter((card) => card.subjectId === id).length,
  };
}

const countLabel = (count: number, singular: string, plural: string) => count + ' ' + (count === 1 ? singular : plural);

export function SubjectMark({ subject }: { subject: Subject }) {
  return <span className={'nw-subject-mark tone-' + subject.color}><BookOpen size={19} strokeWidth={1.8} /></span>;
}

export function SubjectCard({ subject, open }: { subject: Subject; open: () => void }) {
  const counts = useSubjectCounts(subject.id);
  return <Surface layout className="subject-card">
    <Button className="ds-card-button" variant="ghost" onClick={open}>
      <SubjectMark subject={subject} />
      <strong>{subject.title}</strong>
      <span className="nw-muted">{countLabel(counts.tasks, 'pendência', 'pendências')} · {countLabel(counts.notes, 'página', 'páginas')}</span>
      <ArrowRight className="ds-card-arrow" size={16} aria-hidden="true" />
    </Button>
  </Surface>;
}

export function Subjects({ open, create }: { open: (id: string) => void; create: () => void }) {
  const { data } = useApp();
  const [query, setQuery] = useState('');
  const normalize = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  const filtered = data.subjects.filter((item) => normalize(item.title).includes(normalize(query.trim())))
    .sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
  return <Stack className="workspace-page">
    <PageHeading title="Matérias" description="Um espaço para as tarefas, anotações e revisões de cada disciplina."
      action={<Button variant="primary" icon={<Plus size={17} />} onClick={create}>Nova matéria</Button>} />
    {!!data.subjects.length && <label className="ds-search"><Search size={18} />
      <input className="ds-input" type="search" placeholder="Filtrar matérias" aria-label="Filtrar matérias" value={query} onChange={(event) => setQuery(event.target.value)} />
    </label>}
    {filtered.length ? <div className="subject-grid">{filtered.map((subject) =>
      <SubjectCard key={subject.id} subject={subject} open={() => open(subject.id)} />
    )}</div> : <Surface><EmptyState icon={<LibraryBig size={23} />} title={query ? 'Nenhuma matéria encontrada' : 'Nenhuma matéria cadastrada'}
      description={query ? 'Tente buscar por outro nome.' : 'Crie uma matéria para organizar suas atividades.'} /></Surface>}
  </Stack>;
}

export function SubjectOverview({ subject, select }: { subject: Subject; select: (tool: SubjectTool) => void }) {
  const counts = useSubjectCounts(subject.id);
  const labels = {
    tasks: countLabel(counts.tasks, 'pendência', 'pendências'),
    notes: countLabel(counts.notes, 'página', 'páginas'),
    review: countLabel(counts.review, 'cartão', 'cartões'),
  };
  return <div className="subject-grid">{subjectTools.map(({ id, label, Icon }) =>
    <Surface className="subject-card" key={id}>
      <Button className="ds-card-button" variant="ghost" onClick={() => select(id)}>
        <span className={'nw-subject-mark tone-' + subject.color}><Icon size={19} /></span>
        <strong>{label}</strong><span className="nw-muted">{labels[id]}</span><ArrowRight size={16} className="ds-card-arrow" />
      </Button>
    </Surface>)}</div>;
}
