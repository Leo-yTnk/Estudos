import { useEffect, useRef, useState } from 'react';
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react';
import { closeHistory } from '@tiptap/pm/history';
import { NodeSelection } from '@tiptap/pm/state';
import { ArrowDown, ArrowUp, CalendarRange, Copy, LayoutGrid, Plus, Settings2, Trash2, Workflow } from 'lucide-react';
import { Button, IconButton, Toolbar } from '../../components/ui';
import { bound, collectionTypes, CollectionBlock, localImage, NoteImage, newCard, readCollection, type Collection } from '../../lib/collections';
import { canMoveBlock, moveBlock } from '../../lib/editorBlocks';
import { CardsConfig, CardSet } from './CardSet';
import { FlowConfig, FlowSet } from './FlowSet';
import { TimelineConfig, TimelineSet } from './TimelineSet';
import { CollectionSheet, ImageField, Options, Range } from './Fields';

export const collectionIcons = { cards: LayoutGrid, flow: Workflow, timeline: CalendarRange };
export const editDocumentBlock = 'nowwork:edit-document-block';

function selectBlock({ editor, getPos }: NodeViewProps) {
  const position = getPos();
  if (typeof position !== 'number') return false;
  if (editor.state.selection instanceof NodeSelection && editor.state.selection.from === position) return true;
  return editor.commands.setNodeSelection(position);
}

function updateBlock(props: NodeViewProps, attributes: Record<string, unknown>) {
  if (props.editor.isDestroyed) return;
  const position = props.getPos();
  if (typeof position !== 'number') return;
  const current = props.editor.state.doc.nodeAt(position);
  if (!current || current.type !== props.node.type) return;
  const tr = props.editor.state.tr;
  for (const [name, value] of Object.entries(attributes)) tr.setNodeAttribute(position, name, value);
  if (!tr.doc.eq(props.editor.state.doc)) props.editor.view.dispatch(closeHistory(tr));
}

function removeBlock(props: NodeViewProps) {
  const position = props.getPos();
  if (typeof position !== 'number') return;
  const { editor, node } = props;
  editor.view.dispatch(closeHistory(editor.state.tr.deleteRange(position, position + node.nodeSize)));
  editor.commands.focus();
}

function Configuration({ value, change }: { value: Collection; change: (value: Collection) => void }) {
  switch (value.kind) {
    case 'cards': return <CardsConfig value={value} change={change} />;
    case 'flow': return <FlowConfig value={value} change={change} />;
    case 'timeline': return <TimelineConfig value={value} change={change} />;
  }
}

function CollectionView(props: NodeViewProps) {
  const { editor, node, selected, getPos } = props;
  const root = useRef<HTMLElement>(null);
  const [draft, setDraft] = useState<Collection | null>(null);
  const [focusCardId, setFocusCardId] = useState('');
  const value = readCollection(node.attrs.value);
  useEffect(() => {
    const element = root.current;
    const open = () => setDraft(readCollection(node.attrs.value));
    element?.addEventListener(editDocumentBlock, open);
    return () => element?.removeEventListener(editDocumentBlock, open);
  }, [node]);
  const change = (next: Collection) => updateBlock(props, { value: next });
  const move = (direction: -1 | 1) => {
    if (!selectBlock(props)) return;
    const transaction = moveBlock(editor.state, direction);
    if (transaction) editor.view.dispatch(closeHistory(transaction));
    editor.commands.focus();
  };
  const duplicate = () => {
    const position = getPos();
    if (typeof position !== 'number') return;
    const tr = editor.state.tr.insert(position + node.nodeSize, node);
    editor.view.dispatch(closeHistory(tr.setSelection(NodeSelection.create(tr.doc, position + node.nodeSize))));
    editor.commands.focus();
  };
  const Icon = value ? collectionIcons[value.kind] : LayoutGrid;
  return <NodeViewWrapper as="section" ref={root} className="collection-block" data-selected={selected} contentEditable={false}>
    <header className="collection-head">
      <Button size="sm" variant="ghost" className="collection-label" aria-pressed={selected} icon={<Icon size={18} />}
        onClick={() => { if (selectBlock(props)) editor.commands.focus(); }}>{value ? collectionTypes[value.kind].label : 'Conjunto indisponível'}</Button>
      <Toolbar label="Ações do conjunto">
        {value?.kind === 'cards' && <IconButton label="Adicionar card" onClick={() => {
          const item = newCard();
          change({ ...value, items: [...value.items, item] });
          setFocusCardId(item.id);
        }}><Plus size={18} /></IconButton>}
        {value && <IconButton label="Editar conjunto" onClick={() => { selectBlock(props); setDraft(value); }}><Settings2 size={18} /></IconButton>}
        <IconButton label="Mover conjunto para cima" disabled={selected && !canMoveBlock(editor.state, -1)} onClick={() => move(-1)}><ArrowUp size={16} /></IconButton>
        <IconButton label="Mover conjunto para baixo" disabled={selected && !canMoveBlock(editor.state, 1)} onClick={() => move(1)}><ArrowDown size={16} /></IconButton>
        <IconButton label="Duplicar conjunto" onClick={duplicate}><Copy size={16} /></IconButton>
        <IconButton label="Excluir conjunto" onClick={() => removeBlock(props)}><Trash2 size={16} /></IconButton>
      </Toolbar>
    </header>
    {value?.kind === 'cards' && <CardSet value={value} change={change} focusCardId={focusCardId} />}
    {value?.kind === 'flow' && <FlowSet value={value} change={change} />}
    {value?.kind === 'timeline' && <TimelineSet value={value} change={change} />}
    {draft && <CollectionSheet title="Editar conjunto" close={() => setDraft(null)}>
      <Configuration value={draft} change={setDraft} />
      <Toolbar><Button variant="primary" size="sm" onClick={() => { change(draft); setDraft(null); }}>Aplicar configurações</Button></Toolbar>
    </CollectionSheet>}
  </NodeViewWrapper>;
}

function ImageView(props: NodeViewProps) {
  const root = useRef<HTMLElement>(null);
  const { node, editor, selected } = props;
  const image = localImage(node.attrs.image);
  const width = bound(Number(node.attrs.width) || 100, 25, 100);
  const align = (['left', 'center', 'right'] as const).find((value) => value === node.attrs.align) ?? 'center';
  const [draft, setDraft] = useState({ image, width, align });
  const [open, setOpen] = useState(false);
  const edit = () => { setDraft({ image, width, align }); setOpen(true); };
  useEffect(() => {
    const element = root.current;
    element?.addEventListener(editDocumentBlock, edit);
    return () => element?.removeEventListener(editDocumentBlock, edit);
  }, [node]);
  return <NodeViewWrapper as="figure" ref={root} className="note-image-block" data-align={align} data-selected={selected} contentEditable={false}>
    <button type="button" className="note-image-select" aria-label={image?.alt || 'Selecionar imagem'} aria-pressed={selected}
      style={{ width: width + '%' }} onClick={() => { if (selectBlock(props)) editor.commands.focus(); }}>
      {image ? <img src={image.src} alt={image.alt} draggable={false} /> : 'Imagem indisponível'}
    </button>
    <Toolbar className="note-image-actions">
      <IconButton label="Editar imagem" onClick={edit}><Settings2 size={17} /></IconButton>
      <IconButton label="Excluir imagem" onClick={() => removeBlock(props)}><Trash2 size={17} /></IconButton>
    </Toolbar>
    {open && <CollectionSheet title="Editar imagem" close={() => setOpen(false)}>
      <ImageField image={draft.image} change={(next) => setDraft((current) => ({ ...current, image: next }))} />
      <Range label="Largura" value={draft.width} min={25} max={100} unit="%" onChange={(next) => setDraft({ ...draft, width: next })} />
      <Options label="Alinhamento da imagem" value={draft.align} options={[[ 'left', 'Esquerda'], ['center', 'Centro'], ['right', 'Direita']]}
        onChange={(next) => setDraft({ ...draft, align: next })} />
      <Button size="sm" variant="primary" disabled={!draft.image} onClick={() => { updateBlock(props, draft); setOpen(false); }}>Salvar imagem</Button>
    </CollectionSheet>}
  </NodeViewWrapper>;
}

export const blockViews = {
  collection: CollectionBlock.extend({ addNodeView: () => ReactNodeViewRenderer(CollectionView) }),
  noteImage: NoteImage.extend({ addNodeView: () => ReactNodeViewRenderer(ImageView) }),
};
