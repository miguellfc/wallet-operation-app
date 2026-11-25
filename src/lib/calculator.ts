export const OPERATORS = ['+', '−', '×', '÷'] as const;

export type Operator = (typeof OPERATORS)[number];

const PRECISION = 1e8;

const isOperator = (value: string): value is Operator => (OPERATORS as readonly string[]).includes(value);

const lastNumber = (expression: string) => expression.split(/[+−×÷]/).pop() ?? '';

export function appendKey(expression: string, key: string) {
  const last = expression.slice(-1);
  if (isOperator(key)) {
    if (expression === '') return expression;
    return isOperator(last) ? `${expression.slice(0, -1)}${key}` : `${expression}${key}`;
  }
  if (key === '.') {
    if (lastNumber(expression).includes('.')) return expression;
    return lastNumber(expression) === '' ? `${expression}0.` : `${expression}.`;
  }
  if (lastNumber(expression) === '0') return `${expression.slice(0, -1)}${key}`;
  return `${expression}${key}`;
}

export function evaluate(expression: string): number | null {
  const trimmed = isOperator(expression.slice(-1)) ? expression.slice(0, -1) : expression;
  if (trimmed === '') return null;
  const tokens = trimmed.match(/\d*\.?\d+|\d+\.|[+−×÷]/g);
  if (!tokens || tokens.join('') !== trimmed) return null;

  const terms: number[] = [Number(tokens[0])];
  const signs: Operator[] = [];
  for (let index = 1; index < tokens.length; index += 2) {
    const operator = tokens[index] as Operator;
    const value = Number(tokens[index + 1]);
    if (operator === '×') terms[terms.length - 1] *= value;
    else if (operator === '÷') {
      if (value === 0) return null;
      terms[terms.length - 1] /= value;
    } else {
      signs.push(operator);
      terms.push(value);
    }
  }
  const total = terms.slice(1).reduce((sum, term, index) => (signs[index] === '+' ? sum + term : sum - term), terms[0]);
  return Number.isFinite(total) ? Math.round(total * PRECISION) / PRECISION : null;
}
