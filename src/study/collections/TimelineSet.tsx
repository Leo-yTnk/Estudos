import { useState, type FormEvent } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button, IconButton, Toolbar } from '../../components/ui';
import { moveItem, newEvent, timelineItems, type Timeline, type TimelineEvent } from '../../lib/collections';
import { CollectionSheet, MoveControls, Options, orientations } from './Fields';

const dateFormats = {
  short: new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'UTC' }),
  long: new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeZone: 'UTC' }),
  year: new Intl.DateTimeFormat('pt-BR', { year: 'numeric', timeZone: 'UTC' }),
};

function EventDates({ event, format }: { event: TimelineEvent; format: Timeline['config']['dates'] }) {
  if (!event.date || format === 'hidden') return null;
  const formatter = dateFormats[format];
  return <span className="timeline-date"><time dateTime={event.date}>{formatter.format(new Date(event.date))}</time>
    {event.end && <> – <time dateTime={event.end}>{formatter.format(new Date(event.end))}</time></>}</span>;
}

export function TimelineConfig({ value, change }: { value: Timeline; change: (value: Timeline) => void }) {
  const config = value.config;
  const set = (patch: Partial<Timeline['config']>) => change({ ...value,
    items: patch.order === 'manual' && config.order === 'date' ? timelineItems(value) : value.items,
    config: { ...config, ...patch },
  });
  return <>
    <Options label="Orientação" value={config.orientation} options={orientations} onChange={(orientation) => set({ orientation })} />
    <Options label="Ordem dos eventos" value={config.order} options={[['date', 'Cronológica'], ['manual', 'Manual']]} onChange={(order) => set({ order })} />
    <Options label="Formato do marco" value={config.marker} options={[['circle', 'Círculo'], ['diamond', 'Losango'], ['square', 'Quadrado']]}
      onChange={(marker) => set({ marker })} />
    <Options label="Apresentação das datas" value={config.dates} options={[['short', 'Abreviada'], ['long', 'Por extenso'], ['year', 'Somente ano'], ['hidden', 'Ocultar']]}
      onChange={(dates) => set({ dates })} />
    <section className="collection-preview" aria-label="Prévia da linha do tempo"><strong>Prévia</strong><TimelineList value={value} /></section>
  </>;
}

function TimelineList({ value, edit }: { value: Timeline; edit?: (event: TimelineEvent) => void }) {
  const items = timelineItems(value);
  if (!items.length) return <span className="nw-muted">Nenhum evento</span>;
  return <ol className="collection-timeline" data-direction={value.config.orientation} data-marker={value.config.marker}>
    {items.map((event) => <li key={event.id}><div className="timeline-event-body">
      <EventDates event={event} format={value.config.dates} />
      <strong>{event.title}</strong>
      {event.description && <div className="collection-copy">{event.description}</div>}
    </div>{edit && <IconButton label={'Editar evento ' + event.title} onClick={() => edit(event)}><Pencil size={16} /></IconButton>}</li>)}
  </ol>;
}

export function TimelineSet({ value, change }: { value: Timeline; change: (value: Timeline) => void }) {
  const [draft, setDraft] = useState<TimelineEvent | null>(null);
  const index = value.items.findIndex(({ id }) => id === draft?.id);
  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!draft?.title.trim()) return;
    const item = { ...draft, title: draft.title.trim() };
    change({ ...value, items: index < 0 ? [...value.items, item] : value.items.map((old) => old.id === draft.id ? item : old) });
    setDraft(null);
  };
  return <>
    <TimelineList value={value} edit={setDraft} />
    <Button size="sm" variant="ghost" icon={<Plus size={16} />} onClick={() => setDraft(newEvent())}>Adicionar evento</Button>
    {draft && <CollectionSheet title={index < 0 ? 'Adicionar evento' : 'Editar evento'} close={() => setDraft(null)}>
      <form className="collection-form" onSubmit={save}>
        <label className="field-label">Título<input className="ds-input" required maxLength={160} value={draft.title}
          onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
        <div className="collection-field-row">
          <label className="field-label">Data inicial<input className="ds-input" type="date" required max="9999-12-31" min="0001-01-01"
            value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} /></label>
          <label className="field-label">Data final (opcional)<input className="ds-input" type="date" max="9999-12-31" min={draft.date || '0001-01-01'}
            value={draft.end} onChange={(event) => setDraft({ ...draft, end: event.target.value })} /></label>
        </div>
        <label className="field-label">Descrição<textarea className="ds-input" maxLength={4000} value={draft.description}
          onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
        {index >= 0 && value.config.order === 'manual' && <MoveControls subject="evento" index={index} count={value.items.length}
          move={(target) => change({ ...value, items: moveItem(value.items, index, target) })} />}
        <Toolbar>
          <Button size="sm" variant="primary" type="submit">Salvar evento</Button>
          {index >= 0 && <Button size="sm" variant="danger" icon={<Trash2 size={16} />} onClick={() => {
            change({ ...value, items: value.items.filter(({ id }) => id !== draft.id) });
            setDraft(null);
          }}>Excluir evento</Button>}
        </Toolbar>
      </form>
    </CollectionSheet>}
  </>;
}
