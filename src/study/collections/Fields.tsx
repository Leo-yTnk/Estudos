import { useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { ElasticSheet } from '../../components/ElasticSheet';
import { Button, IconButton, Toolbar } from '../../components/ui';
import { importLocalImage } from '../../lib/localImages';
import type { LocalImage } from '../../lib/collections';

export function CollectionSheet({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  return createPortal(<ElasticSheet title={title} onClose={close}><div className="collection-form">{children}</div></ElasticSheet>, document.body);
}

export function Options<T extends string | number>({ label, value, options, onChange }: {
  label: string; value: T; options: readonly (readonly [T, string])[]; onChange: (value: T) => void;
}) {
  return <label className="field-label">{label}<select aria-label={label} className="ds-input" value={value} onChange={(event) => {
    const option = options.find(([key]) => String(key) === event.target.value);
    if (option) onChange(option[0]);
  }}>{options.map(([key, name]) => <option value={key} key={key}>{name}</option>)}</select></label>;
}

export const orientations = [['vertical', 'Vertical'], ['horizontal', 'Horizontal']] as const;

export function Range({ label, value, min, max, unit, onChange }: {
  label: string; value: number; min: number; max: number; unit: string; onChange: (value: number) => void;
}) {
  return <label className="field-label">{label} <output>{value}{unit}</output>
    <input aria-label={label} type="range" min={min} max={max} value={value} onChange={(event) => onChange(event.target.valueAsNumber)} />
  </label>;
}

export function MoveControls({ subject, index, count, move }: {
  subject: string; index: number; count: number; move: (index: number) => void;
}) {
  return <Toolbar label={'Ordem de ' + subject}>
    <IconButton label={'Antecipar ' + subject} disabled={index <= 0} onClick={() => move(index - 1)}><ArrowUp size={16} /></IconButton>
    <IconButton label={'Adiar ' + subject} disabled={index >= count - 1} onClick={() => move(index + 1)}><ArrowDown size={16} /></IconButton>
  </Toolbar>;
}

export function ImageField({ image, change }: { image: LocalImage | null; change: (value: LocalImage | null) => void }) {
  const [error, setError] = useState('');
  const [waiting, setWaiting] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  return <>
    <Toolbar>
      <Button size="sm" disabled={waiting} onClick={() => input.current?.click()}>{waiting ? 'Preparando imagem…' : image ? 'Trocar imagem' : 'Escolher imagem'}</Button>
      {image && <Button size="sm" disabled={waiting} onClick={() => change(null)}>Remover imagem</Button>}
    </Toolbar>
    <input ref={input} aria-label="Arquivo de imagem" hidden type="file" accept="image/*" onChange={async (event) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;
      setWaiting(true);
      setError('');
      try { change(await importLocalImage(file)); }
      catch (error) { setError(error instanceof Error ? error.message : 'Não foi possível abrir a imagem.'); }
      finally { setWaiting(false); }
    }} />
    {error && <small role="alert">{error}</small>}
    {image && <label className="field-label">Descrição alternativa<input className="ds-input" maxLength={250} value={image.alt}
      onChange={(event) => change({ ...image, alt: event.target.value })} /></label>}
  </>;
}
