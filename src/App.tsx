import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Check, ChevronRight, CircleHelp, Coffee, Download, Pencil, Plus, Search, ShieldCheck, Sparkles, Trash2, Upload, X } from 'lucide-react';
import { AppProvider, useApp } from './state/AppState';
import { ElasticSheet } from './components/ElasticSheet';
import { Button, IconButton, PageHeading, Segment, Stack, Toolbar } from './components/ui';
import { MobileNavigation, WorkspaceLogo, WorkspaceSidebar, WorkspaceTools, workspacePages, type WorkspacePage } from './components/WorkspaceNavigation';
import { Agora } from './tabs/Agora';
import { Mente } from './tabs/Mente';
import { Evolucao } from './tabs/Evolucao';
import { validateData } from './lib/storage';
import { springs } from './lib/motion';
import type { Subject, Theme } from './types';
import { Dashboard } from './study/Dashboard';
import { Subjects, SubjectOverview, SubjectMark, subjectTools, type SubjectTool } from './study/Subjects';
import { Tasks, Week } from './study/Planner';
import { Notebook } from './study/Notebook';
import { Review } from './study/Review';
import { WorkspaceSearch, TaskForm, SubjectForm } from './study/WorkspacePanels';

const subjectTabs = [{ id: 'overview', label: 'Resumo' }, ...subjectTools] as const;
type SubjectTab = SubjectTool | 'overview';
type Page = { id: WorkspacePage; entryId?: string } | { id: 'subject'; subjectId: string; tab: SubjectTab; noteId?: string };
type Sheet = { kind: 'settings' | 'break' | 'search' | 'tools' } | { kind: 'task'; subjectId?: string; dueAt?: string | null } | { kind: 'subject'; subject?: Subject };

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
  const subjectPage = (id: string, tab: SubjectTab = 'overview', noteId?: string) => setPage({ id: 'subject', subjectId: id, tab, noteId });
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
  const workspacePage = page.id === 'subject' ? 'subjects' : page.id;
  const section = page.id === 'subject' ? subject?.title || 'Matérias' : workspacePages.find(({ id }) => id === page.id)?.title || '';
  const open = (id: WorkspacePage) => setPage({ id });
  const createSubject = () => setSheet({ kind: 'subject' });
  const settings = () => setSheet({ kind: 'settings' });
  const descriptions = {
    tasks: 'Organize entregas, exercícios e compromissos.',
    calendar: 'Veja os prazos e planeje uma semana de cada vez.',
  };
  const sheetTitles = { settings: 'Configurações', break: 'Uma pausa para respirar', search: 'Buscar no NowWork',
    tools: 'Mais ferramentas', task: 'Novo registro', subject: sheet?.kind === 'subject' && sheet.subject ? 'Editar matéria' : 'Nova matéria' };
  return <div className="nw-shell">
    <WorkspaceSidebar current={workspacePage} open={open} settings={settings} />
    <div className="nw-content">
      <header className="nw-header">
        <nav className="nw-breadcrumb" aria-label="Caminho atual">
          <Button size="sm" variant="ghost" onClick={() => open('home')}>Estudos</Button>
          {page.id !== 'home' && <><ChevronRight size={13} aria-hidden="true" />
            {subject ? <><Button size="sm" variant="ghost" onClick={() => open('subjects')}>Matérias</Button><ChevronRight size={13} aria-hidden="true" /></> : null}
            <strong>{section}</strong></>}
        </nav>
        <WorkspaceLogo mobile onClick={() => open('home')} />
        <Toolbar>
          <Button size="sm" variant="ghost" className="nw-search" aria-label="Buscar" onClick={() => setSheet({ kind: 'search' })}>
            <Search size={17} /><span>Buscar</span><kbd>Ctrl K</kbd></Button>
          {workspacePage !== 'subjects' && <Button aria-label="Novo registro" className="nw-new" variant="primary" icon={<Plus size={17} />} onClick={() => newTask()}>
            Novo<span className="nw-new-extra"> registro</span></Button>}
        </Toolbar>
      </header>
      <main className="nw-main" id="main-content">
        <motion.div key={page.id === 'subject' ? page.subjectId : page.id}
          initial={reduce ? false : { opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }}
          transition={reduce ? { duration: 0 } : { duration: .2 }}>
          {page.id === 'home' && <Dashboard subject={subjectPage} subjects={() => open('subjects')} newSubject={createSubject}
            focus={() => open('focus')} add={newTask} openTask={openTask} />}
          {(page.id === 'subjects' || (page.id === 'subject' && !subject)) && <Subjects open={subjectPage} create={createSubject} />}
          {(page.id === 'tasks' || page.id === 'calendar') && <Stack className="workspace-page">
            <PageHeading title={section} description={descriptions[page.id]} />
            {page.id === 'tasks' ? <Tasks key={page.entryId || 'all'} onlyId={page.entryId} onAdd={() => newTask()} /> : <Week onAdd={newTask} />}
          </Stack>}
          {page.id === 'subject' && subject && <Stack className="workspace-page">
            <Toolbar label="Caminho da matéria" className="subject-path">
              <Button size="sm" variant="ghost" onClick={() => open('subjects')}>Matérias</Button>
              <ChevronRight size={14} aria-hidden="true" /><span>{subject.title}</span>
            </Toolbar>
            <PageHeading title={subject.title} icon={<SubjectMark subject={subject} />}
              action={<IconButton label="Editar matéria" onClick={() => setSheet({ kind: 'subject', subject })}><Pencil size={18} /></IconButton>} />
            <Segment label="Ferramentas da matéria" className="subject-tabs" options={subjectTabs} value={page.tab}
              onChange={(tab) => subjectPage(subject.id, tab)} />
            {page.tab === 'overview' && <SubjectOverview subject={subject} select={(tab) => subjectPage(subject.id, tab)} />}
            {page.tab === 'tasks' && <Tasks key={subject.id} subjectId={subject.id} onAdd={() => newTask()} />}
            {page.tab === 'notes' && <Notebook key={subject.id} subjectId={subject.id} noteId={page.noteId} open={(id) => subjectPage(subject.id, 'notes', id)} />}
            {page.tab === 'review' && <Review key={subject.id} subjectId={subject.id} />}
          </Stack>}
          {page.id === 'focus' && <Agora onMind={() => open('mind')} onBreak={() => setSheet({ kind: 'break' })} />}
          {page.id === 'mind' && <Mente key={page.entryId || 'all'} selectedId={page.entryId} />}
          {page.id === 'evolution' && <Evolucao />}
        </motion.div>
      </main>
    </div>
    <MobileNavigation current={workspacePage} open={open} more={() => setSheet({ kind: 'tools' })} />

    <AnimatePresence>{sheet && <ElasticSheet key={sheet.kind} title={sheetTitles[sheet.kind]} onClose={close}>
      {(dismiss: () => void) => <>
        {sheet.kind === 'settings' && <Settings />}
        {sheet.kind === 'tools' && <WorkspaceTools open={(id) => { open(id); dismiss(); }} settings={settings} />}
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
