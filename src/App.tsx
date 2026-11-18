import { useRef, useState, type ChangeEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Brain, ChartNoAxesCombined, Check, CircleHelp, Coffee, Download, House, RotateCcw, Settings2, ShieldCheck, Sparkles, Trash2, Upload, X } from 'lucide-react';
import { AppProvider, useApp } from './state/AppState';
import { ElasticSheet } from './components/ElasticSheet';
import { Button } from './components/ui';
import { Agora } from './tabs/Agora';
import { Mente } from './tabs/Mente';
import { Evolucao } from './tabs/Evolucao';
import { validateData } from './lib/storage';
import { springs } from './lib/motion';
import type { Theme } from './types';

type Tab = 'now' | 'mind' | 'evolution';
type Sheet = 'settings' | 'break' | null;

function Settings() {
  const app = useApp();
  const { data } = app;
  const input = useRef<HTMLInputElement>(null);
  const download = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'brisa-backup-' + new Date().toISOString().slice(0,10) + '.json';
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
        if (window.confirm('Apagar todos os registros, pontos, recompensas e preferências? Esta ação não pode ser desfeita.')) app.clearAll();
      }}>Apagar todos os dados</Button>
    </div>
    <p className="settings-version">brisa. · protótipo 0.1 · código aberto sob licença MIT</p>
  </div>;
}

function AppContent() {
  const app = useApp();
  const [tab, setTab] = useState<Tab>('now');
  const [sheet, setSheet] = useState<Sheet>(null);
  const systemReduced = useReducedMotion();
  const reduce = !!systemReduced || app.data.profile.reducedMotion;
  const tabs = [
    {id:'now' as const, title:'Agora', icon:House},
    {id:'mind' as const, title:'Mente', icon:Brain},
    {id:'evolution' as const, title:'Evolução', icon:ChartNoAxesCombined},
  ];
  const today = new Intl.DateTimeFormat('pt-BR', {weekday:'long',day:'numeric',month:'long'}).format(new Date());
  if (!app.ready) return <div className="loading-shell"><div className="brand">brisa<span>.</span></div><p>Preparando seu espaço...</p></div>;
  return <div className="app-shell">
    <div className="ambient-orb" aria-hidden="true"/>
    <header className="topbar"><div className="brand-wrap"><div className="brand" aria-label="Brisa">brisa<span>.</span></div>
      <span className="brand-divider"/><span className="topbar-date">{today}</span></div>
      <div className="topbar-right"><span className="privacy-mark"><ShieldCheck size={14}/> Local e privado</span>
        <button className="icon-button settings-trigger" type="button" aria-label="Abrir configurações" onClick={() => setSheet('settings')}><Settings2 size={20}/></button></div></header>

    <main id="main-content" className="app-main">
      <AnimatePresence initial={false} mode="sync">
        <motion.div key={tab} initial={reduce ? false : {opacity:0,y:9}} animate={{opacity:1,y:0}}
          exit={reduce ? {opacity:0,transition:{duration:0}} : {opacity:0,y:-6,transition:{duration:.12}}}
          transition={reduce ? {duration:0} : {duration:.23}} className="view">
          {tab === 'now' ? <Agora onMind={() => setTab('mind')} onBreak={() => setSheet('break')}/> :
            tab === 'mind' ? <Mente/> : <Evolucao/>}
        </motion.div>
      </AnimatePresence>
    </main>

    <nav className="bottom-nav" aria-label="Navegação principal">
      {tabs.map(({id,title,icon:Icon}) => <button key={id} className={'nav-item ' + (tab === id ? 'nav-active' : '')} type="button"
        aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>
        {tab === id && <motion.span layoutId="nav-active" className="nav-active-bg"
          transition={reduce ? {duration:0} : springs.panel}/>}
        <span className="nav-contents"><Icon size={20} strokeWidth={tab === id ? 2.2 : 1.8}/><span>{title}</span></span>
      </button>)}
    </nav>

    <AnimatePresence>{sheet && <ElasticSheet key={sheet} title={sheet === 'settings' ? 'Seu espaço' : 'Uma pausa para respirar'} onClose={() => setSheet(null)}>
      {sheet === 'settings' ? <Settings/> : (dismiss: () => void) => <div className="break-sheet-content">
        <div className="break-illustration"><Coffee size={32} strokeWidth={1.5}/></div>
        <h3>Você não precisa fazer tudo agora.</h3><p>Escolha um intervalo. Quando acabar, sua pausa será registrada na Evolução, sem gastar pontos.</p>
        <div className="break-options">{[5,10,15].map((minutes) => <Button key={minutes} variant="secondary" size="lg"
          onClick={() => {app.startBreak(minutes);dismiss();}}>{minutes} minutos</Button>)}</div>
        <p className="break-footnote"><CircleHelp size={14}/> Você pode encerrar a pausa a qualquer momento na aba Agora.</p>
      </div>}
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
