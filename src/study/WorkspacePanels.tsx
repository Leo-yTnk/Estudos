import { useState, type FormEvent } from 'react';
import { ArrowUpRight, BookOpen, ListTodo, Search } from 'lucide-react';
import { EntryFields, freshInput } from '../components/EntryFields';
import { Button } from '../components/ui';
import { noteText } from '../lib/documents';
import { useApp } from '../state/AppState';
import { SUBJECT_COLORS, uid, type Subject, type EntryInput } from '../types';

export function TaskForm({ subjectId, dueAt, close }: { subjectId?: string; dueAt?: string | null; close: () => void }) {
  const app = useApp();
  const [draft, setDraft] = useState<EntryInput>(() => ({ ...freshInput(), subjectId, dueAt: dueAt ?? null }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.title.trim()) return;
    app.addEntry({ ...draft, title: draft.title.trim() });
    close();
  };
  return <form className="nw-stack" onSubmit={submit}>
    <EntryFields value={draft} onChange={setDraft} />
    <div className="nw-toolbar"><Button variant="primary" type="submit">Salvar registro</Button><Button onClick={close}>Cancelar</Button></div>
  </form>;
}

const colors = { mint: 'Verde', violet: 'Lilás', blue: 'Azul', peach: 'Pêssego', rose: 'Rosa' };

export function SubjectForm({ subject, save, remove, close }: {
  subject?: Subject; save: (subject: Subject) => void; remove: (id: string) => void; close: () => void;
}) {
  const [draft, setDraft] = useState<Subject>(() => subject || { id: uid(), title: '', color: 'mint' });
  return <form className="nw-stack" onSubmit={(event) => { event.preventDefault(); if (draft.title.trim()) save({ ...draft, title: draft.title.trim() }); }}>
    <label className="field-label">Nome da matéria<input required value={draft.title} placeholder="Ex.: Geografia" maxLength={60}
      onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
    <fieldset className="nw-color-field"><legend>Cor</legend><div className="nw-toolbar">{SUBJECT_COLORS.map((color) =>
      <button type="button" aria-pressed={draft.color === color} key={color} className={'nw-color tone-' + color}
        onClick={() => setDraft({ ...draft, color })}>{colors[color]}</button>)}</div></fieldset>
    <div className="nw-toolbar"><Button variant="primary" type="submit">Salvar matéria</Button><Button onClick={close}>Cancelar</Button>
      {subject && <Button variant="danger" onClick={() => {
        if (window.confirm('Excluir a matéria, suas páginas e cartões? As tarefas serão mantidas na lista Sem matéria.')) remove(subject.id);
      }}>Excluir matéria</Button>}
    </div>
  </form>;
}

const normalize = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export function WorkspaceSearch({ subject, note, entry }: {
  subject: (id: string) => void; note: (subjectId: string, id: string) => void; entry: (id: string) => void;
}) {
  const { data } = useApp();
  const [query, setQuery] = useState('');
  const term = normalize(query.trim());
  const results = term ? [
    ...data.subjects.map((item) => ({ id: 's-' + item.id, title: item.title, type: 'Matéria', content: item.title, Icon: BookOpen, open: () => subject(item.id) })),
    ...data.entries.map((item) => ({ id: 't-' + item.id, title: item.title, type: item.kind === 'task' ? 'Tarefa' : 'Registro',
      content: item.title + ' ' + item.note + ' ' + item.steps.map((step) => step.title).join(' '), Icon: ListTodo, open: () => entry(item.id) })),
    ...data.notes.map((item) => ({ id: 'n-' + item.id, title: item.title || 'Sem título', type: 'Página',
      content: item.title + ' ' + noteText(item), Icon: BookOpen,
      open: () => note(item.subjectId, item.id) })),
  ].filter((item) => normalize(item.content).includes(term)).slice(0, 40) : [];
  return <div className="nw-stack">
    <label className="nw-search-field"><Search size={19} /><input type="search" aria-label="Buscar matérias, tarefas e páginas" placeholder="Buscar matérias, tarefas e páginas…" value={query}
      onChange={(event) => setQuery(event.target.value)} /></label>
    <div className="nw-search-results" aria-label="Resultados da busca">
      {!results.length && <p className="nw-muted" role="status">{term ? 'Nenhum resultado encontrado.' : 'Digite um título ou trecho para buscar.'}</p>}
      {results.map(({ id, title, type, Icon, open }) => <button type="button" key={id} onClick={open}><Icon size={17} /><span><strong>{title}</strong><small>{type}</small></span><ArrowUpRight size={15} /></button>)}
    </div>
  </div>;
}
