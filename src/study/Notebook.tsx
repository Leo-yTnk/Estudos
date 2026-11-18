import { useState, type FormEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowDown, ArrowLeft, ArrowUp, BookOpen, CheckSquare, ExternalLink, Heading, Link2, Plus, Trash2, Type } from 'lucide-react';
import { Button, EmptyState, Surface } from '../components/ui';
import { useApp } from '../state/AppState';
import { BLOCK_TYPES, uid, type NoteBlock, type StudyNote } from '../types';
import { springs } from '../lib/motion';

const blockLabels = { text: 'Texto', heading: 'Título', check: 'Checklist', link: 'Link' };
const icons = { text: Type, heading: Heading, check: CheckSquare, link: Link2 };

function safeLink(value: string | undefined) {
  try {
    const url = new URL(value || '');
    return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined;
  } catch { return undefined; }
}

export function Notebook({ subjectId, noteId, open }: { subjectId: string; noteId?: string; open: (id?: string) => void }) {
  const app = useApp();
  const systemReduced = useReducedMotion();
  const reduce = !!systemReduced || app.data.profile.reducedMotion;
  const [title, setTitle] = useState('');
  const notes = app.data.notes.filter((note) => note.subjectId === subjectId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const note = notes.find(({ id }) => id === noteId);
  const add = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    const id = uid();
    app.saveNote({ id, subjectId, title: title.trim(), blocks: [{ id: uid(), type: 'text', text: '' }], updatedAt: '' });
    setTitle('');
    open(id);
  };

  if (!note) return <div className="nw-stack">
    <form className="nw-inline-form" onSubmit={add}>
      <input aria-label="Título da nova página" placeholder="Título da nova página" required maxLength={150} value={title} onChange={(event) => setTitle(event.target.value)} />
      <Button type="submit" variant="primary" icon={<Plus size={16} />}>Criar página</Button>
    </form>
    {notes.length ? <div className="nw-card-grid">{notes.map((page) => <Surface key={page.id} className="nw-note-preview">
      <button type="button" onClick={() => open(page.id)}><BookOpen size={21} /><strong>{page.title || 'Sem título'}</strong>
        <span>{page.blocks.find((block) => block.text.trim())?.text || 'Página em branco'}</span></button>
    </Surface>)}</div> : <Surface><EmptyState icon={<BookOpen size={23} />} title="Seu caderno está em branco" description="Crie uma página para guardar os resumos, exercícios e links desta matéria." /></Surface>}
  </div>;

  const save = (patch: Partial<StudyNote>) => app.saveNote({ ...note, ...patch });
  const patchBlock = (id: string, patch: Partial<NoteBlock>) => save({ blocks: note.blocks.map((block) => block.id === id ? { ...block, ...patch } : block) });
  const move = (index: number, direction: number) => {
    const blocks = [...note.blocks];
    const target = index + direction;
    if (!blocks[target]) return;
    [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
    save({ blocks });
  };

  return <Surface className="nw-editor">
    <div className="nw-editor-top">
      <Button size="sm" variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => open()}>Páginas</Button>
      <span className="nw-muted">Salvamento automático</span>
      <button type="button" className="nw-icon" aria-label="Excluir página" onClick={() => {
        if (window.confirm('Excluir esta página e seus blocos?')) { app.removeNote(note.id); open(); }
      }}><Trash2 size={16} /></button>
    </div>
    <input className="nw-note-title" aria-label="Título da página" value={note.title} maxLength={150} placeholder="Sem título" onChange={(event) => save({ title: event.target.value })} />
    <div className="nw-blocks">
      <AnimatePresence initial={false}>
        {note.blocks.map((block, index) => {
          const link = block.type === 'link' && safeLink(block.url);
          return <motion.div key={block.id} layout={reduce ? false : 'position'} initial={reduce ? false : { opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={reduce ? { duration: 0 } : springs.layout} className="nw-block">
            <div className="nw-block-top"><span>{blockLabels[block.type]}</span><div>
              <button type="button" className="nw-icon" disabled={index === 0} aria-label={`Subir bloco ${index + 1}`} onClick={() => move(index, -1)}><ArrowUp size={15} /></button>
              <button type="button" className="nw-icon" disabled={index === note.blocks.length - 1} aria-label={`Descer bloco ${index + 1}`} onClick={() => move(index, 1)}><ArrowDown size={15} /></button>
              <button type="button" className="nw-icon" aria-label={`Remover bloco ${index + 1}`} onClick={() => save({ blocks: note.blocks.filter(({ id }) => id !== block.id) })}><Trash2 size={15} /></button>
            </div></div>
            <div className="nw-block-body">
              {block.type === 'check' && <input type="checkbox" aria-label={`Marcar item ${index + 1}`} checked={!!block.checked} onChange={(event) => patchBlock(block.id, { checked: event.target.checked })} />}
              {block.type === 'text' ? <textarea rows={Math.min(16, Math.max(3, block.text.split('\n').length + 1))} aria-label={`Texto do bloco ${index + 1}`}
                placeholder="Escreva suas anotações…" maxLength={12000} value={block.text} onChange={(event) => patchBlock(block.id, { text: event.target.value })} />
                : <input aria-label={`Texto do bloco ${index + 1}`} placeholder={blockLabels[block.type]} value={block.text} maxLength={1000}
                  onChange={(event) => patchBlock(block.id, { text: event.target.value })} />}
            </div>
            {block.type === 'link' && <div className="nw-block-body">
              <input aria-label="Endereço do link" type="url" placeholder="https://…" value={block.url || ''} maxLength={2000}
                onChange={(event) => patchBlock(block.id, { url: event.target.value })} />
              {link && <a className="nw-icon" href={link} target="_blank" rel="noopener noreferrer" aria-label="Abrir link em outra aba"><ExternalLink size={16} /></a>}
            </div>}
          </motion.div>;
        })}
      </AnimatePresence>
    </div>
    <div className="nw-toolbar" aria-label="Adicionar bloco">{BLOCK_TYPES.map((type) => {
      const Icon = icons[type];
      return <Button key={type} size="sm" icon={<Icon size={15} />} disabled={note.blocks.length >= 250}
        onClick={() => save({ blocks: [...note.blocks, { id: uid(), type, text: '' }] })}>{blockLabels[type]}</Button>;
    })}</div>
  </Surface>;
}
