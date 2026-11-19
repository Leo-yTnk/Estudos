import { useId, useRef, useState, type FormEvent, type PointerEvent } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Link2, Maximize, Minus, Plus, Trash2, Workflow } from 'lucide-react';
import { Button, IconButton, Toolbar } from '../../components/ui';
import { bound, flowSize, layoutFlow, type Flow, type FlowEdge, type FlowNode } from '../../lib/collections';
import { uid } from '../../types';
import { CollectionSheet, Options, orientations, Range } from './Fields';

const shapes = [['terminal', 'Início/fim'], ['process', 'Processo'], ['decision', 'Decisão']] as const;
const connectionStyles = [['straight', 'Retas'], ['curved', 'Curvas'], ['elbow', 'Em ângulo']] as const;
const { width, height } = flowSize;

function connection(from: FlowNode, to: FlowNode, config: Flow['config']) {
  const horizontal = config.orientation === 'horizontal';
  const sign = (horizontal ? to.x - from.x : to.y - from.y) >= 0 ? 1 : -1;
  const x1 = from.x + (horizontal ? width * (sign > 0 ? 1 : 0) : width / 2);
  const y1 = from.y + (horizontal ? height / 2 : height * (sign > 0 ? 1 : 0));
  const x2 = to.x + (horizontal ? width * (sign < 0 ? 1 : 0) : width / 2);
  const y2 = to.y + (horizontal ? height / 2 : height * (sign < 0 ? 1 : 0));
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const midpoints = horizontal ? [midX, y1, midX, y2] : [x1, midY, x2, midY];
  const start = 'M' + x1 + ',' + y1;
  const end = x2 + ',' + y2;
  const path = config.connections === 'straight' ? start + ' L' + end : config.connections === 'curved'
    ? start + ' C' + midpoints.join(' ') + ' ' + end
    : start + ' L' + midpoints.slice(0, 2).join(',') + ' L' + midpoints.slice(2).join(',') + ' L' + end;
  return { path, midX, midY };
}

type Drag = { node: FlowNode; pointer: number; x: number; y: number; scrollX: number; scrollY: number; moved: boolean };

function FlowCanvas({ value, move, edit, zoom, viewport }: {
  value: Flow; move?: (node: FlowNode) => void; edit?: (node: FlowNode) => void; zoom: number;
  viewport?: React.RefObject<HTMLDivElement | null>;
}) {
  const marker = 'flow-arrow-' + useId();
  const drag = useRef<Drag | null>(null);
  const ignoreClick = useRef(false);
  const [preview, setPreview] = useState<FlowNode | null>(null);
  const nodes = value.nodes.map((node) => preview?.id === node.id ? preview : node);
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const canvasWidth = Math.max(320, ...nodes.map(({ x }) => x + width + 26));
  const canvasHeight = Math.max(224, ...nodes.map(({ y }) => y + height + 26));
  const point = (event: PointerEvent<HTMLButtonElement>, state: Drag) => {
    const dx = (event.clientX - state.x + (viewport?.current?.scrollLeft ?? 0) - state.scrollX) / zoom;
    const dy = (event.clientY - state.y + (viewport?.current?.scrollTop ?? 0) - state.scrollY) / zoom;
    return { ...state.node, x: bound(Math.round(state.node.x + dx), 16, 100000), y: bound(Math.round(state.node.y + dy), 16, 100000) };
  };
  const finish = (event: PointerEvent<HTMLButtonElement>, save: boolean) => {
    const state = drag.current;
    if (!state || state.pointer !== event.pointerId) return;
    drag.current = null;
    setPreview(null);
    if (!state.moved) return;
    ignoreClick.current = true;
    if (save) move?.(point(event, state));
  };
  return <div className="flow-viewport" ref={viewport} tabIndex={0} role="region" aria-label="Área navegável do fluxograma">
    <div className="flow-footprint" style={{ width: canvasWidth * zoom, height: canvasHeight * zoom }}>
      <div className="flow-canvas" style={{ width: canvasWidth, height: canvasHeight, transform: 'scale(' + zoom + ')' }}>
        <svg aria-hidden="true" width={canvasWidth} height={canvasHeight} className="flow-lines">
          <defs><marker id={marker} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0 0 L8 4 L0 8 Z" fill="currentColor" /></marker></defs>
          {value.edges.map((edge) => {
            const from = byId.get(edge.from);
            const to = byId.get(edge.to);
            if (!from || !to) return null;
            const { path, midX, midY } = connection(from, to, value.config);
            return <g key={edge.id}><path d={path} markerEnd={'url(#' + marker + ')'} />
              {edge.label && <text x={midX} y={midY - 7} textAnchor="middle">{edge.label}</text>}</g>;
          })}
        </svg>
        {nodes.map((node) => {
          const style = { width, height, left: node.x, top: node.y };
          const label = node.label || shapes.find(([key]) => key === node.kind)?.[1];
          if (!edit) return <div key={node.id} className="flow-node" data-kind={node.kind} style={style}><span>{label}</span></div>;
          return <button type="button" key={node.id} className="flow-node" data-kind={node.kind} style={style}
            aria-label={label + ', ' + shapes.find(([key]) => key === node.kind)?.[1]}
            onPointerDown={(event) => {
              if (event.button !== 0 || !event.isPrimary) return;
              ignoreClick.current = false;
              drag.current = { node, pointer: event.pointerId, x: event.clientX, y: event.clientY, moved: false,
                scrollX: viewport?.current?.scrollLeft ?? 0, scrollY: viewport?.current?.scrollTop ?? 0 };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              const state = drag.current;
              if (!state || event.pointerId !== state.pointer) return;
              if (!state.moved && Math.hypot(event.clientX - state.x, event.clientY - state.y) < 7) return;
              state.moved = true;
              setPreview(point(event, state));
            }}
            onPointerUp={(event) => finish(event, true)} onPointerCancel={(event) => finish(event, false)}
            onLostPointerCapture={(event) => finish(event, false)}
            onClick={(event) => { if (!ignoreClick.current || event.detail === 0) edit(node); ignoreClick.current = false; }}
            onKeyDown={(event) => {
              const offset = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
              if (!offset) return;
              event.preventDefault();
              event.stopPropagation();
              const step = event.shiftKey ? 40 : 12;
              move?.({ ...node, x: bound(node.x + offset[0] * step, 16, 100000), y: bound(node.y + offset[1] * step, 16, 100000) });
            }}><span>{label}</span></button>;
        })}
      </div>
    </div>
  </div>;
}

export function FlowConfig({ value, change }: { value: Flow; change: (value: Flow) => void }) {
  const config = value.config;
  const set = (patch: Partial<Flow['config']>, relayout = false) => {
    const next = { ...value, config: { ...config, ...patch } };
    change(relayout ? { ...next, nodes: layoutFlow(next) } : next);
  };
  return <>
    <Options label="Orientação" value={config.orientation} options={orientations} onChange={(orientation) => set({ orientation }, true)} />
    <Range label="Espaçamento entre nós" value={config.spacing} min={30} max={160} unit=" px" onChange={(spacing) => set({ spacing }, true)} />
    <Options label="Estilo das conexões" value={config.connections} options={connectionStyles} onChange={(connections) => set({ connections })} />
    <section className="collection-preview" aria-label="Prévia do fluxograma"><strong>Prévia</strong><FlowCanvas value={value} zoom={.7} /></section>
  </>;
}

export function FlowSet({ value, change }: { value: Flow; change: (value: Flow) => void }) {
  const [zoom, setZoom] = useState(1);
  const [nodeDraft, setNodeDraft] = useState<FlowNode | null>(null);
  const [edgeDraft, setEdgeDraft] = useState<FlowEdge | null>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const existingNode = value.nodes.find(({ id }) => nodeDraft?.id === id);
  const existingEdge = value.edges.find(({ id }) => edgeDraft?.id === id);
  const move = (next: FlowNode) => change({ ...value, nodes: value.nodes.map((node) => node.id === next.id ? next : node) });
  const zoomTo = (nextZoom: number) => setZoom(bound(Math.round(nextZoom * 100) / 100, .35, 2));
  const saveNode = (event: FormEvent) => {
    event.preventDefault();
    if (!nodeDraft?.label.trim()) return;
    const next = { ...nodeDraft, label: nodeDraft.label.trim() };
    if (existingNode) move(next);
    else change({ ...value, nodes: [...value.nodes, next] });
    setNodeDraft(null);
  };
  const saveEdge = (event: FormEvent) => {
    event.preventDefault();
    if (!edgeDraft || edgeDraft.from === edgeDraft.to ||
      value.edges.some((edge) => edge.from === edgeDraft.from && edge.to === edgeDraft.to && edge.id !== edgeDraft.id)) return;
    change({ ...value, edges: existingEdge ? value.edges.map((edge) => edge.id === edgeDraft.id ? edgeDraft : edge) : [...value.edges, edgeDraft] });
    setEdgeDraft(null);
  };
  const nodeOptions = value.nodes.map(({ id, label }) => [id, label] as const);
  const duplicateEdge = edgeDraft && value.edges.some((edge) => edge.from === edgeDraft.from && edge.to === edgeDraft.to && edge.id !== edgeDraft.id);
  return <>
    <Toolbar className="collection-tools">
      <Button variant="ghost" size="sm" icon={<Plus size={16} />} onClick={() => {
        const horizontal = value.config.orientation === 'horizontal';
        const right = Math.max(24 - width, ...value.nodes.map(({ x }) => x));
        const bottom = Math.max(28 - height, ...value.nodes.map(({ y }) => y));
        setNodeDraft({ id: uid(), kind: 'process', label: '', x: horizontal ? bound(right + width + value.config.spacing, 24, 100000) : 24,
          y: horizontal ? 28 : bound(bottom + height + value.config.spacing, 28, 100000) });
      }}>Adicionar nó</Button>
      <Button variant="ghost" size="sm" icon={<Link2 size={16} />} disabled={value.nodes.length < 2} onClick={() =>
        setEdgeDraft({ id: uid(), from: value.nodes[0].id, to: value.nodes[1].id, label: '' })}>Conectar nós</Button>
      <Button variant="ghost" size="sm" icon={<Workflow size={16} />} disabled={!value.nodes.length}
        onClick={() => change({ ...value, nodes: layoutFlow(value) })}>Organizar nós</Button>
    </Toolbar>
    <FlowCanvas value={value} edit={setNodeDraft} move={move} zoom={zoom} viewport={viewport} />
    <Toolbar label="Zoom e navegação do fluxograma" className="collection-tools">
      <IconButton label="Diminuir zoom" disabled={zoom <= .35} onClick={() => zoomTo(zoom - .15)}><Minus size={16} /></IconButton>
      <output aria-label="Zoom atual">{Math.round(zoom * 100)}%</output>
      <IconButton label="Aumentar zoom" disabled={zoom >= 2} onClick={() => zoomTo(zoom + .15)}><Plus size={16} /></IconButton>
      <IconButton label="Voltar ao início do fluxograma" onClick={() => { zoomTo(1); viewport.current?.scrollTo(0, 0); }}><Maximize size={16} /></IconButton>
      {([[ArrowLeft, -1, 0, 'esquerda'], [ArrowRight, 1, 0, 'direita'], [ArrowUp, 0, -1, 'cima'], [ArrowDown, 0, 1, 'baixo']] as const)
        .map(([Icon, x, y, label]) => <IconButton key={label} label={'Navegar para ' + label}
          onClick={() => viewport.current?.scrollBy(x * 100, y * 100)}><Icon size={16} /></IconButton>)}
    </Toolbar>
    {!!value.edges.length && <details className="flow-edges"><summary>Conexões ({value.edges.length})</summary>
      <div className="collection-tools">{value.edges.map((edge) => <Button key={edge.id} size="sm" onClick={() => setEdgeDraft(edge)}>
        {value.nodes.find(({ id }) => id === edge.from)?.label} → {value.nodes.find(({ id }) => id === edge.to)?.label}{edge.label && ' · ' + edge.label}
      </Button>)}</div>
    </details>}
    {nodeDraft && <CollectionSheet title={existingNode ? 'Editar nó' : 'Adicionar nó'} close={() => setNodeDraft(null)}>
      <form className="collection-form" onSubmit={saveNode}>
        <label className="field-label">Texto do nó<input className="ds-input" required maxLength={120} value={nodeDraft.label}
          onChange={(event) => setNodeDraft({ ...nodeDraft, label: event.target.value })} /></label>
        <Options label="Tipo de nó" value={nodeDraft.kind} options={shapes} onChange={(kind) => setNodeDraft({ ...nodeDraft, kind })} />
        <div className="collection-field-row">
          <label className="field-label">Posição X<input className="ds-input" type="number" min={16} max={100000} required value={Number.isNaN(nodeDraft.x) ? '' : nodeDraft.x}
            onChange={(event) => setNodeDraft({ ...nodeDraft, x: event.target.valueAsNumber })} /></label>
          <label className="field-label">Posição Y<input className="ds-input" type="number" min={16} max={100000} required value={Number.isNaN(nodeDraft.y) ? '' : nodeDraft.y}
            onChange={(event) => setNodeDraft({ ...nodeDraft, y: event.target.valueAsNumber })} /></label>
        </div>
        <Toolbar>
          <Button size="sm" variant="primary" type="submit">Salvar nó</Button>
          {existingNode && <Button size="sm" variant="danger" icon={<Trash2 size={16} />} onClick={() => {
            change({ ...value, nodes: value.nodes.filter(({ id }) => id !== nodeDraft.id),
              edges: value.edges.filter(({ from, to }) => from !== nodeDraft.id && to !== nodeDraft.id) });
            setNodeDraft(null);
          }}>Excluir nó</Button>}
        </Toolbar>
      </form>
    </CollectionSheet>}
    {edgeDraft && <CollectionSheet title={existingEdge ? 'Editar conexão' : 'Conectar nós'} close={() => setEdgeDraft(null)}>
      <form className="collection-form" onSubmit={saveEdge}>
        <Options label="Origem" value={edgeDraft.from} options={nodeOptions} onChange={(from) => setEdgeDraft({ ...edgeDraft, from })} />
        <Options label="Destino" value={edgeDraft.to} options={nodeOptions} onChange={(to) => setEdgeDraft({ ...edgeDraft, to })} />
        <label className="field-label">Rótulo (opcional)<input className="ds-input" maxLength={50} value={edgeDraft.label}
          onChange={(event) => setEdgeDraft({ ...edgeDraft, label: event.target.value })} /></label>
        {duplicateEdge && <small role="status">Essa conexão já existe.</small>}
        <Toolbar>
          <Button size="sm" variant="primary" type="submit" disabled={duplicateEdge || edgeDraft.from === edgeDraft.to}>Salvar conexão</Button>
          {existingEdge && <Button size="sm" variant="danger" icon={<Trash2 size={16} />} onClick={() => {
            change({ ...value, edges: value.edges.filter(({ id }) => id !== edgeDraft.id) });
            setEdgeDraft(null);
          }}>Excluir conexão</Button>}
        </Toolbar>
      </form>
    </CollectionSheet>}
  </>;
}
