import { useState, type ComponentPropsWithoutRef } from 'react';
import { allowsWeight, editorFonts, findEditorFont } from '../lib/editorTypography';

const weightNames: Record<number, string> = {
  100: 'Fino', 200: 'Extra leve', 300: 'Leve', 400: 'Regular', 500: 'Médio',
  600: 'Seminegrito', 700: 'Negrito', 800: 'Extranegrito', 900: 'Preto', 1000: 'Extra preto',
};

export function FontSelect({ value, onChange, label = 'Fonte', ...props }: Omit<ComponentPropsWithoutRef<'select'>, 'value' | 'onChange'> & {
  value: string; onChange: (value: string) => void; label?: string;
}) {
  const known = editorFonts.some(({ name }) => name === value);
  return <select {...props} aria-label={label} title={label} value={value} onChange={(event) => onChange(event.target.value)}>
    <option value="">Padrão</option>
    {value && !known && <option value={value}>{value}</option>}
    {editorFonts.map(({ name }) => <option key={name} value={name}>{name}</option>)}
  </select>;
}

export function FontWeightField({ font, value, onChange, label = 'Peso da fonte' }: {
  font: NonNullable<ReturnType<typeof findEditorFont>>; value?: number; onChange: (value?: number) => void; label?: string;
}) {
  const listed = value === undefined || font.weights.includes(value);
  const [custom, setCustom] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const editing = font.range && (custom || !listed);
  const setWeight = () => {
    const weight = Number(draft ?? value);
    setInvalid(!allowsWeight(weight, font));
    if (allowsWeight(weight, font)) { onChange(weight); setCustom(false); setDraft(null); }
  };
  return <div className="note-weight-field">
    <select aria-label={label} title={label} value={editing ? 'custom' : value ?? ''} onChange={(event) => {
      const chosen = event.target.value;
      setInvalid(false);
      setCustom(chosen === 'custom');
      setDraft(null);
      if (chosen !== 'custom') onChange(chosen ? Number(chosen) : undefined);
    }}>
      <option value="">Padrão</option>
      {font.weights.map((weight) => <option key={weight} value={weight}>{weightNames[weight] ?? weight} ({weight})</option>)}
      {!font.range && !listed && <option value={value}>{value}</option>}
      {font.range && <option value="custom">Peso exato…</option>}
    </select>
    {editing && <div className="note-weight-custom">
      <input type="number" min={font.range?.[0]} max={font.range?.[1]} step={1} value={draft ?? value ?? ''}
        aria-label={label + ' exato'} aria-invalid={invalid} placeholder={font.range?.join('–')}
        onChange={(event) => { setDraft(event.target.value); setInvalid(false); }}
        onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); setWeight(); } }} />
      <button type="button" className="btn btn-secondary btn-sm" onClick={setWeight}>Aplicar</button>
      {invalid && <small role="alert">Use um peso inteiro de {font.range?.[0]} a {font.range?.[1]}.</small>}
    </div>}
  </div>;
}
