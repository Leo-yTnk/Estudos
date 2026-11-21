import { describe, expect, it } from 'vitest';
import { evaluateTableFormulas, type FormulaCell } from './tableFormulas';

function calculate(rows: string[][]) {
  const grid = rows.map((row) => row.map((text) => ({ text })));
  const results = evaluateTableFormulas(grid);
  return (row: number, column: number) => results.get(grid[row][column]);
}

describe('table formulas', () => {
  it('uses cell references, descendants of other formulas and Portuguese decimals', () => {
    const result = calculate([['Preço', 'Quantidade', 'Total'], ['2,5', '4', '=A2*B2'], ['-1,5', '10%', '=C2+A3*B3']]);
    expect(result(1, 2)).toEqual({ value: 10 });
    expect(result(2, 2)).toEqual({ value: 9.85 });
  });

  it('evaluates arithmetic with precedence, expressions as arguments and percentages', () => {
    const result = calculate([['5', '=SOMA(A1*2; (6+4)/2; 25%*12) + (-2^2) + 2^3^2']]);
    expect(result(0, 1)).toEqual({ value: 526 });
  });

  it('evaluates aggregates, skips text and blanks, and counts merged cells once per range', () => {
    const merged = { text: '4' };
    const formulas = ['=SOMA(A1:B2)', '=MÉDIA(A1:A3)', '=MÍNIMO(A1:A3)', '=MÁXIMO(A1:A3)', '=CONT.NÚM(A1:B3)']
      .map((text): FormulaCell => ({ text }));
    const grid = [[merged, merged], [{ text: '2' }, { text: '' }], [{ text: 'texto' }, { text: '8' }], formulas];
    const results = evaluateTableFormulas(grid);
    expect(formulas.map((formula) => results.get(formula))).toEqual([6, 3, 2, 4, 3].map((value) => ({ value })));
  });

  it('returns errors for cycles, invalid references, division by zero and unknown syntax', () => {
    const result = calculate([['=B1', '=A1', '=A99', '=1/0', '=SOMA(;2)', '=ALERTA(1)', '=MÉDIA(H1)', 'Texto']]);
    expect(result(0, 0)).toEqual({ error: 'Referência circular' });
    expect(result(0, 1)).toEqual({ error: 'Referência circular' });
    expect(result(0, 2)).toEqual({ error: 'Referência fora da tabela' });
    expect(result(0, 3)).toEqual({ error: 'Divisão por zero' });
    expect(result(0, 4)).toEqual({ error: 'Fórmula inválida' });
    expect(result(0, 5)).toEqual({ error: 'Função desconhecida' });
    expect(result(0, 6)).toEqual({ error: 'Sem valores numéricos' });
  });

  it('recalculates from edited cell text', () => {
    const input = { text: '2' };
    const formula = { text: '=A1*3' };
    const grid = [[input, formula]];
    expect(evaluateTableFormulas(grid).get(formula)).toEqual({ value: 6 });
    input.text = '4';
    expect(evaluateTableFormulas(grid).get(formula)).toEqual({ value: 12 });
  });
});
