export const editorTextStyles = [
  ['h1', 'H1 · Título'], ['h2', 'H2 · Seção'], ['h3', 'H3 · Subseção'],
  ['h4', 'H4'], ['h5', 'H5'], ['h6', 'H6'], ['p', 'Parágrafo'],
  ['quote', 'Citação'], ['list', 'Lista e checklist'], ['table', 'Tabela'], ['code', 'Bloco de código'],
] as const;

export type EditorTextStyle = typeof editorTextStyles[number][0];
export type EditorTypography = Partial<Record<EditorTextStyle, { font?: string; weight?: number }>>;

type EditorFont = {
  name: string;
  family: string;
  weights: readonly number[];
  range?: readonly [number, number];
};

const variable = (name: string, min: number, max: number, fallback = 'sans-serif'): EditorFont => ({
  name, family: "'" + name + " Variable', " + fallback,
  weights: [...new Set([min, ...[100, 200, 300, 400, 500, 600, 700, 800, 900, 1000].filter((weight) => min < weight && weight < max), max])],
  range: [min, max],
});

export const editorFonts: readonly EditorFont[] = [
  { name: 'Arial', family: "Arial, 'Arimo Variable', sans-serif", weights: [400, 700] },
  variable('Bitter', 100, 900, 'serif'),
  { name: 'Calibri', family: 'Calibri, Carlito, sans-serif', weights: [300, 400, 700] },
  variable('Cormorant Garamond', 300, 700, 'serif'),
  variable('DM Sans', 100, 1000),
  variable('EB Garamond', 400, 800, 'serif'),
  { name: 'Georgia', family: 'Georgia, serif', weights: [400, 700] },
  variable('Instrument Sans', 400, 700),
  variable('Inter', 100, 900),
  variable('Inter Tight', 100, 900),
  variable('Lora', 400, 700, 'serif'),
  { name: 'Monoespaçada', family: 'ui-monospace, monospace', weights: [400, 700] },
  variable('Montserrat', 100, 900),
  variable('Noto Sans', 100, 900),
  variable('Nunito', 200, 1000),
  variable('Open Sans', 300, 800),
  variable('Oswald', 200, 700),
  variable('Playfair Display', 400, 900, 'serif'),
  { name: 'Poppins', family: 'Poppins, sans-serif', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  variable('Quicksand', 300, 700),
  variable('Roboto', 100, 900),
  variable('Source Sans 3', 200, 900),
  { name: 'Times New Roman', family: 'Times New Roman, serif', weights: [400, 700] },
  { name: 'Verdana', family: 'Verdana, sans-serif', weights: [400, 700] },
];

export function findEditorFont(value?: string) {
  const name = value?.split(',')[0]?.trim().replace(/^['"]|['"]$/g, '');
  return editorFonts.find((font) => font.name === name || name === font.name + ' Variable' || value === font.family);
}

export function allowsWeight(weight: unknown, font?: EditorFont): weight is number {
  return typeof weight === 'number' && Number.isInteger(weight) && (font?.range || !font
    ? weight >= (font?.range?.[0] ?? 1) && weight <= (font?.range?.[1] ?? 1000)
    : font.weights.includes(weight));
}

export function defaultEditorFont(style: EditorTextStyle) {
  return findEditorFont(style === 'code' ? 'Monoespaçada' : style.startsWith('h') ? 'Inter Tight' : 'Inter')!;
}

export function validateEditorTypography(value: unknown): EditorTypography {
  if (!value || typeof value !== 'object') return {};
  const typography: EditorTypography = {};
  const entries = value as EditorTypography;
  for (const [style] of editorTextStyles) {
    const entry = entries[style];
    if (!entry || typeof entry !== 'object') continue;
    const font = typeof entry.font === 'string' ? editorFonts.find(({ name }) => name === entry.font) : undefined;
    if (font || allowsWeight(entry.weight, defaultEditorFont(style))) {
      typography[style] = { font: font?.name, weight: allowsWeight(entry.weight, font ?? defaultEditorFont(style)) ? entry.weight : undefined };
    }
  }
  return typography;
}

export function editorTypographyVariables(typography: EditorTypography) {
  const variables: Record<string, string | number> = {};
  for (const [style, value] of Object.entries(typography)) {
    const font = findEditorFont(value.font);
    if (font) variables['--note-font-' + style] = font.family;
    if (value.weight !== undefined) variables['--note-weight-' + style] = value.weight;
  }
  return variables;
}
