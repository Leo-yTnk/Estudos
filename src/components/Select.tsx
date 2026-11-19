import { useRef } from 'react';
import * as Primitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';

type SelectOption<T extends string | number> = readonly [value: T, label: string];

export function Select<T extends string | number>({ label, value, options, onChange, displayValue, returnFocus = true }: {
  label: string; value: T; options: readonly SelectOption<T>[];
  onChange: (value: T) => void; displayValue?: string; returnFocus?: boolean;
}) {
  const selected = useRef(false);
  return <Primitive.Root value={String(value) || 'ds-empty'} onValueChange={(raw) => {
    const option = options.find(([key]) => (String(key) || 'ds-empty') === raw);
    if (option) {
      selected.current = true;
      onChange(option[0]);
    }
  }} onOpenChange={(open) => { if (open) selected.current = false; }}>
    <Primitive.Trigger className="ds-select" aria-label={label} title={label}>
      <Primitive.Value>{displayValue}</Primitive.Value><Primitive.Icon asChild><ChevronDown size={13} aria-hidden="true" /></Primitive.Icon>
    </Primitive.Trigger>
    <Primitive.Portal>
      <Primitive.Content className="ds-select-content" position="popper" align="start" sideOffset={6} collisionPadding={8}
        onCloseAutoFocus={(event) => { if (!returnFocus && selected.current) event.preventDefault(); }}>
        <Primitive.Viewport className="ds-select-options">
          {options.map(([key, name]) => <Primitive.Item key={key} value={String(key) || 'ds-empty'} className="ds-select-option">
            <Primitive.ItemText>{name}</Primitive.ItemText>
            <Primitive.ItemIndicator><Check size={15} aria-hidden="true" /></Primitive.ItemIndicator>
          </Primitive.Item>)}
        </Primitive.Viewport>
      </Primitive.Content>
    </Primitive.Portal>
  </Primitive.Root>;
}
