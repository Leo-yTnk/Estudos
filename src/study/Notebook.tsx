import { lazy, Suspense, useState, type FormEvent } from 'react';
import { ArrowLeft, BookOpen, Ellipsis, FileText, HardDrive, Plus, Trash2 } from 'lucide-react';
import { Button, EmptyState, IconButton, Segment, Stack, Surface } from '../components/ui';
import { ElasticSheet } from '../components/ElasticSheet';
import { fromBlocks, noteText } from '../lib/documents';
import { routeHref } from '../lib/navigation';
import { useApp } from '../state/AppState';
import { uid } from '../types';
const RichTextEditor = lazy(() => import('./RichTextEditor').then((module) => ({ default: module.RichTextEditor })));

export function Notebook({ subjectId, noteId, open }: { subjectId: string; noteId?: string; open: (id?: string) => void }) {
  const app = useApp();
  const [title, setTitle] = useState('');
  const [showOptions, setShowOptions] = useState(false);
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

  if (!note) return <Stack className="notebook-pages">
    <form className="nw-inline-form" onSubmit={add}>
      <input className="ds-input" aria-label="Título da nova página" placeholder="Título da nova página" required maxLength={150} value={title}
        onChange={(event) => setTitle(event.target.value)} />
      <Button type="submit" variant="primary" icon={<Plus size={16} />}>Criar página</Button>
    </form>
    {notes.length ? <ul className="notebook-page-list">{notes.map((page) => <li key={page.id}>
      <a href={routeHref({ area: 'materias', subjectId, view: 'caderno', noteId: page.id })}>
        <FileText size={19} aria-hidden="true" />
        <span><strong>{page.title || 'Sem título'}</strong>
          <small>{noteText(page).slice(0, 180) || 'Página em branco'}</small></span>
      </a>
    </li>)}</ul> : <Surface><EmptyState icon={<BookOpen size={23} />} title="Seu caderno está em branco"
      description="Crie uma página para guardar os resumos, exercícios e links desta matéria." /></Surface>}
  </Stack>;

  return <section className="document-sheet" aria-label="Editor do caderno">
    <header className="document-top">
      <nav className="document-path" aria-label="Navegação do caderno">
        <a href={routeHref({ area: 'materias', subjectId, view: 'caderno' })}><ArrowLeft size={17} aria-hidden="true" />Páginas</a>
        <span aria-hidden="true">/</span>
        <input className="document-title" aria-label="Título da página" value={note.title} placeholder="Sem título" maxLength={150}
          onChange={(event) => app.updateNote(note.id, { title: event.target.value })} />
      </nav>
      <span className="document-autosave" title="Salvamento automático neste dispositivo">
        <HardDrive size={16} aria-hidden="true" /><span className="visually-hidden">Salvamento automático neste dispositivo</span>
      </span>
      <IconButton label="Opções da página" aria-haspopup="dialog" onClick={() => setShowOptions(true)}><Ellipsis size={22} /></IconButton>
    </header>
    <Suspense fallback={<p role="status" className="document-loading nw-muted">Abrindo editor…</p>}>
      <RichTextEditor key={note.id} content={note.content || fromBlocks(note.blocks)} onChange={(content) => app.updateNote(note.id, { content })} />
    </Suspense>
    {showOptions && <ElasticSheet title="Opções da página" onClose={() => setShowOptions(false)}>
      {(dismiss) => <Stack>
        <Segment label="Modo do editor" value={app.data.profile.toolbarMode} onChange={(toolbarMode) => {
          app.updateProfile({ toolbarMode });
          dismiss();
        }} options={[{ id: 'simple', label: 'Simplificado' }, { id: 'advanced', label: 'Avançado' }]} />
        <div><Button variant="danger" icon={<Trash2 size={16} />} onClick={() => {
          if (window.confirm('Excluir esta página e seu conteúdo?')) { app.removeNote(note.id); open(); }
        }}>Excluir página</Button></div>
      </Stack>}
    </ElasticSheet>}
  </section>;
}
