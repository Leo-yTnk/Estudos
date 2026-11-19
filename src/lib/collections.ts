import { Node } from '@tiptap/core';
import { uid } from '../types';

export interface LocalImage { src: string; alt: string }
export interface Card { id: string; title: string; description: string; icons: string[]; image: LocalImage | null; x: number; y: number; crop: number }
export interface FlowNode { id: string; label: string; kind: 'terminal' | 'process' | 'decision'; x: number; y: number }
export interface FlowEdge { id: string; from: string; to: string; label: string }
export interface TimelineEvent { id: string; date: string; end: string; title: string; description: string }
type Orientation = 'vertical' | 'horizontal';

export interface Cards { version: 1; kind: 'cards'; items: Card[]; config: {
  visual: 'image' | 'icon' | 'none'; iconCount: number; imageHeight: number; title: boolean; description: boolean; columns: number;
} }
export interface Flow { version: 1; kind: 'flow'; nodes: FlowNode[]; edges: FlowEdge[]; config: {
  orientation: Orientation; spacing: number; connections: 'straight' | 'curved' | 'elbow';
} }
export interface Timeline { version: 1; kind: 'timeline'; items: TimelineEvent[]; config: {
  orientation: Orientation; order: 'manual' | 'date'; marker: 'circle' | 'diamond' | 'square'; dates: 'short' | 'long' | 'year' | 'hidden';
} }
export type Collection = Cards | Flow | Timeline;
export type CollectionKind = Collection['kind'];

export const collectionTypes = {
  cards: { label: 'Cards', description: 'Informações em uma grade responsiva.' },
  flow: { label: 'Fluxograma', description: 'Etapas e decisões conectadas.' },
  timeline: { label: 'Linha do tempo', description: 'Acontecimentos organizados por data.' },
} satisfies Record<CollectionKind, { label: string; description: string }>;

const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' ? value as Record<string, unknown> : {};
const list = (value: unknown) => Array.isArray(value) ? value.map(record) : [];
const text = (value: unknown, max = 4000) => typeof value === 'string' ? value.slice(0, max) : '';
export const bound = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const number = (value: unknown, fallback: number, min: number, max: number) =>
  typeof value === 'number' && Number.isFinite(value) ? bound(Math.round(value), min, max) : fallback;
const choice = <T extends string>(value: unknown, options: readonly T[], fallback: T) =>
  options.find((option) => option === value) ?? fallback;
const identified = <T extends { id: string }>(items: T[]) => {
  const ids = new Set<string>();
  return items.filter(({ id }) => !!id && !ids.has(id) && !!ids.add(id));
};

export function localImage(value: unknown): LocalImage | null {
  const { src, alt } = record(value);
  return typeof src === 'string' && src.length <= 600_000 && /^data:image\/(?:webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(src)
    ? { src, alt: text(alt, 250) } : null;
}

const validDate = (value: unknown) => {
  const date = text(value, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return '';
  const timestamp = Date.parse(date);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === date ? date : '';
};

export function readCollection(value: unknown): Collection | null {
  const data = record(value);
  const config = record(data.config);
  if (data.version !== 1) return null;
  if (data.kind === 'cards') {
    const visual = choice(config.visual, ['image', 'icon', 'none'], 'icon');
    const description = config.description !== false;
    return { version: 1, kind: 'cards', config: {
      visual, description, title: config.title !== false || (visual === 'none' && !description),
      iconCount: number(config.iconCount, 1, 1, 2), imageHeight: number(config.imageHeight, 140, 72, 320),
      columns: number(config.columns, 3, 1, 4),
    }, items: identified(list(data.items).map((item) => ({
      id: text(item.id, 70), title: text(item.title, 160), description: text(item.description),
      icons: Array.isArray(item.icons) ? item.icons.slice(0, 2).map((icon) => text(icon, 60)) : [],
      image: localImage(item.image), x: number(item.x, 50, 0, 100), y: number(item.y, 50, 0, 100), crop: number(item.crop, 100, 100, 250),
    }))) };
  }
  const orientation = choice(config.orientation, ['vertical', 'horizontal'], 'vertical');
  if (data.kind === 'flow') {
    const nodes = identified(list(data.nodes).map((node): FlowNode => ({
      id: text(node.id, 70), label: text(node.label, 120), kind: choice(node.kind, ['terminal', 'process', 'decision'], 'process'),
      x: number(node.x, 24, 16, 100000), y: number(node.y, 24, 16, 100000),
    })));
    const ids = new Set(nodes.map(({ id }) => id));
    const edges = identified(list(data.edges).map((edge) => ({
      id: text(edge.id, 70), from: text(edge.from, 70), to: text(edge.to, 70), label: text(edge.label, 50),
    }))).filter(({ from, to }) => from !== to && ids.has(from) && ids.has(to));
    return { version: 1, kind: 'flow', nodes, edges, config: { orientation,
      spacing: number(config.spacing, 72, 30, 160), connections: choice(config.connections, ['straight', 'curved', 'elbow'], 'curved'),
    } };
  }
  if (data.kind === 'timeline') return { version: 1, kind: 'timeline', config: {
    orientation, order: choice(config.order, ['manual', 'date'], 'date'),
    marker: choice(config.marker, ['circle', 'diamond', 'square'], 'circle'),
    dates: choice(config.dates, ['short', 'long', 'year', 'hidden'], 'short'),
  }, items: identified(list(data.items).map((item) => {
    const date = validDate(item.date);
    const end = validDate(item.end);
    return { id: text(item.id, 70), date, end: date && end >= date ? end : '', title: text(item.title, 160), description: text(item.description) };
  })) };
  return null;
}

export const newCard = (title = ''): Card => ({ id: uid(), title, description: '', icons: ['book-open'], image: null, x: 50, y: 50, crop: 100 });
export const newEvent = (): TimelineEvent => ({ id: uid(), date: '', end: '', title: '', description: '' });

export function createCollection(kind: CollectionKind): Collection {
  switch (kind) {
    case 'cards': return { version: 1, kind, items: [newCard('Novo card')], config: {
      visual: 'icon', title: true, description: true, iconCount: 1, imageHeight: 140, columns: 3,
    } };
    case 'timeline': return { version: 1, kind, items: [], config: {
      orientation: 'vertical', order: 'date', marker: 'circle', dates: 'short',
    } };
    case 'flow': {
      const start: FlowNode = { id: uid(), kind: 'terminal', label: 'Início', x: 24, y: 28 };
      const end: FlowNode = { id: uid(), kind: 'terminal', label: 'Fim', x: 24, y: 172 };
      return { version: 1, kind, nodes: [start, end], edges: [{ id: uid(), from: start.id, to: end.id, label: '' }],
        config: { orientation: 'vertical', spacing: 72, connections: 'curved' } };
    }
  }
}

export function collectionText(collection: Collection | null) {
  if (!collection) return '';
  if (collection.kind === 'flow') return [...collection.nodes.map(({ label }) => label), ...collection.edges.map(({ label }) => label)].join(' ');
  return collection.items.map((item) => [item.title, item.description, 'date' in item ? item.date + ' ' + item.end : item.image?.alt].filter(Boolean).join(' ')).join(' ');
}

export const CollectionBlock = Node.create({
  name: 'collection', group: 'block', atom: true, selectable: true,
  addAttributes() { return { value: { default: null, rendered: false } }; },
  parseHTML() {
    return [{ tag: 'section[data-nw-collection]', getAttrs(element) {
      try {
        const value = readCollection(JSON.parse(element.getAttribute('data-nw-collection') ?? ''));
        return value ? { value } : false;
      } catch { return false; }
    } }];
  },
  renderHTML({ node }) {
    const value = readCollection(node.attrs.value);
    return ['section', { 'data-nw-collection': JSON.stringify(value) }, collectionText(value)];
  },
  renderText({ node }) { return collectionText(readCollection(node.attrs.value)); },
});

export const NoteImage = Node.create({
  name: 'noteImage', group: 'block', atom: true, selectable: true,
  addAttributes() {
    return { image: { default: null, rendered: false }, width: { default: 100, rendered: false }, align: { default: 'center', rendered: false } };
  },
  parseHTML() {
    return [{ tag: 'img[src^="data:image/"]', getAttrs(element) {
      const image = localImage({ src: element.getAttribute('src'), alt: element.getAttribute('alt') });
      return image ? { image, width: number(Number(element.dataset.width || 100), 100, 25, 100),
        align: choice(element.dataset.align, ['left', 'center', 'right'], 'center') } : false;
    } }];
  },
  renderHTML({ node }) {
    const image = localImage(node.attrs.image);
    return image ? ['img', { ...image, 'data-width': node.attrs.width, 'data-align': node.attrs.align }]
      : ['span', {}, 'Imagem indisponível'];
  },
  renderText({ node }) { return localImage(node.attrs.image)?.alt ?? ''; },
});

export function moveItem<T>(items: T[], from: number, to: number) {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
  const next = [...items];
  next.splice(to, 0, ...next.splice(from, 1));
  return next;
}

export function timelineItems(timeline: Timeline) {
  return timeline.config.order === 'manual' ? timeline.items : [...timeline.items].sort((a, b) =>
    (a.date || '9999-99-99').localeCompare(b.date || '9999-99-99'));
}

export const flowSize = { width: 146, height: 72 };
export function layoutFlow(flow: Flow): FlowNode[] {
  const incoming = new Map(flow.nodes.map(({ id }) => [id, 0]));
  const outgoing = new Map<string, string[]>();
  for (const { from, to } of flow.edges) {
    incoming.set(to, (incoming.get(to) ?? 0) + 1);
    outgoing.set(from, [...(outgoing.get(from) ?? []), to]);
  }
  const queue = flow.nodes.filter(({ id }) => !incoming.get(id)).map(({ id }) => id);
  const levels = new Map(queue.map((id) => [id, 0]));
  for (let index = 0; index < queue.length; index++) {
    const id = queue[index];
    for (const target of outgoing.get(id) ?? []) {
      levels.set(target, Math.max(levels.get(target) ?? 0, levels.get(id)! + 1));
      const remaining = (incoming.get(target) ?? 0) - 1;
      incoming.set(target, remaining);
      if (!remaining) queue.push(target);
    }
  }
  const visited = new Set(queue);
  let nextLevel = Math.max(-1, ...levels.values()) + 1;
  const counts = new Map<number, number>();
  const horizontal = flow.config.orientation === 'horizontal';
  const gap = flow.config.spacing;
  return flow.nodes.map((node) => {
    const level = visited.has(node.id) ? levels.get(node.id)! : nextLevel++;
    const lane = counts.get(level) ?? 0;
    counts.set(level, lane + 1);
    return { ...node, x: 24 + (horizontal ? level : lane) * (flowSize.width + gap),
      y: 28 + (horizontal ? lane : level) * (flowSize.height + gap) };
  });
}
