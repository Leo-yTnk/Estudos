import { Brain, CalendarDays, ChartNoAxesCombined, Ellipsis, LayoutDashboard, LibraryBig, ListTodo, Settings2, Sparkles, Timer } from 'lucide-react';
import { Button, NavButton } from './ui';

export const primaryPages = [
  { id: 'home', title: 'Visão geral', mobile: 'Início', Icon: LayoutDashboard },
  { id: 'subjects', title: 'Matérias', mobile: 'Matérias', Icon: LibraryBig },
  { id: 'tasks', title: 'Tarefas', mobile: 'Tarefas', Icon: ListTodo },
  { id: 'calendar', title: 'Agenda', mobile: 'Agenda', Icon: CalendarDays },
] as const;
export const utilityPages = [
  { id: 'focus', title: 'Foco', Icon: Timer },
  { id: 'evolution', title: 'Evolução', Icon: ChartNoAxesCombined },
  { id: 'mind', title: 'Capturas', Icon: Brain },
] as const;
export const workspacePages = [...primaryPages, ...utilityPages];
export type WorkspacePage = typeof workspacePages[number]['id'];

type NavigationProps = { current: WorkspacePage; open: (page: WorkspacePage) => void; settings: () => void };

export function WorkspaceLogo({ onClick, mobile = false }: { onClick: () => void; mobile?: boolean }) {
  return <button type="button" className={'nw-logo ' + (mobile ? 'nw-mobile-logo' : '')} onClick={onClick}>
    <span className="nw-logo-icon"><Sparkles size={18} /></span>NowWork
  </button>;
}

export function WorkspaceSidebar({ current, open, settings }: NavigationProps) {
  return <aside className="nw-sidebar">
    <WorkspaceLogo onClick={() => open('home')} />
    <nav className="ds-navigation" aria-label="Navegação principal">
      <span className="ds-nav-heading">Espaço de estudos</span>
      {primaryPages.map(({ id, title, Icon }) => <NavButton key={id} active={current === id} animation="workspace-navigation"
        icon={<Icon size={18} />} onClick={() => open(id)}>{title}</NavButton>)}
    </nav>
    <nav className="ds-navigation ds-nav-secondary" aria-label="Ferramentas">
      <span className="ds-nav-heading">Ferramentas</span>
      {utilityPages.map(({ id, title, Icon }) => <NavButton key={id} active={current === id} animation="workspace-navigation"
        icon={<Icon size={17} />} onClick={() => open(id)}>{title}</NavButton>)}
    </nav>
    <NavButton className="ds-nav-settings" icon={<Settings2 size={17} />} onClick={settings}>Configurações</NavButton>
  </aside>;
}

export function MobileNavigation({ current, open, more }: Omit<NavigationProps, 'settings'> & { more: () => void }) {
  return <nav className="nw-mobile-nav" aria-label="Navegação móvel">
    {primaryPages.map(({ id, mobile, Icon }) => <NavButton key={id} active={current === id} animation="mobile-navigation"
      icon={<Icon size={19} />} onClick={() => open(id)}>{mobile}</NavButton>)}
    <NavButton active={utilityPages.some(({ id }) => id === current)} animation="mobile-navigation" icon={<Ellipsis size={19} />}
      onClick={more}>Mais</NavButton>
  </nav>;
}

export function WorkspaceTools({ open, settings }: Pick<NavigationProps, 'open' | 'settings'>) {
  return <div className="ds-navigation nw-tool-menu">{utilityPages.map(({ id, title, Icon }) =>
    <Button key={id} variant="ghost" icon={<Icon size={18} />} onClick={() => open(id)}>{title}</Button>)}
    <Button variant="ghost" icon={<Settings2 size={18} />} onClick={settings}>Configurações</Button>
  </div>;
}
