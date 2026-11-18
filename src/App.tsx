import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Brain, CalendarDays, ChartNoAxesCombined, Check, CircleHelp, Coffee, Download, LayoutDashboard, ListTodo, Pencil, Plus, Search, Settings2, ShieldCheck, Sparkles, Timer, Trash2, Upload, X } from 'lucide-react';
import { AppProvider, useApp } from './state/AppState';
import { ElasticSheet } from './components/ElasticSheet';
import { Button } from './components/ui';
import { Agora } from './tabs/Agora';
import { Mente } from './tabs/Mente';
import { Evolucao } from './tabs/Evolucao';
import { validateData } from './lib/storage';
import { springs } from './lib/motion';
import type { Subject, Theme } from './types';
import { Dashboard, SubjectMark } from './study/Dashboard';
import { Tasks, Week } from './study/Planner';
import { Notebook } from './study/Notebook';
import { Review } from './study/Review';
import { WorkspaceSearch, TaskForm, SubjectForm } from './study/WorkspacePanels';

const pages = [
  { id: 'home', title: 'Visão geral', icon: LayoutDashboard },
  { id: 'tasks', title: 'Tarefas', icon: ListTodo },
  { id: 'calendar', title: 'Agenda', icon: CalendarDays },
  { id: 'focus', title: 'Foco', icon: Timer },
  { id: 'evolution', title: 'Evolução', icon: ChartNoAxesCombined },
  { id: 'mind', title: 'Capturas', icon: Brain },
] as const;
type SubjectTab = 'tasks' | 'notes' | 'review';
type Page = { id: typeof pages[number]['id']; entryId?: string } | { id: 'subject'; subjectId: string; tab: SubjectTab; noteId?: string };
type Sheet = { kind: 'settings' | 'break' | 'search' } | { kind: 'task'; subjectId?: string; dueAt?: string | null } | { kind: 'subject'; subject?: Subject };


function Settings() {
  const app = useApp();
  const { data } = app;
  const input = useRef<HTMLInputElement>(null);
  const download = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'nowwork-backup-' + new Date().toISOString().slice(0,10) + '.json';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    app.notify('Backup JSON exportado.');
  };
  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      if (file.size > 8_000_000) throw new Error('Arquivo muito grande.');
      const content = JSON.parse(await file.text());
      const restored = validateData(content);
      if (window.confirm('Importar este backup substituirá todos os registros locais. Continuar?')) app.restore(restored);
    } catch (error) {
      app.notify(error instanceof Error ? error.message : 'Não foi possível importar o arquivo.');
    }
  };
  const demoCount = data.entries.filter((entry) => entry.source === 'demo').length;
  return <div className="settings-content">
    <div className="settings-group"><div className="settings-group-title">Personalização</div>
      <label className="field-label">Seu nome <span className="subtle">(opcional)</span>
        <input maxLength={50} placeholder="Como quer ser chamado?" value={data.profile.name}
          onChange={(e) => app.updateProfile({name:e.target.value})}/></label>
      <div className="settings-label">Aparência</div>
      <div className="settings-options">{([['system','Automático'],['light','Claro'],['dark','Escuro']] as [Theme,string][]).map(([value,label]) =>
        <button type="button" key={value} className={'setting-option ' + (data.profile.theme === value ? 'active' : '')}
          aria-pressed={data.profile.theme === value} onClick={() => app.updateProfile({theme:value})}>
          {label}{data.profile.theme === value && <Check size={15}/>}</button>)}</div>
      <label className="toggle-row"><span><strong>Reduzir movimento</strong><small>Desativa molas e movimentos não essenciais; a preferência do dispositivo também é respeitada.</small></span>
        <input type="checkbox" checked={data.profile.reducedMotion} onChange={(e) => app.updateProfile({reducedMotion:e.target.checked})}/></label>
    </div>
    <div className="settings-group"><div className="settings-group-title">Seus dados</div>
      <p className="settings-description"><ShieldCheck size={17}/> Suas informações ficam neste navegador. Nenhum cadastro ou servidor é necessário.</p>
      <div className="settings-buttons"><Button icon={<Download size={16}/>} onClick={download}>Exportar backup</Button>
        <Button icon={<Upload size={16}/>} onClick={() => input.current?.click()}>Importar JSON</Button>
        <input className="visually-hidden" aria-label="Selecionar backup JSON" type="file" accept=".json,application/json" ref={input} onChange={importFile}/></div>
    </div>
    <div className="settings-group"><div className="settings-group-title">Demonstração</div>
      <p className="settings-description">Exemplos opcionais e claramente identificados. Não substituem seus registros reais.</p>
      <div className="settings-buttons"><Button icon={<Sparkles size={16}/>} onClick={app.addDemo}>Carregar exemplos</Button>
        {demoCount > 0 && <Button icon={<X size={16}/>} onClick={app.removeDemo}>Remover {demoCount} exemplos</Button>}</div>
    </div>
    <div className="settings-group danger-zone"><div className="settings-group-title">Recomeçar</div>
      <p className="settings-description">Apaga os dados deste aplicativo no navegador. Exporte um backup se quiser guardá-los.</p>
      <Button variant="danger" icon={<Trash2 size={16}/>} onClick={() => {
        if (window.confirm('Apagar todas as matérias, páginas, cartões, registros e preferências? Esta ação não pode ser desfeita.')) app.clearAll();
      }}>Apagar todos os dados</Button>
    </div>
    <p className="settings-version">NowWork · Código aberto sob licença MIT</p>
  </div>;
}

function AppContent() {
  const app = useApp();
  const [page, setPage] = useState<Page>({ id: 'home' });
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const systemReduced = useReducedMotion();
  const reduce = !!systemReduced || app.data.profile.reducedMotion;
  const subject = page.id === 'subject' ? app.data.subjects.find(({ id }) => id === page.subjectId) : undefined;
  const subjectPage = (id: string, tab: SubjectTab = 'tasks', noteId?: string) => setPage({ id: 'subject', subjectId: id, tab, noteId });
  const newTask = (dueAt?: string | null) => setSheet({ kind: 'task', subjectId: subject?.id, dueAt });
  const openTask = (id: string) => {
    const entry = app.data.entries.find((item) => item.id === id);
    setPage({ id: entry?.kind === 'idea' || entry?.kind === 'worry' ? 'mind' : 'tasks', entryId: id });
  };
  const close = () => setSheet(null);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && (!sheet || sheet.kind === 'search')) {
        event.preventDefault();
        setSheet(sheet ? null : { kind: 'search' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sheet]);
  if (!app.ready) return <div className="loading-shell"><div className="nw-logo"><span className="nw-logo-icon"><Sparkles size={18} /></span>NowWork</div><p>Preparando seu espaço…</p></div>;
  const section = page.id === 'subject' ? subject?.title || 'Matérias' : pages.find(({ id }) => id === page.id)?.title;
  const title = page.id === 'home' ? 'Estudos' : section;
  const descriptions = {
    tasks: 'Organize entregas, exercícios e compromissos.',
    calendar: 'Veja os prazos e planeje uma semana de cada vez.',
  };
  const sheetTitles = { settings: 'Configurações', break: 'Uma pausa para respirar', search: 'Buscar no NowWork', task: 'Novo registro', subject: sheet?.kind === 'subject' && sheet.subject ? 'Editar matéria' : 'Nova matéria' };
  return <div className="nw-shell">
    <aside className="nw-sidebar">
      <button type="button" className="nw-logo" onClick={() => setPage({ id: 'home' })}><span className="nw-logo-icon"><Sparkles size={19} /></span>NowWork</button>
      <nav className="nw-navigation" aria-label="Navegação principal">{pages.map(({ id, title, icon: Icon }) =>
        <button key={id} type="button" aria-current={page.id === id ? 'page' : undefined} onClick={() => setPage({ id })}>
          {page.id === id && <motion.span className="nw-nav-active" layoutId="sidebar-active" transition={reduce ? { duration: 0 } : springs.panel} />}
          <Icon size={18} /><span>{title}</span>
        </button>)}</nav>
      <div className="nw-side-subjects">
        <div className="nw-side-label"><span>Matérias</span><button type="button" className="nw-icon" aria-label="Adicionar matéria" onClick={() => setSheet({ kind: 'subject' })}><Plus size={17} /></button></div>
        <nav className="nw-navigation" aria-label="Matérias">{app.data.subjects.map((item) =>
          <button key={item.id} type="button" aria-current={subject?.id === item.id ? 'page' : undefined} onClick={() => subjectPage(item.id)}>
            {subject?.id === item.id && <motion.span className="nw-nav-active" layoutId="sidebar-active" transition={reduce ? { duration: 0 } : springs.panel} />}
            <i className={'nw-subject-dot tone-' + item.color} /><span>{item.title}</span>
          </button>)}</nav>
      </div>
      <button type="button" className="nw-settings" onClick={() => setSheet({ kind: 'settings' })}><Settings2 size={18} /> Configurações</button>
    </aside>
    <div className="nw-content">
      <header className="nw-header">
        <div className="nw-breadcrumb"><span>Meu espaço</span><span aria-hidden="true">/</span><strong>{title}</strong></div>
        <button type="button" className="nw-logo nw-mobile-logo" onClick={() => setPage({ id: 'home' })}><span className="nw-logo-icon"><Sparkles size={16} /></span>NowWork</button>
        <div className="nw-toolbar">
          <button type="button" className="nw-search" aria-label="Buscar" onClick={() => setSheet({ kind: 'search' })}><Search size={16} /><span>Buscar</span><kbd>Ctrl K</kbd></button>
          <button type="button" className="nw-icon nw-mobile-settings" aria-label="Configurações" onClick={() => setSheet({ kind: 'settings' })}><Settings2 size={19} /></button>
          <Button aria-label="Novo registro" className="nw-new" variant="primary" icon={<Plus size={17} />} onClick={() => newTask()}>Novo<span className="nw-new-extra"> registro</span></Button>
        </div>
      </header>
      <main className="nw-main" id="main-content">
        <motion.div key={page.id === 'subject' ? page.subjectId : page.id} initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          transition={reduce ? { duration: 0 } : { duration: .2 }}>
          {(page.id === 'home' || (page.id === 'subject' && !subject)) && <Dashboard subject={subjectPage} newSubject={() => setSheet({ kind: 'subject' })}
            tasks={() => setPage({ id: 'tasks' })} focus={() => setPage({ id: 'focus' })} add={newTask} openTask={openTask} />}
          {(page.id === 'tasks' || page.id === 'calendar') && <div className="nw-stack">
            <div className="nw-page-title"><h1>{section}</h1><p>{descriptions[page.id]}</p></div>
            {page.id === 'tasks' ? <Tasks key={page.entryId || 'all'} onlyId={page.entryId} onAdd={() => newTask()} /> : <Week onAdd={newTask} />}
          </div>}
          {page.id === 'subject' && subject && <div className="nw-stack">
            <div className="nw-subject-title"><SubjectMark subject={subject} /><div className="nw-page-title"><h1>{subject.title}</h1></div>
              <button type="button" className="nw-icon" aria-label="Editar matéria" onClick={() => setSheet({ kind: 'subject', subject })}><Pencil size={18} /></button></div>
            <div className="nw-segment nw-subject-tabs" aria-label="Ferramentas da matéria">
              {([['tasks', 'Tarefas'], ['notes', 'Caderno'], ['review', 'Revisão']] as const).map(([id, label]) =>
                <button key={id} type="button" aria-pressed={page.tab === id} onClick={() => subjectPage(subject.id, id)}>{label}</button>)}
            </div>
            {page.tab === 'tasks' && <Tasks key={subject.id} subjectId={subject.id} onAdd={() => newTask()} />}
            {page.tab === 'notes' && <Notebook key={subject.id} subjectId={subject.id} noteId={page.noteId} open={(id) => subjectPage(subject.id, 'notes', id)} />}
            {page.tab === 'review' && <Review key={subject.id} subjectId={subject.id} />}
          </div>}
          {page.id === 'focus' && <Agora onMind={() => setPage({ id: 'mind' })} onBreak={() => setSheet({ kind: 'break' })} />}
          {page.id === 'mind' && <Mente key={page.entryId || 'all'} selectedId={page.entryId} />}
          {page.id === 'evolution' && <Evolucao />}
        </motion.div>
      </main>
    </div>
    <nav className="nw-mobile-nav" aria-label="Navegação móvel">{pages.map(({ id, title, icon: Icon }) =>
      <button key={id} type="button" aria-current={page.id === id || (page.id === 'subject' && id === 'home') ? 'page' : undefined}
        onClick={() => setPage({ id })}><Icon size={19} /><span>{id === 'home' ? 'Início' : title}</span></button>)}</nav>

    <AnimatePresence>{sheet && <ElasticSheet key={sheet.kind} title={sheetTitles[sheet.kind]} onClose={close}>
      {(dismiss: () => void) => <>
        {sheet.kind === 'settings' && <Settings />}
        {sheet.kind === 'task' && <TaskForm subjectId={sheet.subjectId} dueAt={sheet.dueAt} close={dismiss} />}
        {sheet.kind === 'subject' && <SubjectForm subject={sheet.subject} close={dismiss}
          save={(value) => { app.saveSubject(value); subjectPage(value.id); dismiss(); }}
          remove={(id) => { app.removeSubject(id); setPage({ id: 'home' }); dismiss(); }} />}
        {sheet.kind === 'search' && <WorkspaceSearch subject={(id) => { subjectPage(id); dismiss(); }}
          note={(sid, id) => { subjectPage(sid, 'notes', id); dismiss(); }} entry={(id) => { openTask(id); dismiss(); }} />}
        {sheet.kind === 'break' && <div className="break-sheet-content">
          <div className="break-illustration"><Coffee size={32} strokeWidth={1.5} /></div>
          <h3>Escolha um intervalo</h3><p>Quando terminar, a pausa será registrada na Evolução.</p>
          <div className="break-options">{[5, 10, 15].map((minutes) => <Button key={minutes} onClick={() => { app.startBreak(minutes); dismiss(); }}>{minutes} min</Button>)}</div>
          <p className="break-footnote"><CircleHelp size={14} /> Você pode encerrar a pausa pelo modo Foco.</p>
        </div>}
      </>}
    </ElasticSheet>}</AnimatePresence>

    <AnimatePresence>{app.toast && <motion.div key={app.toast.id} role="status" aria-live="polite"
      className="toast" initial={reduce ? false : {opacity:0,y:20,scale:.97}}
      animate={{opacity:1,y:0,scale:1}} exit={reduce ? {opacity:0,transition:{duration:0}} : {opacity:0,y:8}}
      transition={reduce ? {duration:0} : springs.panel}>
      <span><Check size={17}/>{app.toast.message}</span>
      {app.toast.undo && <button type="button" onClick={app.undoDelete}>Desfazer</button>}
      <button type="button" className="toast-close" aria-label="Dispensar aviso" onClick={app.dismissToast}><X size={15}/></button>
    </motion.div>}</AnimatePresence>
  </div>;
}

export default function App() {
  return <AppProvider><AppContent/></AppProvider>;
}
