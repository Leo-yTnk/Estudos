import { useApp } from '../state/AppState';
import { allowsWeight, defaultEditorFont, editorTextStyles, findEditorFont, type EditorTextStyle } from '../lib/editorTypography';
import { FontSelect, FontWeightField } from './EditorFontFields';

export function EditorTypographySettings() {
  const { data, updateProfile } = useApp();
  const typography = data.profile.editorTypography;
  const update = (style: EditorTextStyle, font?: string, weight?: number) =>
    updateProfile({ editorTypography: { ...typography, [style]: { font, weight } } });

  return <details className="note-type-settings">
    <summary>Fontes padrão do caderno</summary>
    <div className="note-type-grid">
      {editorTextStyles.map(([style, label]) => {
        const setting = typography[style] ?? {};
        const font = findEditorFont(setting.font) ?? defaultEditorFont(style);
        return <div className="note-type-row" key={style}>
          <strong>{label}</strong>
          <FontSelect label={'Fonte de ' + label} value={setting.font ?? ''} onChange={(name) => {
            const next = findEditorFont(name) ?? defaultEditorFont(style);
            update(style, name || undefined, allowsWeight(setting.weight, next) ? setting.weight : undefined);
          }} />
          <FontWeightField key={font.name} font={font} value={setting.weight} label={'Peso de ' + label}
            onChange={(weight) => update(style, setting.font, weight)} />
        </div>;
      })}
    </div>
  </details>;
}
