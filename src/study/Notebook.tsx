import { lazy, Suspense, useState, type FormEvent } from 'react';
import { ArrowLeft, BookOpen, FileText, Plus, Trash2 } from 'lucide-react';
import { Button, EmptyState, IconButton, Stack, Surface, Toolbar } from '../components/ui';
import { fromBlocks, noteText } from '../lib/documents';
import { useApp } from '../state/AppState';
import { uid } from '../types';
const RichTextEditor = lazy(() => import('./RichTextEditor').then((module) => ({ default: module.RichTextEditor })));

export function Notebook({ subjectId, noteId, open }: { subjectId: string; noteId?: string; open: (id?: string) => void }) {
  const app = useApp();
  const [title, setTitle] = useState('');
  const notes = app.data.notes.filter((note) => note.subjectId === subjectId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const note = notes.find(({ id }) => id === noteId);
  const add = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    const id = uid();
    app.saveNote({ id, subjectId, title: title.trim(), blocks: [], content: fromBlocks([]), updatedAt: '' });
    setTitle('');
    open(id);
  };

  if (!note) return <Stack>
    <form className="nw-inline-form" onSubmit={add}>
      <input className="ds-input" aria-label="Título da nova página" placeholder="Título da nova página" required maxLength={150} value={title}
        onChange={(event) => setTitle(event.target.value)} />
      <Button type="submit" variant="primary" icon={<Plus size={16} />}>Criar página</Button>
    </form>
    {notes.length ? <div className="nw-card-grid">{notes.map((page) => <Surface key={page.id} className="nw-note-preview" layout>
      <Button variant="ghost" onClick={() => open(page.id)}><FileText size={21} /><strong>{page.title || 'Sem título'}</strong>
        <span>{noteText(page).slice(0, 180) || 'Página em branco'}</span></Button>
    </Surface>)}</div> : <Surface><EmptyState icon={<BookOpen size={23} />} title="Seu caderno está em branco"
      description="Crie uma página para guardar os resumos, exercícios e links desta matéria." /></Surface>}
  </Stack>;

  return <Surface className="document-sheet">
    <Toolbar className="document-top">
      <Button size="sm" variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => open()}>Páginas</Button>
      <span className="nw-muted">Salvamento automático</span>
      <IconButton label="Excluir página" onClick={() => {
        if (window.confirm('Excluir esta página e seu conteúdo?')) { app.removeNote(note.id); open(); }
      }}><Trash2 size={16} /></IconButton>
    </Toolbar>
    <input className="document-title" aria-label="Título da página" value={note.title} placeholder="Sem título" maxLength={150}
      onChange={(event) => app.updateNote(note.id, { title: event.target.value })} />
    <Suspense fallback={<p role="status" className="nw-muted">Abrindo editor…</p>}>
      <RichTextEditor key={note.id} content={note.content || fromBlocks(note.blocks)} onChange={(content) => app.updateNote(note.id, { content })} />
    </Suspense>
  </Surface>;
}
