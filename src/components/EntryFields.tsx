import type { EntryInput } from '../types';
import { asLocalDate, dateToDeadline } from '../lib/engine';
import { useApp } from '../state/AppState';
import { KINDS } from '../types';

export const freshInput = (): EntryInput => ({
  title: '', note: '', kind: 'task', importance: 2, effort: 2, minutes: 25, dueAt: null,
});

export function EntryFields({ value, onChange, showKind = true }: {
  value: EntryInput;
  onChange: (next: EntryInput) => void;
  showKind?: boolean;
}) {
  const { subjects } = useApp().data;
  const change = <K extends keyof EntryInput>(field: K, next: EntryInput[K]) => onChange({ ...value, [field]: next });
  return <div className="fields">
    <label className="field-label">Título
      <input required maxLength={200} value={value.title} onChange={(e) => change('title', e.target.value)} placeholder="O que está na sua cabeça?" />
    </label>
    {showKind && <label className="field-label">Tipo
      <select value={value.kind} onChange={(e) => change('kind', e.target.value as EntryInput['kind'])}>
        {Object.entries(KINDS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
      </select>
    </label>}
    <label className="field-label">Anotações <span className="subtle">(opcional)</span>
      <textarea rows={2} maxLength={3000} value={value.note} onChange={(e) => change('note', e.target.value)} placeholder="Algum detalhe que ajude depois..." />
    </label>
    <div className="field-grid">
      <label className="field-label">Matéria
        <select value={value.subjectId || ''} onChange={(e) => change('subjectId', e.target.value || undefined)}>
          <option value="">Sem matéria</option>
          {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.title}</option>)}
        </select>
      </label>
      <label className="field-label">Prazo <span className="subtle">(opcional)</span>
        <input type="date" value={asLocalDate(value.dueAt)} onChange={(e) => change('dueAt', dateToDeadline(e.target.value))} />
      </label>
      <label className="field-label">Duração estimada
        <select value={value.minutes} onChange={(e) => change('minutes', Number(e.target.value))}>
          {[5,10,15,20,25,30,45,60,90,120,180].map((m) => <option key={m} value={m}>{m} min</option>)}
        </select>
      </label>
      <label className="field-label">Importância
        <select value={value.importance} onChange={(e) => change('importance', Number(e.target.value) as EntryInput['importance'])}>
          <option value={1}>Baixa</option><option value={2}>Média</option><option value={3}>Alta</option>
        </select>
      </label>
      <label className="field-label">Esforço
        <select value={value.effort} onChange={(e) => change('effort', Number(e.target.value) as EntryInput['effort'])}>
          <option value={1}>Leve</option><option value={2}>Moderado</option><option value={3}>Intenso</option>
        </select>
      </label>
    </div>
    {value.kind === 'worry' && <p className="form-footnote">Preocupações não entram automaticamente na lista de tarefas. Você pode apenas registrá-las.</p>}
  </div>;
}
