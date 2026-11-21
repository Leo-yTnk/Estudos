import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, CalendarDays, Ellipsis, House, LibraryBig, PanelLeftClose, PanelLeftOpen, Search, Settings2, Timer } from 'lucide-react';
import { areas, routeHref, type Area } from '../lib/navigation';
import { springs } from '../lib/motion';
import { useApp } from '../state/AppState';
import { IconButton, Toolbar } from './ui';

const destinations = [
  { area: 'hoje', title: 'Hoje', Icon: House },
  { area: 'planejar', title: 'Planejar', Icon: CalendarDays },
  { area: 'materias', title: 'Matérias', Icon: LibraryBig },
  { area: 'estudar', title: 'Estudar', Icon: Timer },
] as const;

type NotebookNavigation = {
  sidebarId: string; toggleId: string; pagesOpen: boolean; togglePages: () => void;
  directoryHref: string; openOptions: () => void;
};

type BrowserNavigation = EventTarget & {
  currentEntry: { index: number } | null;
  entries: () => { url: string | null }[];
};

function useHistoryControls() {
  const navigation = (window as Window & { navigation?: BrowserNavigation }).navigation;
  const available = () => {
    if (!navigation) return { back: window.history.length > 1, forward: true };
    const index = navigation.currentEntry?.index ?? -1;
    const entries = navigation.entries();
    const inWorkspace = (offset: number) => {
      const url = index >= 0 ? entries[index + offset]?.url : null;
      if (!url) return false;
      const { origin, pathname } = new URL(url);
      return origin === window.location.origin && pathname === window.location.pathname;
    };
    return { back: inWorkspace(-1), forward: inWorkspace(1) };
  };
  const [history, setHistory] = useState(available);
  useEffect(() => {
    const sync = () => setHistory(available());
    sync();
    navigation?.addEventListener('currententrychange', sync);
    window.addEventListener('hashchange', sync);
    return () => {
      navigation?.removeEventListener('currententrychange', sync);
      window.removeEventListener('hashchange', sync);
    };
  }, [navigation]);
  return history;
}

export function WorkspaceNavigation({ current, search, settings, notebook }: {
  current: Area; search: () => void; settings: () => void; notebook?: NotebookNavigation;
}) {
  const reduced = useReducedMotion();
  const { data } = useApp();
  const animate = !reduced && !data.profile.reducedMotion;
  const history = useHistoryControls();
  return <header className="workspace-header">
    <div className="workspace-header-inner">
      <Toolbar label="Histórico e páginas" className="workspace-history">
        <div className="workspace-sidebar-toggle" data-visible={!!notebook} aria-hidden={!notebook}>
          <IconButton id={notebook?.toggleId} label={notebook?.pagesOpen ? 'Recolher páginas da matéria' : 'Expandir páginas da matéria'}
            aria-expanded={notebook?.pagesOpen} aria-controls={notebook?.sidebarId} disabled={!notebook} onClick={notebook?.togglePages}>
            {notebook?.pagesOpen ? <PanelLeftClose size={19} /> : <PanelLeftOpen size={19} />}
          </IconButton>
        </div>
        <IconButton label={!history.back && notebook ? 'Voltar para páginas' : 'Voltar'} disabled={!history.back && !notebook}
          onClick={() => {
            if (history.back) window.history.back();
            else if (notebook) window.location.hash = notebook.directoryHref;
          }}><ArrowLeft size={18} /></IconButton>
        <IconButton label="Avançar" disabled={!history.forward} onClick={() => window.history.forward()}><ArrowRight size={18} /></IconButton>
      </Toolbar>
      <nav className="workspace-primary" aria-label="Navegação principal">
        {destinations.map(({ area, title, Icon }) => <a key={area} href={routeHref(areas[area])} aria-current={current === area ? 'page' : undefined}>
          {current === area && <motion.span className="workspace-current" aria-hidden="true" layoutId={animate ? 'workspace-current' : undefined}
            transition={springs.panel} />}
          <Icon size={18} aria-hidden="true" /><span>{title}</span>
        </a>)}
      </nav>
      <Toolbar label="Atalhos do NowWork" className="workspace-actions">
        <IconButton label="Buscar no NowWork" aria-haspopup="dialog" aria-keyshortcuts="Control+K Meta+K" onClick={search}><Search size={19} /></IconButton>
        <IconButton label="Configurações" aria-haspopup="dialog" onClick={settings}><Settings2 size={19} /></IconButton>
        {notebook && <IconButton label="Opções da página" aria-haspopup="dialog" onClick={notebook.openOptions}><Ellipsis size={21} /></IconButton>}
      </Toolbar>
    </div>
  </header>;
}

export function SectionNavigation({ label, links }: { label: string; links: readonly { label: string; href: string; active: boolean }[] }) {
  const reduced = useReducedMotion();
  const { data } = useApp();
  const animate = !reduced && !data.profile.reducedMotion;
  return <nav className="workspace-sections" aria-label={label}>
    {links.map(({ label, href, active }) => <a key={href} href={href} aria-current={active ? 'page' : undefined}>
      {label}{active && <motion.span aria-hidden="true" className="workspace-section-indicator" layoutId={animate ? 'workspace-section' : undefined}
        transition={springs.panel} />}
    </a>)}
  </nav>;
}
