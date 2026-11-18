import { useState } from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import { AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowUp, Bold, Code2, Heading2, Heading3, Highlighter, IndentDecrease, IndentIncrease,
  Italic, Link2, List, ListChecks, ListOrdered, Minus, Plus, Quote, Redo2, Strikethrough, Table2, Trash2, Type, Underline, Undo2 } from 'lucide-react';
import type { JSONContent } from '@tiptap/core';
import { Button, Toolbar } from '../components/ui';
import { documentExtensions, safeLink } from '../lib/documents';
import { canMoveBlock, moveBlock } from '../lib/editorBlocks';
import { EditorActionButton, NotebookToolbar, useMobileEditor, type EditorAction } from './NotebookToolbar';

export function RichTextEditor({ content, onChange }: { content: JSONContent; onChange: (content: JSONContent) => void }) {
  const [link, setLink] = useState<string | null>(null);
  const [invalidLink, setInvalidLink] = useState(false);
  const mobile = useMobileEditor();
  const editor = useEditor({
    extensions: documentExtensions,
    content,
    editorProps: { attributes: { 'aria-label': 'Conteúdo da página', role: 'textbox', 'aria-multiline': 'true', lang: 'pt-BR' } },
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
  });
  const tools = useEditorState({
    editor,
    selector: ({ editor }) => {
      if (!editor) return null;
      const listItem = editor.isActive('taskItem') ? 'taskItem' : 'listItem';
      return {
        bold: editor.isActive('bold'), italic: editor.isActive('italic'), underline: editor.isActive('underline'),
        strike: editor.isActive('strike'), highlight: editor.isActive('highlight'), body: editor.isActive('paragraph'),
        h2: editor.isActive('heading', { level: 2 }), h3: editor.isActive('heading', { level: 3 }),
        bullet: editor.isActive('bulletList'), ordered: editor.isActive('orderedList'), task: editor.isActive('taskList'),
        quote: editor.isActive('blockquote'), code: editor.isActive('codeBlock'), link: editor.isActive('link'),
        selected: !editor.state.selection.empty, table: editor.isActive('table'),
        canAddRow: editor.can().addRowAfter(), canAddColumn: editor.can().addColumnAfter(),
        canDeleteRow: editor.can().deleteRow(), canDeleteColumn: editor.can().deleteColumn(),
        center: editor.isActive({ textAlign: 'center' }), right: editor.isActive({ textAlign: 'right' }),
        canUndo: editor.can().undo(), canRedo: editor.can().redo(), listItem,
        canIndent: editor.can().sinkListItem(listItem), canOutdent: editor.can().liftListItem(listItem),
        canMoveUp: canMoveBlock(editor.state, -1), canMoveDown: canMoveBlock(editor.state, 1),
      };
    },
  });

  if (!editor || !tools) return null;
  const focus = () => editor.chain().focus(undefined, { scrollIntoView: false });
  const closeLink = () => { setLink(null); setInvalidLink(false); focus().run(); };
  const applyLink = (event: React.FormEvent) => {
    event.preventDefault();
    const href = safeLink(link?.trim() || '');
    if (!href) { setInvalidLink(true); return; }
    if (editor.state.selection.empty && !editor.isActive('link')) {
      focus().insertContent({ type: 'text', text: href, marks: [{ type: 'link', attrs: { href } }] }).run();
    } else focus().extendMarkRange('link').setLink({ href }).run();
    closeLink();
  };
  const reorder = (direction: -1 | 1) => {
    const transaction = moveBlock(editor.state, direction);
    if (transaction) editor.view.dispatch(transaction);
    editor.commands.focus();
  };

  const marks: EditorAction[] = [
    { label: 'Negrito', icon: <Bold size={18} />, pressed: tools.bold, run: () => focus().toggleBold().run() },
    { label: 'Itálico', icon: <Italic size={18} />, pressed: tools.italic, run: () => focus().toggleItalic().run() },
    { label: 'Sublinhado', icon: <Underline size={18} />, pressed: tools.underline, run: () => focus().toggleUnderline().run() },
    { label: 'Riscado', icon: <Strikethrough size={18} />, pressed: tools.strike, run: () => focus().toggleStrike().run() },
    { label: 'Realçar texto', icon: <Highlighter size={18} />, pressed: tools.highlight, run: () => focus().toggleHighlight().run() },
  ];
  const title: EditorAction = { label: 'Título', icon: <Heading2 size={18} />, pressed: tools.h2, run: () => focus().toggleHeading({ level: 2 }).run() };
  const subtitle: EditorAction = { label: 'Subtítulo', icon: <Heading3 size={18} />, pressed: tools.h3, run: () => focus().toggleHeading({ level: 3 }).run() };
  const lists: EditorAction[] = [
    { label: 'Lista com marcadores', icon: <List size={18} />, pressed: tools.bullet, run: () => focus().toggleBulletList().run() },
    { label: 'Lista numerada', icon: <ListOrdered size={18} />, pressed: tools.ordered, run: () => focus().toggleOrderedList().run() },
    { label: 'Checklist', icon: <ListChecks size={18} />, pressed: tools.task, run: () => focus().toggleTaskList().run() },
  ];
  const quote: EditorAction = { label: 'Citação', icon: <Quote size={18} />, pressed: tools.quote, run: () => focus().toggleBlockquote().run() };
  const code: EditorAction = { label: 'Bloco de código', icon: <Code2 size={18} />, pressed: tools.code, run: () => focus().toggleCodeBlock().run() };
  const linkAction: EditorAction = { label: 'Inserir ou editar link', icon: <Link2 size={18} />, pressed: tools.link,
    run: () => { setInvalidLink(false); setLink(editor.getAttributes('link').href || ''); } };
  const history: EditorAction[] = [
    { label: 'Desfazer', icon: <Undo2 size={18} />, disabled: !tools.canUndo, run: () => focus().undo().run() },
    { label: 'Refazer', icon: <Redo2 size={18} />, disabled: !tools.canRedo, run: () => focus().redo().run() },
  ];
  const align: EditorAction[] = [
    { label: 'Alinhar à esquerda', icon: <AlignLeft size={18} />, pressed: !tools.center && !tools.right, run: () => focus().setTextAlign('left').run() },
    { label: 'Centralizar', icon: <AlignCenter size={18} />, pressed: tools.center, run: () => focus().setTextAlign('center').run() },
    { label: 'Alinhar à direita', icon: <AlignRight size={18} />, pressed: tools.right, run: () => focus().setTextAlign('right').run() },
  ];
  const blocks: EditorAction[] = [
    { label: 'Diminuir recuo da lista', icon: <IndentDecrease size={18} />, disabled: !tools.canOutdent, run: () => focus().liftListItem(tools.listItem).run() },
    { label: 'Aumentar recuo da lista', icon: <IndentIncrease size={18} />, disabled: !tools.canIndent, run: () => focus().sinkListItem(tools.listItem).run() },
    { label: 'Mover bloco para cima', icon: <ArrowUp size={18} />, disabled: !tools.canMoveUp, run: () => reorder(-1) },
    { label: 'Mover bloco para baixo', icon: <ArrowDown size={18} />, disabled: !tools.canMoveDown, run: () => reorder(1) },
  ];
  const table: EditorAction[] = tools.table ? [
    { label: 'Adicionar linha abaixo', icon: <span className="note-table-icon">L<Plus size={11} /></span>, disabled: !tools.canAddRow, run: () => focus().addRowAfter().run() },
    { label: 'Adicionar coluna à direita', icon: <span className="note-table-icon">C<Plus size={11} /></span>, disabled: !tools.canAddColumn, run: () => focus().addColumnAfter().run() },
    { label: 'Excluir linha atual', icon: <span className="note-table-icon">L<Minus size={11} /></span>, disabled: !tools.canDeleteRow, run: () => focus().deleteRow().run() },
    { label: 'Excluir coluna atual', icon: <span className="note-table-icon">C<Minus size={11} /></span>, disabled: !tools.canDeleteColumn, run: () => focus().deleteColumn().run() },
    { label: 'Excluir tabela', icon: <Trash2 size={18} />, run: () => focus().deleteTable().run() },
  ] : [
    { label: 'Inserir tabela', icon: <Table2 size={19} />, run: () => focus().insertTable({ rows: 3, cols: 2, withHeaderRow: true }).run() },
  ];
  const group = (actions: EditorAction[]) => actions.map((action) => <EditorActionButton key={action.label} action={action} />);
  const linkForm = link === null ? undefined : <form className="document-link-form" onSubmit={applyLink}
    onKeyDown={(event) => { if (event.key === 'Escape') closeLink(); }}>
    <label className="field-label">Endereço do link
      <input autoFocus type="url" required maxLength={2048} className="ds-input" placeholder="https://…" value={link}
        aria-invalid={invalidLink} onChange={(event) => { setLink(event.target.value); setInvalidLink(false); }} />
    </label>
    {invalidLink && <small role="alert">Use um endereço http, https ou mailto válido.</small>}
    <Toolbar><Button type="submit" size="sm" variant="primary">Aplicar link</Button>
      {tools.link && <Button size="sm" onClick={() => { focus().extendMarkRange('link').unsetLink().run(); closeLink(); }}>Remover link</Button>}
      {safeLink(link) && <a href={safeLink(link) || undefined} target="_blank" rel="noopener noreferrer">Abrir link</a>}
      <Button size="sm" variant="ghost" onClick={closeLink}>Cancelar</Button></Toolbar>
  </form>;

  return <div className="document-editor">
    {mobile ? <NotebookToolbar selected={tools.selected} linkForm={linkForm} dismissKeyboard={() => { if (link !== null && document.activeElement instanceof HTMLElement) document.activeElement.blur(); else editor.commands.blur(); }}
      actions={{ insert: tools.table ? table : [lists[2], ...table, linkAction, quote, code], text: [...marks, linkAction], organize: [...blocks, ...history] }}
      advanced={<div className="note-format-options">
        <Toolbar label="Estilo do parágrafo" className="note-format-styles">
          <Button size="sm" variant="ghost" aria-pressed={tools.body && !tools.h2 && !tools.h3} onMouseDown={(event) => event.preventDefault()}
            onClick={() => focus().setParagraph().run()} icon={<Type size={16} />}>Corpo</Button>
          <Button size="sm" variant="ghost" aria-pressed={tools.h2} onMouseDown={(event) => event.preventDefault()} onClick={() => focus().setHeading({ level: 2 }).run()}>{title.icon}Título</Button>
          <Button size="sm" variant="ghost" aria-pressed={tools.h3} onMouseDown={(event) => event.preventDefault()} onClick={() => focus().setHeading({ level: 3 }).run()}>{subtitle.icon}Subtítulo</Button>
        </Toolbar>
        <Toolbar label="Estilo do texto">{group(marks)}</Toolbar>
        <div className="note-format-layout">
          <Toolbar label="Listas">{group(lists)}</Toolbar><Toolbar label="Alinhamento">{group(align)}</Toolbar>
        </div>
      </div>} /> : <>
      <Toolbar label="Formatação do texto" className="document-toolbar">
        {[marks, [title, subtitle, ...lists], [quote, code, linkAction], table, history].map((actions) =>
          <div className="document-tool-group" key={actions[0].label}>{group(actions)}</div>)}
      </Toolbar>
      {linkForm}
    </>}
    <EditorContent editor={editor} className="document-content" />
  </div>;
}
