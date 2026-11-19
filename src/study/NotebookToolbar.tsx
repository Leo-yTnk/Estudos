import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { KeyboardOff, List, Plus, SlidersHorizontal, Type } from 'lucide-react';
import { IconButton, Segment } from '../components/ui';
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

export interface RibbonGroup { label: string; rows: ReactNode[] }
export interface RibbonTab { id: string; label: string; groups: RibbonGroup[] }

export function RibbonGroups({ groups }: { groups: RibbonGroup[] }) {
  return <div className="note-ribbon-groups" aria-label="Ferramentas do caderno" role="group">
    {groups.map(({ label, rows }) => <div key={label} className="note-ribbon-group" role="group" aria-label={label}>
      {rows.map((row, index) => <div key={index} className="note-ribbon-row">{row}</div>)}
      <span className="note-ribbon-label" aria-hidden="true">{label}</span>
    </div>)}
  </div>;
}

export function NotebookToolbar({ simple, tabs, mobile, extra, dismissKeyboard, showInsert, clearExtra }: {
  simple: { history: ReactNode; text: ReactNode; lists: ReactNode; insert: ReactNode };
  tabs: RibbonTab[]; mobile: boolean; extra?: ReactNode; dismissKeyboard: () => void; showInsert: () => void; clearExtra: () => void;
}) {
  const [tab, setTab] = useState('home');
  const [expanded, setExpanded] = useState(false);
  const [mobileGroup, setMobileGroup] = useState<'text' | 'lists' | null>(null);
  const inset = useKeyboardInset(mobile);
  const reduced = useReducedMotion();
  const { data } = useApp();
  const { toolbarMode, reducedMotion } = data.profile;
  const advanced = toolbarMode === 'advanced';
  const animate = !reduced && !reducedMotion;
  const shownTab = tabs.find(({ id }) => id === tab) ?? tabs[0];
  useEffect(() => { setExpanded(false); setMobileGroup(null); }, [toolbarMode, mobile]);
  useEffect(() => { if (shownTab.id !== tab) setTab(shownTab.id); }, [shownTab.id, tab]);

  const advancedContent = <>
    <Segment label="Guias da toolbar" options={tabs} value={shownTab.id} onChange={(value) => { clearExtra(); setTab(value); }} />
    <RibbonGroups groups={shownTab.groups} />
  </>;
  const toggleAdvanced = () => { clearExtra(); setMobileGroup(null); setExpanded(!expanded); };
  const aa = <IconButton label="Formatação adicional" aria-expanded={expanded}
    onMouseDown={(event) => event.preventDefault()} onClick={toggleAdvanced}><strong>Aa</strong></IconButton>;

  if (!mobile) return <div className="note-ribbon">
    {advanced ? advancedContent : <>
      <div className="note-simple" role="group" aria-label="Ferramentas do caderno">
        <div className="note-ribbon-row">{simple.history}</div><div className="note-ribbon-row">{simple.text}</div>
        <div className="note-ribbon-row">{simple.lists}</div><div className="note-ribbon-row">{simple.insert}{aa}</div>
      </div>
      {expanded && <div className="note-expanded">{advancedContent}</div>}
    </>}
    {extra}
  </div>;

  return createPortal(<aside className="note-dock" aria-label="Ferramentas do caderno" data-keyboard={inset > 0}
    style={inset ? { bottom: inset + 8 } : undefined} onKeyDown={(event) => {
      if (event.key === 'Escape') { clearExtra(); setExpanded(false); setMobileGroup(null); }
    }}>
    {extra}
    <AnimatePresence initial={false}>
      {(expanded || mobileGroup) && <motion.div key={expanded ? 'advanced' : mobileGroup} className="note-expanded note-dock-bar"
        initial={animate ? { opacity: 0, y: 10 } : false} animate={{ opacity: 1, y: 0 }}
        exit={animate ? { opacity: 0, y: 5 } : undefined} transition={animate ? springs.panel : { duration: 0 }}>
        {expanded ? advancedContent : <div className="note-ribbon-row">{mobileGroup === 'text' ? simple.text : simple.lists}</div>}
      </motion.div>}
    </AnimatePresence>
    <div className="note-dock-bar note-dock-actions" role="group" aria-label="Seções da barra">
      {simple.history}
      {advanced ? <IconButton label="Guias e ferramentas avançadas" aria-expanded={expanded}
        onMouseDown={(event) => event.preventDefault()} onClick={toggleAdvanced}><SlidersHorizontal size={19} /></IconButton> : <>
        {([['text', 'Texto', Type], ['lists', 'Listas', List]] as const).map(([id, label, Icon]) =>
          <IconButton key={id} label={label} aria-expanded={mobileGroup === id} onMouseDown={(event) => event.preventDefault()}
            onClick={() => { clearExtra(); setExpanded(false); setMobileGroup(mobileGroup === id ? null : id); }}><Icon size={20} /></IconButton>)}
      </>}
      <IconButton label={advanced ? "Menu de inserção" : "Inserir"} onMouseDown={(event) => event.preventDefault()}
        onClick={() => { setMobileGroup(null); setExpanded(false); showInsert(); }}><Plus size={21} /></IconButton>
      {!advanced && aa}
      {inset > 0 && <IconButton label="Recolher teclado" onMouseDown={(event) => event.preventDefault()}
        onClick={dismissKeyboard}><KeyboardOff size={18} /></IconButton>}
    </div>
  </aside>, document.body);
}
