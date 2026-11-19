import { useRef, useState } from 'react';

export function NumberSlider({ label, value, min, max, stops, vertical, describe, onChange }: {
  label: string; value: number; min: number; max: number; stops?: readonly number[]; vertical?: boolean;
  describe?: (value: number) => string; onChange: (value: number) => void;
}) {
  const number = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const valid = (raw: string) => {
    const next = Number(raw);
    return !!raw && Number.isInteger(next) && next >= min && next <= max && (!stops || stops.includes(next));
  };
  const commit = () => {
    if (draft === null) return;
    if (valid(draft)) {
      setDraft(null);
      setInvalid(false);
    } else setInvalid(true);
  };
  const index = stops ? stops.reduce((best, stop, i) => Math.abs(stop - value) < Math.abs(stops[best] - value) ? i : best, 0) : value;
  return <div className="ds-number-slider" data-orientation={vertical ? 'vertical' : 'horizontal'}>
    <label className="field-label">{label}
      <input ref={number} type="number" className="ds-input ds-number-slider-value" min={min} max={max} step={1} required
        aria-invalid={invalid || undefined} value={draft ?? value}
        onChange={(event) => {
          const raw = event.target.value;
          const accepted = valid(raw);
          event.target.setCustomValidity(accepted ? '' : 'Informe um valor disponível.');
          setDraft(raw);
          setInvalid(false);
          if (accepted) onChange(Number(raw));
        }}
        onBlur={commit} onKeyDown={(event) => {
          if (event.key === 'Enter') { event.preventDefault(); commit(); }
        }} />
    </label>
    <input type="range" aria-label={label + ' — slider'} aria-orientation={vertical ? 'vertical' : 'horizontal'}
      aria-valuetext={describe?.(value) ?? String(value)} min={stops ? 0 : min} max={stops ? stops.length - 1 : max} step={1} value={index}
      onChange={(event) => {
        const position = event.target.valueAsNumber;
        number.current?.setCustomValidity('');
        setDraft(null);
        setInvalid(false);
        onChange(stops ? stops[position] : position);
      }} />
    {invalid && <small role="alert">{stops ? 'Pesos disponíveis: ' + stops.join(', ') + '.' : 'Use um número inteiro de ' + min + ' a ' + max + '.'}</small>}
  </div>;
}
