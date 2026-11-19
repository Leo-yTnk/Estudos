import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { KeyboardOff } from 'lucide-react';
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

function useKeyboardInset(enabled: boolean) {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!enabled || !viewport) return;
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
  }, [enabled]);
  return inset;
}

export interface RibbonGroup {
  label: string;
  short: ReactNode;
  rows: [ReactNode, ReactNode];
}

export function NotebookToolbar({ groups, mobile, extra, dismissKeyboard }: {
  groups: RibbonGroup[]; mobile: boolean; extra?: ReactNode; dismissKeyboard: () => void;
}) {
  const [active, setActive] = useState(1);
  const inset = useKeyboardInset(mobile);
  const reduced = useReducedMotion();
  const { data } = useApp();
  const animate = !reduced && !data.profile.reducedMotion;

  if (!mobile) return <div className="note-ribbon">
    <div className="note-ribbon-groups" aria-label="Ferramentas do caderno" role="group">
      {groups.map(({ label, rows }) => <div key={label} className="note-ribbon-group" role="group" aria-label={label}>
        {rows.map((row, index) => <div key={index} className="note-ribbon-row">{row}</div>)}
        <span className="note-ribbon-label" aria-hidden="true">{label}</span>
      </div>)}
    </div>
    {extra}
  </div>;

  return createPortal(<aside className="note-dock" aria-label="Ferramentas do caderno" data-keyboard={inset > 0}
    style={inset ? { bottom: inset + 8 } : undefined}>
    {extra}
    <div className="note-dock-bar">
      <div className="note-dock-sections" role="group" aria-label="Seções da barra">
        {groups.map(({ label, short }, index) => <button key={label} type="button" aria-label={label}
          title={label} aria-pressed={active === index} onMouseDown={(event) => event.preventDefault()}
          onClick={() => setActive(index)}>{active === index && <motion.span layoutId={animate ? 'ribbon-active' : undefined}
            transition={animate ? springs.panel : { duration: 0 }} className="note-mobile-active" aria-hidden="true" />}{short}</button>)}
        {inset > 0 && <IconButton label="Recolher teclado" onMouseDown={(event) => event.preventDefault()}
          onClick={dismissKeyboard}><KeyboardOff size={17} /></IconButton>}
      </div>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div key={active} role="group" aria-label={groups[active].label} className="note-mobile-group"
          initial={animate ? { opacity: 0, x: 5 } : false} animate={{ opacity: 1, x: 0 }}
          exit={animate ? { opacity: 0, transition: { duration: .1 } } : undefined} transition={animate ? springs.panel : { duration: 0 }}>
          {groups[active].rows.map((row, index) => <div key={index} className="note-ribbon-row">{row}</div>)}
        </motion.div>
      </AnimatePresence>
    </div>
  </aside>, document.body);
}
