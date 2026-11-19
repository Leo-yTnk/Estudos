import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { motion, useMotionValue, useReducedMotion } from 'motion/react';
import { GripVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button, IconButton, Toolbar } from '../../components/ui';
import { useApp } from '../../state/AppState';
import { springs } from '../../lib/motion';
import { getSubjectIcon, subjectIcons } from '../../lib/subjectAppearance';
import { SubjectIcon } from '../Subjects';
import { moveItem, newCard, type Card, type Cards } from '../../lib/collections';
import { CollectionSheet, ImageField, MoveControls, Options, Range } from './Fields';

function CardContent({ item, config }: { item: Card; config: Cards['config'] }) {
  return <>
    {config.visual === 'image' && (item.image ? <div className="collection-card-image" style={{ height: config.imageHeight }}>
      <img draggable={false} src={item.image.src} alt={item.image.alt} style={{ objectPosition: item.x + '% ' + item.y + '%',
        transformOrigin: item.x + '% ' + item.y + '%', scale: item.crop / 100 }} />
    </div> : <div className="collection-card-image collection-card-placeholder" style={{ height: config.imageHeight }}>Sem imagem</div>)}
    {config.visual === 'icon' && <span className="collection-card-icons">
      {item.icons.slice(0, config.iconCount).filter(Boolean).map((icon, index) => <SubjectIcon key={index} icon={getSubjectIcon({ id: '', icon })} />)}
    </span>}
    {config.title && <strong>{item.title || 'Sem título'}</strong>}
    {config.description && item.description && <div className="collection-copy">{item.description}</div>}
  </>;
}

type Gesture = { id: string; x: number; y: number; mode: 'mouse' | 'touch'; stage: 'pending' | 'held' | 'drag';
  pointer: number; timer?: number; target: number; origin?: DOMRect };

function CardGrid({ value, edit, reorder }: {
  value: Cards; edit?: (item: Card) => void; reorder?: (id: string, index: number) => void;
}) {
  const { data } = useApp();
  const reduced = useReducedMotion() || data.profile.reducedMotion;
  const grid = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const skipClick = useRef(0);
  const latest = useRef({ value, edit, reorder });
  latest.current = { value, edit, reorder };
  const [dragging, setDragging] = useState<{ id: string; target: number; origin: DOMRect } | null>(null);
  const [held, setHeld] = useState('');
  const dx = useMotionValue(0);
  const dy = useMotionValue(0);

  const track = (x: number, y: number) => {
    const active = gesture.current;
    if (!active) return;
    const distance = Math.hypot(x - active.x, y - active.y);
    if (active.stage === 'pending' && active.mode === 'touch' && distance >= 8) {
      window.clearTimeout(active.timer);
      gesture.current = null;
      return;
    }
    if (active.stage !== 'drag' && distance < 8) return;
    const root = grid.current;
    if (!root) return;
    if (!active.origin) {
      const item = Array.from(root.children).find((child) => (child as HTMLElement).dataset.cardId === active.id);
      if (!item) return;
      active.origin = item.getBoundingClientRect();
    }
    active.stage = 'drag';
    dx.set(x - active.x);
    dy.set(y - active.y);
    let closest = Infinity;
    const base = root.getBoundingClientRect();
    Array.from(root.children).forEach((child, index) => {
      const body = child as HTMLElement;
      const distance = Math.hypot(x - base.left - body.offsetLeft - body.offsetWidth / 2, y - base.top - body.offsetTop - body.offsetHeight / 2);
      if (distance < closest) { closest = distance; active.target = index; }
    });
    const { id, target, origin } = active;
    setDragging((previous) => previous?.target === target && previous.id === id ? previous : { id, target, origin });
  };
  const finish = (apply: boolean) => {
    const active = gesture.current;
    if (!active) return;
    window.clearTimeout(active.timer);
    gesture.current = null;
    if (active.stage !== 'pending') skipClick.current = performance.now() + 600;
    if (active.stage === 'drag') {
      if (apply) latest.current.reorder?.(active.id, active.target);
      setDragging(null);
      setHeld('');
    } else if (active.stage === 'held' && !apply) setHeld('');
  };

  useEffect(() => {
    const root = grid.current;
    if (!root || !edit) return;
    const start = (event: TouchEvent) => {
      if (event.touches.length !== 1 || !(event.target instanceof Element) || event.target.closest('button')) { finish(false); return; }
      const card = event.target.closest<HTMLElement>('[data-card-id]');
      const touch = event.changedTouches[0];
      if (!card?.dataset.cardId || !touch) return;
      setHeld('');
      const active: Gesture = { id: card.dataset.cardId, x: touch.clientX, y: touch.clientY, mode: 'touch', stage: 'pending',
        pointer: touch.identifier, target: Array.from(root.children).indexOf(card) };
      active.timer = window.setTimeout(() => {
        if (gesture.current === active) { active.stage = 'held'; setHeld(active.id); }
      }, 380);
      gesture.current = active;
    };
    const move = (event: TouchEvent) => {
      const active = gesture.current;
      if (active?.mode !== 'touch') return;
      const touch = Array.from(event.changedTouches).find(({ identifier }) => identifier === active.pointer);
      if (!touch) return;
      if (active.stage !== 'pending' && event.cancelable) event.preventDefault();
      track(touch.clientX, touch.clientY);
    };
    const end = (event: TouchEvent) => {
      if (gesture.current?.mode !== 'touch') return;
      if (gesture.current.stage === 'drag' && event.cancelable) event.preventDefault();
      finish(event.type === 'touchend');
    };
    const cancelMenu = (event: Event) => { if (gesture.current?.mode === 'touch' || performance.now() < skipClick.current) event.preventDefault(); };
    root.addEventListener('touchstart', start, { passive: true });
    root.addEventListener('touchmove', move, { passive: false });
    root.addEventListener('touchend', end, { passive: false });
    root.addEventListener('touchcancel', end);
    root.addEventListener('contextmenu', cancelMenu);
    return () => {
      window.clearTimeout(gesture.current?.timer);
      root.removeEventListener('touchstart', start);
      root.removeEventListener('touchmove', move);
      root.removeEventListener('touchend', end);
      root.removeEventListener('touchcancel', end);
      root.removeEventListener('contextmenu', cancelMenu);
    };
  }, [!!edit]);

  const startMouse = (event: PointerEvent<HTMLButtonElement>, id: string, target: number) => {
    if (event.pointerType === 'touch' || event.button !== 0) return;
    event.preventDefault();
    grid.current?.setPointerCapture(event.pointerId);
    gesture.current = { id, target, x: event.clientX, y: event.clientY, mode: 'mouse', stage: 'pending', pointer: event.pointerId };
  };
  const ordered = dragging ? moveItem(value.items, value.items.findIndex(({ id }) => id === dragging.id), dragging.target) : value.items;
  const moving = dragging && value.items.find(({ id }) => id === dragging.id);
  return <div className="collection-card-region" onKeyDown={(event) => { if (event.key === 'Escape') finish(false); }}>
    <div className="collection-card-grid" ref={grid} onPointerMove={(event) => {
      if (gesture.current?.mode === 'mouse' && gesture.current.pointer === event.pointerId) track(event.clientX, event.clientY);
    }} onPointerUp={(event) => { if (gesture.current?.mode === 'mouse' && gesture.current.pointer === event.pointerId) finish(true); }}
      onLostPointerCapture={(event) => { if (gesture.current?.mode === 'mouse' && gesture.current.pointer === event.pointerId) finish(false); }}
      onPointerCancel={(event) => { if (gesture.current?.mode === 'mouse' && gesture.current.pointer === event.pointerId) finish(false); }}
      style={{ '--card-columns': value.config.columns } as CSSProperties}>
      {ordered.map((item) => <motion.article key={item.id} layout={reduced ? false : 'position'} transition={springs.layout}
        data-card-id={item.id} data-held={held === item.id} data-placeholder={dragging?.id === item.id} className="collection-card"
        onClick={edit ? () => { if (performance.now() >= skipClick.current) edit(item); } : undefined}>
        <div className="collection-card-content"><CardContent item={item} config={value.config} /></div>
        {edit && <div className="collection-card-actions" onClick={(event) => event.stopPropagation()}>
          <IconButton label={'Editar card ' + (item.title || '')} onClick={() => edit(item)}><Pencil size={16} /></IconButton>
          <IconButton label={'Arrastar card ' + (item.title || '')} className="card-grip"
            onPointerDown={(event) => startMouse(event, item.id, value.items.indexOf(item))}
            onClick={() => { if (performance.now() >= skipClick.current) edit(item); }}><GripVertical size={16} /></IconButton>
        </div>}
      </motion.article>)}
    </div>
    {moving && dragging && <motion.div aria-hidden="true" className="collection-card collection-card-moving"
      style={{ x: dx, y: dy, left: dragging.origin.left, top: dragging.origin.top, width: dragging.origin.width, height: dragging.origin.height }}>
      <div className="collection-card-content"><CardContent item={moving} config={value.config} /></div>
    </motion.div>}
  </div>;
}

export function CardsConfig({ value, change }: { value: Cards; change: (value: Cards) => void }) {
  const config = value.config;
  const set = (patch: Partial<Cards['config']>) => change({ ...value, config: { ...config, ...patch } });
  return <>
    <Options label="Elemento visual" value={config.visual} options={[['icon', 'Ícone'], ['image', 'Imagem'], ['none', 'Nenhum']]}
      onChange={(visual) => {
        if (visual === 'none' && !config.title && !config.description) set({ visual, title: true });
        else set({ visual });
      }} />
    {config.visual === 'icon' && <Options label="Ícones por card" value={config.iconCount} options={[[1, '1'], [2, '2']]} onChange={(iconCount) => set({ iconCount })} />}
    {config.visual === 'image' && <Range label="Altura da imagem" value={config.imageHeight} min={72} max={320} unit=" px" onChange={(imageHeight) => set({ imageHeight })} />}
    <label className="toggle-row">Título<input type="checkbox" checked={config.title}
      disabled={config.title && config.visual === 'none' && !config.description} onChange={(event) => set({ title: event.target.checked })} /></label>
    <label className="toggle-row">Descrição<input type="checkbox" checked={config.description}
      disabled={config.description && config.visual === 'none' && !config.title} onChange={(event) => set({ description: event.target.checked })} /></label>
    {config.visual === 'none' && <small className="nw-muted">Mantenha o título ou a descrição ativados.</small>}
    <Options label="Cards por linha" value={config.columns} options={[[1, '1'], [2, '2'], [3, '3'], [4, '4']]} onChange={(columns) => set({ columns })} />
    <section className="collection-preview" aria-label="Prévia do conjunto">
      <strong>Prévia</strong>
      <CardGrid value={value} />
    </section>
  </>;
}

export function CardSet({ value, change }: { value: Cards; change: (value: Cards) => void }) {
  const [draft, setDraft] = useState<Card | null>(null);
  const index = value.items.findIndex(({ id }) => id === draft?.id);
  const config = value.config;
  const reorder = (id: string, target: number) => {
    const items = moveItem(value.items, value.items.findIndex((item) => item.id === id), target);
    if (items !== value.items) change({ ...value, items });
  };
  return <>
    <CardGrid value={value} edit={setDraft} reorder={reorder} />
    <Button size="sm" variant="ghost" icon={<Plus size={16} />} onClick={() => setDraft(newCard())}>Adicionar card</Button>
    {draft && <CollectionSheet title={index < 0 ? 'Adicionar card' : 'Editar card'} close={() => setDraft(null)}>
      {config.visual === 'icon' && Array.from({ length: config.iconCount }, (_, slot) =>
        <Options key={slot} label={'Ícone ' + (slot + 1)} value={draft.icons[slot] || ''} options={[['', 'Nenhum'], ...subjectIcons.map(({ icon, label }) => [icon.iconName, label] as const)]}
          onChange={(name) => setDraft({ ...draft, icons: Array.from({ length: 2 }, (_, i) => i === slot ? name : draft.icons[i] || '') })} />)}
      {config.visual === 'image' && <>
        <ImageField image={draft.image} change={(image) => setDraft((item) => item && { ...item, image })} />
        {draft.image && <>
          <Range label="Posição horizontal" value={draft.x} min={0} max={100} unit="%" onChange={(x) => setDraft({ ...draft, x })} />
          <Range label="Posição vertical" value={draft.y} min={0} max={100} unit="%" onChange={(y) => setDraft({ ...draft, y })} />
          <Range label="Ampliação do recorte" value={draft.crop} min={100} max={250} unit="%" onChange={(crop) => setDraft({ ...draft, crop })} />
        </>}
      </>}
      {config.title && <label className="field-label">Título<input className="ds-input" maxLength={160} value={draft.title}
        onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>}
      {config.description && <label className="field-label">Descrição<textarea className="ds-input" maxLength={4000} value={draft.description}
        onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>}
      <div className="collection-card"><div className="collection-card-content"><CardContent item={draft} config={config} /></div></div>
      {index >= 0 && <MoveControls subject="card" index={index} count={value.items.length} move={(target) => reorder(draft.id, target)} />}
      <Toolbar>
        <Button variant="primary" size="sm" onClick={() => {
          change({ ...value, items: index < 0 ? [...value.items, draft] : value.items.map((item) => item.id === draft.id ? draft : item) });
          setDraft(null);
        }}>Salvar card</Button>
        {index >= 0 && <Button size="sm" variant="danger" icon={<Trash2 size={16} />} onClick={() => {
          change({ ...value, items: value.items.filter(({ id }) => id !== draft.id) });
          setDraft(null);
        }}>Excluir card</Button>}
      </Toolbar>
    </CollectionSheet>}
  </>;
}
