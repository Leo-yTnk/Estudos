import { motion, useReducedMotion } from 'motion/react';
import { CalendarDays, House, LibraryBig, Search, Settings2, Timer } from 'lucide-react';
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

export function WorkspaceNavigation({ current, search, settings }: {
  current: Area; search: () => void; settings: () => void;
}) {
  const reduced = useReducedMotion();
  const { data } = useApp();
  const animate = !reduced && !data.profile.reducedMotion;
  return <header className="workspace-header">
    <div className="workspace-header-inner">
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
