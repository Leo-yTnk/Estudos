import { useState } from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import { Bold, Code2, Heading2, Heading3, Italic, Link2, List, ListChecks, ListOrdered, Quote, Redo2, Strikethrough, Underline, Undo2 } from 'lucide-react';
import type { JSONContent } from '@tiptap/core';
import { Button, IconButton, Toolbar } from '../components/ui';
import { documentExtensions, safeLink } from '../lib/documents';

export function RichTextEditor({ content, onChange }: { content: JSONContent; onChange: (content: JSONContent) => void }) {
  const [link, setLink] = useState<string | null>(null);
  const [invalidLink, setInvalidLink] = useState(false);
  const editor = useEditor({
    extensions: documentExtensions,
    content,
    editorProps: { attributes: { 'aria-label': 'Conteúdo da página', role: 'textbox', 'aria-multiline': 'true', lang: 'pt-BR' } },
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
  });
  const tools = useEditorState({
    editor,
    selector: ({ editor }) => editor && ({
      bold: editor.isActive('bold'), italic: editor.isActive('italic'), underline: editor.isActive('underline'),
      strike: editor.isActive('strike'), h2: editor.isActive('heading', { level: 2 }),
      h3: editor.isActive('heading', { level: 3 }), bullet: editor.isActive('bulletList'),
      ordered: editor.isActive('orderedList'), task: editor.isActive('taskList'),
      quote: editor.isActive('blockquote'), code: editor.isActive('codeBlock'), link: editor.isActive('link'),
      canUndo: editor.can().undo(), canRedo: editor.can().redo(),
    }),
  });

  if (!editor || !tools) return null;
  const closeLink = () => { setLink(null); setInvalidLink(false); editor.commands.focus(); };
  const applyLink = (event: React.FormEvent) => {
    event.preventDefault();
    const href = safeLink(link?.trim() || '');
    if (!href) { setInvalidLink(true); return; }
    const chain = editor.chain().focus();
    if (editor.state.selection.empty && !editor.isActive('link')) {
      chain.insertContent({ type: 'text', text: href, marks: [{ type: 'link', attrs: { href } }] }).run();
    } else chain.extendMarkRange('link').setLink({ href }).run();
    closeLink();
  };

  const groups = [
    [
      { label: 'Negrito', Icon: Bold, pressed: tools.bold, run: () => editor.chain().focus().toggleBold().run() },
      { label: 'Itálico', Icon: Italic, pressed: tools.italic, run: () => editor.chain().focus().toggleItalic().run() },
      { label: 'Sublinhado', Icon: Underline, pressed: tools.underline, run: () => editor.chain().focus().toggleUnderline().run() },
      { label: 'Riscado', Icon: Strikethrough, pressed: tools.strike, run: () => editor.chain().focus().toggleStrike().run() },
    ],
    [
      { label: 'Título', Icon: Heading2, pressed: tools.h2, run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
      { label: 'Subtítulo', Icon: Heading3, pressed: tools.h3, run: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
      { label: 'Lista com marcadores', Icon: List, pressed: tools.bullet, run: () => editor.chain().focus().toggleBulletList().run() },
      { label: 'Lista numerada', Icon: ListOrdered, pressed: tools.ordered, run: () => editor.chain().focus().toggleOrderedList().run() },
      { label: 'Checklist', Icon: ListChecks, pressed: tools.task, run: () => editor.chain().focus().toggleTaskList().run() },
    ],
    [
      { label: 'Citação', Icon: Quote, pressed: tools.quote, run: () => editor.chain().focus().toggleBlockquote().run() },
      { label: 'Bloco de código', Icon: Code2, pressed: tools.code, run: () => editor.chain().focus().toggleCodeBlock().run() },
      { label: 'Inserir ou editar link', Icon: Link2, pressed: tools.link, run: () => { setInvalidLink(false); setLink(editor.getAttributes('link').href || ''); } },
    ],
  ];

  return <div className="document-editor">
    <Toolbar label="Formatação do texto" className="document-toolbar">
      {groups.map((group) => <div className="document-tool-group" key={group[0].label}>
        {group.map(({ label, Icon, pressed, run }) => <IconButton key={label} label={label} aria-pressed={pressed}
          onMouseDown={(event) => event.preventDefault()} onClick={run}><Icon size={17} /></IconButton>)}
      </div>)}
      <div className="document-tool-group">
        <IconButton label="Desfazer" disabled={!tools.canUndo} onMouseDown={(event) => event.preventDefault()} onClick={() => editor.chain().focus().undo().run()}><Undo2 size={17} /></IconButton>
        <IconButton label="Refazer" disabled={!tools.canRedo} onMouseDown={(event) => event.preventDefault()} onClick={() => editor.chain().focus().redo().run()}><Redo2 size={17} /></IconButton>
      </div>
    </Toolbar>
    {link !== null && <form className="document-link-form" onSubmit={applyLink} onKeyDown={(event) => { if (event.key === 'Escape') closeLink(); }}>
      <label className="field-label">Endereço do link
        <input autoFocus type="url" required maxLength={2048} className="ds-input" placeholder="https://…" value={link}
          aria-invalid={invalidLink} onChange={(event) => { setLink(event.target.value); setInvalidLink(false); }} />
      </label>
      {invalidLink && <small role="alert">Use um endereço http, https ou mailto válido.</small>}
      <Toolbar><Button type="submit" size="sm" variant="primary">Aplicar link</Button>
        {tools.link && <Button size="sm" onClick={() => { editor.chain().focus().extendMarkRange('link').unsetLink().run(); closeLink(); }}>Remover link</Button>}
        {safeLink(link) && <a href={safeLink(link) || undefined} target="_blank" rel="noopener noreferrer">Abrir link</a>}
        <Button size="sm" variant="ghost" onClick={closeLink}>Cancelar</Button></Toolbar>
    </form>}
    <EditorContent editor={editor} className="document-content" />
  </div>;
}
