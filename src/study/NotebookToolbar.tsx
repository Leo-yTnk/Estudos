import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { KeyboardOff, ListTree, Plus, Type, X } from 'lucide-react';
import { IconButton } from '../components/ui';
import { springs } from '../lib/motion';
import { useApp } from '../state/AppState';

export interface EditorAction {
  label: string;
  icon: ReactNode;
  pressed?: boolean;
  disabled?: boolean;
  run: () => void;
}

export function EditorActionButton({ action }: { action: EditorAction }) {
  return <IconButton label={action.label} aria-pressed={action.pressed} disabled={action.disabled}
    onMouseDown={(event) => event.preventDefault()} onClick={action.run}>{action.icon}</IconButton>;
}

const mobileQuery = '(max-width: 800px)';

export function useMobileEditor() {
  const [mobile, setMobile] = useState(() => window.matchMedia(mobileQuery).matches);
  useEffect(() => {
    const query = window.matchMedia(mobileQuery);
    const sync = () => setMobile(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);
  return mobile;
}

function useKeyboardInset() {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => {
      const gap = window.innerHeight - viewport.height - viewport.offsetTop;
      setInset(Math.abs(viewport.scale - 1) < .05 && gap > 85 ? Math.round(gap) : 0);
    };
    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);
  return inset;
}

const sections = [
  { id: 'insert', label: 'Inserir', Icon: Plus },
  { id: 'text', label: 'Texto', Icon: Type },
  { id: 'organize', label: 'Organizar', Icon: ListTree },
] as const;

type Section = typeof sections[number]['id'];

export function NotebookToolbar({ actions, selected, advanced, linkForm, dismissKeyboard }: {
  actions: Record<Section, EditorAction[]>;
  selected: boolean;
  advanced: ReactNode;
  linkForm?: ReactNode;
  dismissKeyboard: () => void;
}) {
  const [section, setSection] = useState<Section | null>(null);
  const [formatting, setFormatting] = useState(false);
  const active = section ?? (selected ? 'text' : 'insert');
  const inset = useKeyboardInset();
  const systemReduced = useReducedMotion();
  const { data } = useApp();
  const reduce = !!systemReduced || data.profile.reducedMotion;
  const close = () => setFormatting(false);
  useEffect(() => {
    if (!formatting) return;
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') close(); };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [formatting]);

  return createPortal(<aside className="note-dock" aria-label="Ferramentas do caderno" data-keyboard={inset > 0}
    style={inset ? { bottom: inset + 8, '--note-available': `${Math.max(120, (window.visualViewport?.height ?? 380) - 140)}px` } as React.CSSProperties : undefined}>
    <AnimatePresence initial={false}>
      {formatting && !linkForm && <motion.section key="format" id="note-format-panel" aria-label="Formatação avançada" className="note-dock-panel"
        initial={reduce ? false : { opacity: 0, y: 9 }} animate={{ opacity: 1, y: 0 }} exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: 5 }}
        transition={reduce ? { duration: 0 } : springs.panel}>
        <div className="note-panel-title"><strong>Formatação</strong><IconButton label="Fechar formatação" onMouseDown={(event) => event.preventDefault()} onClick={close}><X size={19} /></IconButton></div>
        {advanced}
      </motion.section>}
    </AnimatePresence>
    {linkForm}
    <div className="note-dock-bar">
      <div className={'note-dock-sections' + (inset > 0 ? ' with-keyboard' : '')} role="group" aria-label="Seções da barra">
        {sections.map(({ id, label, Icon }) => <button key={id} type="button" aria-pressed={active === id && !formatting}
          onMouseDown={(event) => event.preventDefault()} onClick={() => { setSection(id); close(); }}>
          <Icon size={15} aria-hidden="true" />{label}
        </button>)}
        <button type="button" className="note-aa" aria-label="Formatação avançada" aria-expanded={formatting && !linkForm}
          aria-controls={formatting && !linkForm ? 'note-format-panel' : undefined}
          disabled={!!linkForm} onMouseDown={(event) => event.preventDefault()} onClick={() => setFormatting((open) => !open)}>Aa</button>
        {inset > 0 && <IconButton label="Recolher teclado" onMouseDown={(event) => event.preventDefault()}
          onClick={dismissKeyboard}><KeyboardOff size={19} /></IconButton>}
      </div>
      <div className="note-dock-actions" role="group" aria-label={sections.find((item) => item.id === active)?.label}>
        {actions[active].map((action) => <EditorActionButton key={action.label} action={action}/>)}
      </div>
    </div>
  </aside>, document.body);
}
