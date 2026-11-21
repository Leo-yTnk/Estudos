export type FormulaCell = { text: string };
export type FormulaResult = { value: number } | { error: string };

const numeric = /^(?:\d+(?:[.,]\d+)?|[.,]\d+)(?:e[+-]?\d+)?$/i;
const cellNumber = /^[+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+)(?:e[+-]?\d+)?%?$/i;
const address = /^([A-Z]+)([1-9]\d*)$/;
const aggregates = new Map<string, (values: number[]) => number>([
  ['SOMA', (values) => values.reduce((total, value) => total + value, 0)],
  ['MÉDIA', (values) => values.reduce((total, value) => total + value, 0) / values.length],
  ['MÍNIMO', (values) => values.reduce((minimum, value) => Math.min(minimum, value))],
  ['MÁXIMO', (values) => values.reduce((maximum, value) => Math.max(maximum, value))],
  ['CONT.NÚM', (values) => values.length],
]);

export function isTableFormula(text: string) {
  return text.trimStart().startsWith('=');
}

function invalid(message: string): never {
  throw new Error(message);
}

function finite(value: number) {
  return Number.isFinite(value) ? value : invalid('Resultado fora do limite');
}

function coordinate(reference: string) {
  const match = address.exec(reference);
  if (!match) return invalid('Referência inválida');
  const column = [...match[1]].reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0) - 1;
  return [Number(match[2]) - 1, column] as const;
}

function parse(source: string, read: (reference: string) => number | null, range: (start: string, end: string) => number[]) {
  if (source.length > 512) return invalid('Fórmula longa demais');
  const text = source.toLocaleUpperCase('pt-BR');
  const tokens = /\s*((?:\d+(?:[.,]\d+)?|[.,]\d+)(?:E[+-]?\d+)?|[A-ZÀ-Ü][A-ZÀ-Ü0-9.]*|[()+\-*/^%:;])/y;
  let position = 0;
  function next() {
    if (position === text.length) return '';
    tokens.lastIndex = position;
    const match = tokens.exec(text);
    if (!match) return invalid('Fórmula inválida');
    position = tokens.lastIndex;
    return match[1];
  }
  let token = next();
  const peek = () => token;
  function take() { const current = token; token = next(); return current; }
  function expect(expected: string) {
    if (peek() !== expected) return invalid('Fórmula inválida');
    take();
  }

  function aggregate(name: string) {
    const calculate = aggregates.get(name);
    if (!calculate) return invalid('Função desconhecida');
    const values: number[] = [];
    expect('(');
    function argument() {
      const previousToken = token;
      const previousPosition = position;
      if (address.test(peek())) {
        const first = take();
        if (peek() === ':') {
          take();
          for (const value of range(first, take())) values.push(value);
          return;
        }
        if (peek() === ';' || peek() === ')') {
          const value = read(first);
          if (value !== null) values.push(value);
          return;
        }
      }
      token = previousToken;
      position = previousPosition;
      values.push(expression());
    }
    argument();
    while (peek() === ';') { take(); argument(); }
    expect(')');
    if (!values.length && name !== 'SOMA' && name !== 'CONT.NÚM') return invalid('Sem valores numéricos');
    return finite(calculate(values));
  }

  function primary(): number {
    const current = take();
    if (current === '(') {
      const value = expression();
      expect(')');
      return value;
    }
    if (numeric.test(current)) return finite(Number(current.replace(',', '.')));
    if (address.test(current)) return read(current) ?? invalid('Célula sem número');
    if (peek() === '(') return aggregate(current);
    return invalid('Fórmula inválida');
  }
  function unary(): number {
    if (peek() === '+' || peek() === '-') return (take() === '-' ? -1 : 1) * unary();
    let value = primary();
    if (peek() === '%') { take(); value /= 100; }
    if (peek() === '^') { take(); value = finite(value ** unary()); }
    return value;
  }
  function product() {
    let value = unary();
    while (peek() === '*' || peek() === '/') {
      const operator = take();
      const right = unary();
      if (operator === '/' && right === 0) return invalid('Divisão por zero');
      value = finite(operator === '*' ? value * right : value / right);
    }
    return value;
  }
  function expression() {
    let value = product();
    while (peek() === '+' || peek() === '-') {
      const operator = take();
      const right = product();
      value = finite(operator === '+' ? value + right : value - right);
    }
    return value;
  }
  const result = expression();
  expect('');
  return result;
}

export function evaluateTableFormulas(grid: readonly (readonly (FormulaCell | undefined)[])[]) {
  const results = new Map<FormulaCell, FormulaResult>();
  const pending = new Set<FormulaCell>();
  const visited = new Set<FormulaCell>();
  const cellAt = (row: number, column: number) => grid[row]?.[column] ?? invalid('Referência fora da tabela');
  function valueOf(cell: FormulaCell) {
    const result = evaluate(cell);
    if (result && 'error' in result) return invalid(result.error);
    const text = cell.text.trim();
    if (result) return result.value;
    if (!cellNumber.test(text)) return null;
    const percent = text.endsWith('%');
    return finite(Number((percent ? text.slice(0, -1) : text).replace(',', '.')) / (percent ? 100 : 1));
  }
  const read = (reference: string) => valueOf(cellAt(...coordinate(reference)));
  function range(start: string, end: string) {
    const [r1, c1] = coordinate(start);
    const [r2, c2] = coordinate(end);
    cellAt(r1, c1);
    cellAt(r2, c2);
    const cells = new Set<FormulaCell>();
    for (let row = Math.min(r1, r2); row <= Math.max(r1, r2); row++) {
      for (let column = Math.min(c1, c2); column <= Math.max(c1, c2); column++) cells.add(cellAt(row, column));
    }
    return Array.from(cells, valueOf).filter((value): value is number => value !== null);
  }
  function evaluate(cell: FormulaCell): FormulaResult | undefined {
    if (!isTableFormula(cell.text)) return;
    const known = results.get(cell);
    if (known) return known;
    if (pending.has(cell)) return invalid('Referência circular');
    if (pending.size >= 128) return invalid('Muitas referências encadeadas');
    pending.add(cell);
    try {
      results.set(cell, { value: parse(cell.text.trim().slice(1).trim(), read, range) });
    } catch (error) {
      results.set(cell, { error: error instanceof Error ? error.message : 'Fórmula inválida' });
    } finally {
      pending.delete(cell);
    }
    return results.get(cell);
  }
  for (const row of grid) for (const cell of row) {
    if (cell && !visited.has(cell)) {
      visited.add(cell);
      evaluate(cell);
    }
  }
  return results;
}
