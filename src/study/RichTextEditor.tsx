import { useState } from 'react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, ArrowDown, ArrowUp, Bold, Clipboard, ClipboardList, Code2, Copy, Eraser, Highlighter, IndentDecrease, IndentIncrease,
  Italic, Link2, List, ListChecks, ListOrdered, Minus, MoreHorizontal, Plus, Quote, Redo2, Scissors, Strikethrough, Table2, Trash2, Type, Underline, Undo2 } from 'lucide-react';
import type { JSONContent } from '@tiptap/core';
import { Button, IconButton, Toolbar } from '../components/ui';
import { documentExtensions, safeLink } from '../lib/documents';
import { copyNoteSelection, pasteNoteSelection } from '../lib/noteClipboard';
import { useApp } from '../state/AppState';
import { canMoveBlock, moveBlock } from '../lib/editorBlocks';
import { EditorActionButton, NotebookToolbar, useMobileEditor, type EditorAction, type RibbonGroup } from './NotebookToolbar';

const fonts = [
  { label: 'Padrão', value: '' }, { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' }, { label: 'Times', value: 'Times New Roman, serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' }, { label: 'Monoespaçada', value: 'ui-monospace, monospace' },
];
const sizes = [12, 14, 16, 18, 20, 24, 28, 32, 40, 48];
const inkColors = [['Vinho', '#a52343'], ['Laranja', '#a34e20'], ['Verde', '#237456'], ['Azul', '#315bb1'], ['Roxo', '#7845a9']];
const highlightColors = [['Amarelo', '#f7e39b'], ['Verde', '#a9ebca'], ['Azul', '#b6d9ff'], ['Violeta', '#dcc7ff'], ['Rosa', '#ffbfd7']];

export function RichTextEditor({ content, onChange }: { content: JSONContent; onChange: (content: JSONContent) => void }) {
  const [link, setLink] = useState<string | null>(null);
  const [invalidLink, setInvalidLink] = useState(false);
  const [popover, setPopover] = useState<'paste' | 'ink' | 'highlight' | null>(null);
  const { notify } = useApp();
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
      const taskItem = editor.isActive('taskItem');
      const list = taskItem || editor.isActive('listItem');
      const listItem = taskItem ? 'taskItem' : 'listItem';
      const textStyle = editor.getAttributes('textStyle');
      const block = editor.getAttributes(editor.isActive('heading') ? 'heading' : 'paragraph');
      const indent = Number(block.indent) || 0;
      return {
        list, block, textStyle, highlightColor: editor.getAttributes('highlight').color,
        bold: editor.isActive('bold'), italic: editor.isActive('italic'), underline: editor.isActive('underline'),
        strike: editor.isActive('strike'), highlight: editor.isActive('highlight'), body: editor.isActive('paragraph'),
        h2: editor.isActive('heading', { level: 2 }), h3: editor.isActive('heading', { level: 3 }),
        bullet: editor.isActive('bulletList'), ordered: editor.isActive('orderedList'), task: editor.isActive('taskList'),
        quote: editor.isActive('blockquote'), code: editor.isActive('codeBlock'), link: editor.isActive('link'),
        selected: !editor.state.selection.empty, table: editor.isActive('table'),
        canAddRow: editor.can().addRowAfter(), canAddColumn: editor.can().addColumnAfter(),
        canDeleteRow: editor.can().deleteRow(), canDeleteColumn: editor.can().deleteColumn(),
        canAlign: editor.isActive('paragraph') || editor.isActive('heading'),
        canUndo: editor.can().undo(), canRedo: editor.can().redo(), listItem,
        canIndent: list ? editor.can().sinkListItem(listItem) : indent < 6,
        canOutdent: list ? editor.can().liftListItem(listItem) : indent > 0,
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
  ];
  const lists: EditorAction[] = [
    { label: 'Lista com marcadores', icon: <List size={18} />, pressed: tools.bullet, run: () => focus().toggleBulletList().run() },
    { label: 'Lista numerada', icon: <ListOrdered size={18} />, pressed: tools.ordered, run: () => focus().toggleOrderedList().run() },
    { label: 'Checklist', icon: <ListChecks size={18} />, pressed: tools.task, run: () => focus().toggleTaskList().run() },
  ];
  const quote: EditorAction = { label: 'Citação', icon: <Quote size={18} />, pressed: tools.quote, run: () => focus().toggleBlockquote().run() };
  const code: EditorAction = { label: 'Bloco de código', icon: <Code2 size={18} />, pressed: tools.code, run: () => focus().toggleCodeBlock().run() };
  const linkAction: EditorAction = { label: 'Inserir ou editar link', icon: <Link2 size={18} />, pressed: tools.link,
    run: () => { setPopover(null); setInvalidLink(false); setLink(editor.getAttributes('link').href || ''); } };
  const history: EditorAction[] = [
    { label: 'Desfazer', icon: <Undo2 size={18} />, disabled: !tools.canUndo, run: () => focus().undo().run() },
    { label: 'Refazer', icon: <Redo2 size={18} />, disabled: !tools.canRedo, run: () => focus().redo().run() },
  ];
  const align = ([
    ['left', 'Alinhar à esquerda', AlignLeft], ['center', 'Centralizar', AlignCenter],
    ['right', 'Alinhar à direita', AlignRight], ['justify', 'Justificar', AlignJustify],
  ] as const).map(([alignment, label, Icon]) => ({
    label, icon: <Icon size={18} />, pressed: (tools.block.textAlign || 'left') === alignment,
    disabled: !tools.canAlign, run: () => focus().setTextAlign(alignment).run(),
  })) satisfies EditorAction[];
  const indent = (direction: 1 | -1) => {
    if (tools.list) {
      if (direction === 1) focus().sinkListItem(tools.listItem).run();
      else focus().liftListItem(tools.listItem).run();
      return;
    }
    const { doc, selection, tr } = editor.state;
    const from = selection.empty ? selection.$from.before() : selection.from;
    const to = selection.empty ? Math.min(from + 1, doc.content.size) : selection.to;
    doc.nodesBetween(from, to, (node, pos) => {
      if (node.type.name === 'paragraph' || node.type.name === 'heading') {
        const next = Math.max(0, Math.min(6, (Number(node.attrs.indent) || 0) + direction));
        if (next !== node.attrs.indent) tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: next });
        return false;
      }
    });
    if (tr.docChanged) editor.view.dispatch(tr);
    focus().run();
  };
  const blocks: EditorAction[] = [
    { label: 'Aumentar recuo', icon: <IndentIncrease size={18} />, disabled: !tools.canIndent || (!tools.list && !tools.canAlign), run: () => indent(1) },
    { label: 'Reduzir recuo', icon: <IndentDecrease size={18} />, disabled: !tools.canOutdent || (!tools.list && !tools.canAlign), run: () => indent(-1) },
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

  const paste = (plain: boolean) => {
    setPopover(null);
    void pasteNoteSelection(editor, plain).catch(() => {
      notify(plain ? 'Use o atalho de colar sem formatação do navegador.' : 'Use o atalho ou o menu do navegador para colar.');
      if (!editor.isDestroyed) focus().run();
    });
  };
  const copy = (cut: boolean) => {
    void copyNoteSelection(editor, cut).catch(() => notify(cut ? 'Use o atalho ou o menu do navegador para recortar.' : 'Use o atalho ou o menu do navegador para copiar.'));
  };
  const toggle = (kind: typeof popover) => {
    setLink(null);
    setPopover((previous) => previous === kind ? null : kind);
  };
  const clipboard: EditorAction[] = [
    { label: 'Colar', icon: <Clipboard size={17} />, run: () => paste(false) },
    { label: 'Copiar', icon: <Copy size={17} />, disabled: !tools.selected, run: () => copy(false) },
    { label: 'Colar (extensão)', icon: <ClipboardList size={17} />, pressed: popover === 'paste', run: () => toggle('paste') },
    { label: 'Recortar', icon: <Scissors size={17} />, disabled: !tools.selected, run: () => copy(true) },
  ];
  const formatting = <div className="note-format-selects">
    <select aria-label="Estilo" title="Estilo" value={tools.h2 ? 'h2' : tools.h3 ? 'h3' : 'body'} onChange={(event) => {
      const value = event.target.value;
      if (value === 'body') focus().setParagraph().run();
      else focus().setHeading({ level: value === 'h2' ? 2 : 3 }).run();
    }}>
      <option value="body">Corpo</option><option value="h2">Título</option><option value="h3">Subtítulo</option>
    </select>
    <select aria-label="Fonte" title="Fonte" value={tools.textStyle.fontFamily ?? ''} onChange={(event) =>
      event.target.value ? focus().setFontFamily(event.target.value).run() : focus().unsetFontFamily().run()}>
      {tools.textStyle.fontFamily && !fonts.some(({ value }) => value === tools.textStyle.fontFamily) && <option value={tools.textStyle.fontFamily}>Outra fonte</option>}
      {fonts.map(({ label, value }) => <option key={label} value={value}>{label}</option>)}
    </select>
    <select aria-label="Tamanho da fonte" title="Tamanho da fonte" value={tools.textStyle.fontSize ?? ''} onChange={(event) =>
      event.target.value ? focus().setFontSize(event.target.value).run() : focus().unsetFontSize().run()}>
      <option value="">Auto</option>
      {tools.textStyle.fontSize && !sizes.some((size) => size + 'px' === tools.textStyle.fontSize) && <option value={tools.textStyle.fontSize}>{tools.textStyle.fontSize}</option>}
      {sizes.map((size) => <option key={size} value={size + 'px'}>{size} px</option>)}
    </select>
  </div>;
  const colorActions: EditorAction[] = [
    { label: 'Cor do texto', icon: <span className="note-ink-icon" style={{ borderColor: tools.textStyle.color || undefined }}>A</span>, pressed: popover === 'ink', run: () => toggle('ink') },
    { label: 'Cor de fundo', icon: <Highlighter size={18} />, pressed: tools.highlight || popover === 'highlight', run: () => toggle('highlight') },
  ];
  const clear: EditorAction = { label: 'Limpar formatação', icon: <Eraser size={18} />, run: () => focus().unsetAllMarks().clearNodes().run() };
  const separator: EditorAction = { label: 'Inserir separador', icon: <Minus size={18} />, run: () => focus().setHorizontalRule().run() };
  const groups: RibbonGroup[] = [
    { label: 'Área de Transferência', short: <Clipboard size={16} />, rows: [group(clipboard.slice(0, 2)), group(clipboard.slice(2))] },
    { label: 'Formatar', short: <strong>Aa</strong>, rows: [formatting, group([...marks, ...colorActions])] },
    { label: 'Alinhar', short: <AlignLeft size={17} />, rows: [group(align), group([...lists.slice(0, 2), ...blocks.slice(0, 2)])] },
    { label: 'Inserir', short: <Plus size={18} />, rows: tools.table
      ? [group(table.slice(0, 3)), group(table.slice(3))]
      : [group([...table, linkAction, lists[2]]), group([quote, code, separator])] },
    { label: 'Outro', short: <MoreHorizontal size={18} />, rows: [group([...history, clear]), group(blocks.slice(2))] },
  ];
  const title = popover === 'paste' ? 'Opções de colagem' : popover === 'ink' ? 'Cor do texto' : 'Cor de fundo';
  const setColor = (color?: string) => {
    setPopover(null);
    const chain = focus();
    if (popover === 'ink') (color ? chain.setColor(color) : chain.unsetColor()).run();
    else (color ? chain.setHighlight({ color }) : chain.unsetHighlight()).run();
  };
  const extra = linkForm || (popover && <section className="note-ribbon-panel" aria-label={title}
    onKeyDown={(event) => { if (event.key === 'Escape') { setPopover(null); focus().run(); } }}>
    <div className="nw-section-heading"><strong>{title}</strong>
      <IconButton label="Fechar opções" onClick={() => { setPopover(null); focus().run(); }}>×</IconButton></div>
    {popover === 'paste' ? <Toolbar>
      <Button size="sm" onMouseDown={(event) => event.preventDefault()} onClick={() => paste(false)}>Manter formatação</Button>
      <Button size="sm" onMouseDown={(event) => event.preventDefault()} onClick={() => paste(true)}>Somente texto</Button>
    </Toolbar> : <Toolbar>
      <Button size="sm" onMouseDown={(event) => event.preventDefault()} onClick={() => setColor()}>Padrão</Button>
      {(popover === 'ink' ? inkColors : highlightColors).map(([name, color]) =>
        <button type="button" key={color} className="note-color-swatch" aria-label={name} title={name}
          aria-pressed={color === (popover === 'ink' ? tools.textStyle.color : tools.highlightColor)}
          style={{ backgroundColor: color }} onMouseDown={(event) => event.preventDefault()} onClick={() => setColor(color)} />)}
    </Toolbar>}
  </section>);
  return <div className="document-editor">
    <NotebookToolbar groups={groups} extra={extra} mobile={mobile}
      dismissKeyboard={() => { if (link !== null && document.activeElement instanceof HTMLElement) document.activeElement.blur(); else editor.commands.blur(); }} />
    <EditorContent editor={editor} className="document-content" />
  </div>;
}
