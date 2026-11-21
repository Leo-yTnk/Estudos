import { lazy, Suspense, useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, BookOpen, Ellipsis, FileText, HardDrive, PanelLeftClose, PanelLeftOpen, Plus, Trash2 } from 'lucide-react';
import { Button, EmptyState, IconButton, Segment, Stack, Surface } from '../components/ui';
import { ElasticSheet } from '../components/ElasticSheet';
import { fromBlocks, noteText } from '../lib/documents';
import { routeHref } from '../lib/navigation';
import { useApp } from '../state/AppState';
import { uid } from '../types';
import { useMobileEditor } from './NotebookToolbar';
import { SubjectMark } from './Subjects';
const RichTextEditor = lazy(() => import('./RichTextEditor').then((module) => ({ default: module.RichTextEditor })));

export function Notebook({ subjectId, noteId, open }: { subjectId: string; noteId?: string; open: (id?: string) => void }) {
  const app = useApp();
  const [title, setTitle] = useState('');
  const [optionsNoteId, setOptionsNoteId] = useState<string>();
  const [desktopPagesOpen, setDesktopPagesOpen] = useState(true);
  const [mobilePagesOpen, setMobilePagesOpen] = useState(false);
  const mobile = useMobileEditor();
  const pagesOpen = mobile ? mobilePagesOpen : desktopPagesOpen;
  const setPagesOpen = mobile ? setMobilePagesOpen : setDesktopPagesOpen;
  const header = useRef<HTMLElement>(null);
  const sidebarId = useId();
  const sidebar = useRef<HTMLElement>(null);
  const subject = app.data.subjects.find(({ id }) => id === subjectId);
  const notes = app.data.notes.filter((note) => note.subjectId === subjectId);
  const directoryHref = routeHref({ area: 'materias', subjectId, view: 'caderno' });
  const note = notes.find(({ id }) => id === noteId);
  useEffect(() => {
    if (mobile && pagesOpen) sidebar.current?.querySelector<HTMLElement>('[aria-current="page"]')?.focus({ preventScroll: true });
  }, [mobile, pagesOpen]);

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
    {notes.length ? <ul className="notebook-page-list">{notes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((page) => <li key={page.id}>
      <a href={routeHref({ area: 'materias', subjectId, view: 'caderno', noteId: page.id })}>
        <FileText size={19} aria-hidden="true" />
        <span><strong>{page.title || 'Sem título'}</strong>
          <small>{noteText(page).slice(0, 180) || 'Página em branco'}</small></span>
      </a>
    </li>)}</ul> : <Surface><EmptyState icon={<BookOpen size={23} />} title="Seu caderno está em branco"
      description="Crie uma página para guardar os resumos, exercícios e links desta matéria." /></Surface>}
  </Stack>;

  const closePages = () => {
    setPagesOpen(false);
    header.current?.querySelector<HTMLButtonElement>('button[aria-controls]')?.focus({ preventScroll: true });
  };

  return <section className="document-layout" data-pages-open={pagesOpen} aria-label="Editor do caderno">
    <header ref={header} className="document-top">
      <IconButton label={pagesOpen ? 'Recolher páginas da matéria' : 'Expandir páginas da matéria'}
        aria-expanded={pagesOpen} aria-controls={sidebarId} onClick={() => pagesOpen ? closePages() : setPagesOpen(true)}>
        {pagesOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
      </IconButton>
      <nav className="document-path" aria-label="Navegação do caderno">
        <a href={directoryHref}><ArrowLeft size={17} aria-hidden="true" />Páginas</a>
        <span aria-hidden="true">/</span>
        <input className="document-title" aria-label="Título da página" value={note.title} placeholder="Sem título" maxLength={150}
          onChange={(event) => app.updateNote(note.id, { title: event.target.value })} />
      </nav>
      <span className="document-autosave" title="Salvamento automático neste dispositivo">
        <HardDrive size={16} aria-hidden="true" /><span className="visually-hidden">Salvamento automático neste dispositivo</span>
      </span>
      <IconButton label="Opções da página" aria-haspopup="dialog" onClick={() => setOptionsNoteId(note.id)}><Ellipsis size={22} /></IconButton>
    </header>
    {mobile && <div className="document-sidebar-backdrop" aria-hidden="true" onClick={closePages} />}
    <div className="document-sidebar-slot">
      <nav ref={sidebar} id={sidebarId} className="document-sidebar" aria-label="Páginas da matéria" inert={!pagesOpen}
        onKeyDown={(event) => { if (event.key === 'Escape') closePages(); }}>
        <div className="document-sidebar-heading">{subject && <SubjectMark subject={subject} />}
          <h2>{subject?.title || 'Páginas da matéria'}</h2>
        </div>
        <ul>{notes.map((page) => <li key={page.id}>
          <a href={routeHref({ area: 'materias', subjectId, view: 'caderno', noteId: page.id })}
            aria-current={page.id === note.id ? 'page' : undefined}
            onClick={(event) => {
              if (mobile && !event.defaultPrevented && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) closePages();
            }}>
            <FileText size={17} aria-hidden="true" /><span>{page.title || 'Sem título'}</span>
          </a>
        </li>)}</ul>
      </nav>
    </div>
    <div className="document-writing-area" inert={mobile && pagesOpen}>
      <Suspense fallback={<p role="status" className="document-loading nw-muted">Abrindo editor…</p>}>
        <RichTextEditor key={note.id} content={note.content || fromBlocks(note.blocks)} onChange={(content) => app.updateNote(note.id, { content })} />
      </Suspense>
    </div>
    {optionsNoteId === note.id && <ElasticSheet title="Opções da página" onClose={() => setOptionsNoteId(undefined)}>
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
