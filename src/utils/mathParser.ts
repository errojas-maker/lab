/**
 * Highly polished, type-safe custom mathematical expression parser for interactive simulation.
 * Implements a complete Lexer and Recursive Descent Parser yielding an Abstract Syntax Tree (AST).
 * Supports:
 * - Implicit multiplication (e.g. "2y", "x(y+1)", "cos(x)y")
 * - Case-insensitive variables: x, y
 * - Mathematical constants: pi, e
 * - Operators: +, -, *, /, ^
 * - Functions: sin, cos, tan, exp, ln, log, sqrt, abs, sinh, cosh, tanh
 * - Clean error recovery with character indices for visual UI feedback.
 */

export interface Token {
  type: 'NUMBER' | 'VAR' | 'OP' | 'LPAREN' | 'RPAREN' | 'FUNC' | 'CONST';
  value: string;
  start: number;
  end: number;
}

export type ASTNode =
  | { type: 'number'; value: number }
  | { type: 'constant'; name: 'pi' | 'e'; value: number }
  | { type: 'variable'; name: 'x' | 'y' }
  | { type: 'unary'; operator: '+' | '-'; operand: ASTNode }
  | { type: 'binary'; operator: '+' | '-' | '*' | '/' | '^'; left: ASTNode; right: ASTNode }
  | { type: 'function'; name: string; operand: ASTNode };

const SUPPORTED_FUNCTIONS = new Set([
  'sin', 'cos', 'tan', 'exp', 'ln', 'log', 'sqrt', 'abs', 'sinh', 'cosh', 'tanh', 'asin', 'acos', 'atan'
]);

const SUPPORTED_CONSTANTS = {
  pi: Math.PI,
  e: Math.E
};

/**
 * Tokenize mathematical formula string.
 */
export function lex(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = expr.length;

  while (i < len) {
    const char = expr[i];

    // Skip whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // Numbers (integers and decimals)
    if (/[0-9]/.test(char) || (char === '.' && i + 1 < len && /[0-9]/.test(expr[i + 1]))) {
      const start = i;
      let seenDot = char === '.';
      i++;
      while (i < len) {
        const nextChar = expr[i];
        if (/[0-9]/.test(nextChar)) {
          i++;
        } else if (nextChar === '.' && !seenDot) {
          seenDot = true;
          i++;
        } else {
          break;
        }
      }
      tokens.push({
        type: 'NUMBER',
        value: expr.slice(start, i),
        start,
        end: i
      });
      continue;
    }

    // Identifiers (Variables, Constants, Functions)
    if (/[a-zA-Z]/.test(char)) {
      const start = i;
      i++;
      while (i < len && /[a-zA-Z0-9]/.test(expr[i])) {
        i++;
      }
      const val = expr.slice(start, i).toLowerCase();

      if (val === 'x' || val === 'y') {
        tokens.push({ type: 'VAR', value: val, start, end: i });
      } else if (val in SUPPORTED_CONSTANTS) {
        tokens.push({ type: 'CONST', value: val, start, end: i });
      } else if (SUPPORTED_FUNCTIONS.has(val)) {
        tokens.push({ type: 'FUNC', value: val, start, end: i });
      } else {
        // Unknown identifier -> Treat as error or custom variable (fallback to variable x/y error if evaluated)
        tokens.push({ type: 'VAR', value: val, start, end: i });
      }
      continue;
    }

    // Parentheses
    if (char === '(') {
      tokens.push({ type: 'LPAREN', value: '(', start: i, end: i + 1 });
      i++;
      continue;
    }
    if (char === ')') {
      tokens.push({ type: 'RPAREN', value: ')', start: i, end: i + 1 });
      i++;
      continue;
    }

    // Operators
    if (['+', '-', '*', '/', '^'].includes(char)) {
      tokens.push({ type: 'OP', value: char, start: i, end: i + 1 });
      i++;
      continue;
    }

    // Unknown character error
    throw new Error(`Carácter no reconocido "${char}" en la posición ${i + 1}`);
  }

  // Inject implicit multiplications to make formula entry ultra-intuitive
  // E.g., (NUMBER or VAR or RPAREN or CONST) followed by (VAR or FUNC or CONST or LPAREN)
  const expanded: Token[] = [];
  for (let t = 0; t < tokens.length; t++) {
    const curr = tokens[t];
    expanded.push(curr);

    if (t + 1 < tokens.length) {
      const next = tokens[t + 1];
      const leftImplicit = ['NUMBER', 'VAR', 'CONST', 'RPAREN'].includes(curr.type);
      const rightImplicit = ['VAR', 'CONST', 'FUNC', 'LPAREN'].includes(next.type);

      // Handle cases like "2(x)", "(x)(y)", "2y", "x ln(x)", "pi x"
      if (leftImplicit && rightImplicit) {
        expanded.push({
          type: 'OP',
          value: '*',
          start: curr.end,
          end: next.start
        });
      }
    }
  }

  return expanded;
}

/**
 * Parser transforming tokens to AST.
 */
export function parse(tokens: Token[]): ASTNode {
  let index = 0;

  function peek(): Token | undefined {
    return tokens[index];
  }

  function consume(expectedType?: string): Token {
    const token = tokens[index];
    if (!token) {
      throw new Error('Fin inesperado de la expresión matemática.');
    }
    if (expectedType && token.type !== expectedType) {
      throw new Error(`Se esperaba ${expectedType} pero se encontró "${token.value}" en la posición ${token.start + 1}.`);
    }
    index++;
    return token;
  }

  // Precedence level parsing: Expressive structures
  // expr   -> term (('+' | '-') term)*
  // term   -> power (('*' | '/') power)*
  // power  -> factor ('^' power)?
  // factor -> ('+' | '-') factor | FUNC LPAREN expr RPAREN | LPAREN expr RPAREN | NUMBER | CONST | VAR

  function parseExpr(): ASTNode {
    let left = parseTerm();
    while (true) {
      const token = peek();
      if (token && token.type === 'OP' && (token.value === '+' || token.value === '-')) {
        consume();
        const right = parseTerm();
        left = {
          type: 'binary',
          operator: token.value,
          left,
          right
        };
      } else {
        break;
      }
    }
    return left;
  }

  function parseTerm(): ASTNode {
    let left = parsePower();
    while (true) {
      const token = peek();
      if (token && token.type === 'OP' && (token.value === '*' || token.value === '/')) {
        consume();
        const right = parsePower();
        left = {
          type: 'binary',
          operator: token.value,
          left,
          right
        };
      } else {
        break;
      }
    }
    return left;
  }

  function parsePower(): ASTNode {
    const left = parseFactor();
    const token = peek();
    if (token && token.type === 'OP' && token.value === '^') {
      consume();
      const right = parsePower(); // Right-associative exponentiation
      return {
        type: 'binary',
        operator: '^',
        left,
        right
      };
    }
    return left;
  }

  function parseFactor(): ASTNode {
    const token = peek();
    if (!token) {
      throw new Error('Fórmula incompleta. Falta un término o valor al final.');
    }

    if (token.type === 'OP' && (token.value === '+' || token.value === '-')) {
      consume();
      const operand = parseFactor();
      return {
        type: 'unary',
        operator: token.value,
        operand
      };
    }

    if (token.type === 'FUNC') {
      consume();
      consume('LPAREN');
      const operand = parseExpr();
      consume('RPAREN');
      return {
        type: 'function',
        name: token.value,
        operand
      };
    }

    if (token.type === 'LPAREN') {
      consume();
      const expr = parseExpr();
      consume('RPAREN');
      return expr;
    }

    if (token.type === 'NUMBER') {
      consume();
      return {
        type: 'number',
        value: parseFloat(token.value)
      };
    }

    if (token.type === 'CONST') {
      consume();
      const name = token.value as 'pi' | 'e';
      return {
        type: 'constant',
        name,
        value: SUPPORTED_CONSTANTS[name]
      };
    }

    if (token.type === 'VAR') {
      consume();
      const name = token.value.toLowerCase();
      if (name !== 'x' && name !== 'y') {
        throw new Error(`Variable no válida "${token.value}" en la posición ${token.start + 1}. Solo se admiten las variables x, y.`);
      }
      return {
        type: 'variable',
        name
      };
    }

    throw new Error(`Elemento inesperado "${token.value}" en la posición ${token.start + 1}.`);
  }

  const root = parseExpr();
  if (index < tokens.length) {
    const unused = tokens[index];
    throw new Error(`Sintaxis no válida construida. Caracteres sobrantes desde la posición ${unused.start + 1} ("${unused.value}").`);
  }
  return root;
}

/**
 * High-performance evaluator traversing the AST.
 */
export function evaluateAST(node: ASTNode, x: number, y: number): number {
  switch (node.type) {
    case 'number':
      return node.value;
    case 'constant':
      return node.value;
    case 'variable':
      return node.name === 'x' ? x : y;
    case 'unary': {
      const val = evaluateAST(node.operand, x, y);
      return node.operator === '-' ? -val : val;
    }
    case 'binary': {
      const leftVal = evaluateAST(node.left, x, y);
      const rightVal = evaluateAST(node.right, x, y);
      switch (node.operator) {
        case '+':
          return leftVal + rightVal;
        case '-':
          return leftVal - rightVal;
        case '*':
          return leftVal * rightVal;
        case '/':
          if (Math.abs(rightVal) < 1e-15) {
            // Guard against division by extreme micro-values
            return leftVal >= 0 ? 1e10 : -1e10;
          }
          return leftVal / rightVal;
        case '^':
          return Math.pow(leftVal, rightVal);
        default:
          return 0;
      }
    }
    case 'function': {
      const val = evaluateAST(node.operand, x, y);
      switch (node.name) {
        case 'sin':
          return Math.sin(val);
        case 'cos':
          return Math.cos(val);
        case 'tan':
          return Math.tan(val);
        case 'asin':
          return Math.asin(val);
        case 'acos':
          return Math.acos(val);
        case 'atan':
          return Math.atan(val);
        case 'sinh':
          return Math.sinh(val);
        case 'cosh':
          return Math.cosh(val);
        case 'tanh':
          return Math.tanh(val);
        case 'exp':
          return Math.exp(val);
        case 'ln':
        case 'log':
          return Math.log(Math.max(1e-15, val));
        case 'sqrt':
          return Math.sqrt(Math.max(0, val));
        case 'abs':
          return Math.abs(val);
        default:
          return 0;
      }
    }
    default:
      return 0;
  }
}

/**
 * Comprehensive safe check evaluating a math expression.
 * Returns evaluation function, or throws parsed formatted errors.
 */
export function compileExpression(expr: string): (x: number, y: number) => number {
  if (!expr || expr.trim() === '') {
    throw new Error('La expresión matemática está vacía.');
  }
  const tokens = lex(expr);
  const ast = parse(tokens);
  return (x: number, y: number) => {
    const val = evaluateAST(ast, x, y);
    if (isNaN(val) || !isFinite(val)) {
      return 0; // Return safe bound for graphic calculations
    }
    return val;
  };
}
