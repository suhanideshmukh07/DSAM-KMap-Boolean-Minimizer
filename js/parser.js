// parser.js – Safe Recursive-Descent Boolean expression evaluator and parser

/**
 * Tokenizer for Boolean expressions.
 * Supported tokens:
 * - IDENT: A, B, C, D (case-insensitive)
 * - CONST: 0, 1
 * - NOT: !, ~, '
 * - AND: &, *, * or implicit juxtaposition
 * - OR: +, |
 * - LPAREN: (
 * - RPAREN: )
 */
class BooleanParser {
  constructor(input, varValues = {}) {
    this.input = input.trim();
    this.varValues = varValues;
    this.pos = 0;
    this.tokens = this.tokenize(this.input);
    this.tIdx = 0;
  }

  tokenize(str) {
    const tokens = [];
    let i = 0;
    while (i < str.length) {
      const ch = str[i];
      if (/\s/.test(ch)) {
        i++;
        continue;
      }

      if (/[A-Da-d]/.test(ch)) {
        tokens.push({ type: 'VAR', val: ch.toUpperCase() });
        i++;
      } else if (ch === '0' || ch === '1') {
        tokens.push({ type: 'CONST', val: ch === '1' });
        i++;
      } else if (ch === '!' || ch === '~') {
        tokens.push({ type: 'NOT_PREFIX' });
        i++;
      } else if (ch === "'") {
        tokens.push({ type: 'NOT_POSTFIX' });
        i++;
      } else if (ch === '+' || ch === '|') {
        tokens.push({ type: 'OR' });
        i++;
      } else if (ch === '&' || ch === '*') {
        if (str[i+1] === '&') i++; // Handle &&
        tokens.push({ type: 'AND' });
        i++;
      } else if (ch === '(') {
        tokens.push({ type: 'LPAREN' });
        i++;
      } else if (ch === ')') {
        tokens.push({ type: 'RPAREN' });
        i++;
      } else {
        throw new Error(`Unexpected character in expression: "${ch}"`);
      }
    }

    // Insert implicit AND tokens between:
    // VAR / CONST / NOT_POSTFIX / RPAREN  followed by  VAR / CONST / NOT_PREFIX / LPAREN
    const withImplicitAnd = [];
    for (let j = 0; j < tokens.length; j++) {
      const curr = tokens[j];
      withImplicitAnd.push(curr);

      if (j + 1 < tokens.length) {
        const next = tokens[j + 1];
        const leftCanEndTerm = curr.type === 'VAR' || curr.type === 'CONST' || curr.type === 'NOT_POSTFIX' || curr.type === 'RPAREN';
        const rightCanStartTerm = next.type === 'VAR' || next.type === 'CONST' || next.type === 'NOT_PREFIX' || next.type === 'LPAREN';
        if (leftCanEndTerm && rightCanStartTerm) {
          withImplicitAnd.push({ type: 'AND' });
        }
      }
    }

    return withImplicitAnd;
  }

  peek() {
    return this.tokens[this.tIdx] || null;
  }

  consume(expectedType = null) {
    const tok = this.peek();
    if (!tok) {
      throw new Error("Unexpected end of expression");
    }
    if (expectedType && tok.type !== expectedType) {
      throw new Error(`Expected token ${expectedType} but found ${tok.type}`);
    }
    this.tIdx++;
    return tok;
  }

  // Grammar:
  // Expr   := OrExpr
  // OrExpr := AndExpr ( 'OR' AndExpr )*
  // AndExpr:= PostfixExpr ( 'AND' PostfixExpr )*
  // PostfixExpr := Factor ( 'NOT_POSTFIX' )*
  // Factor := 'NOT_PREFIX'* Primary
  // Primary:= VAR | CONST | '(' Expr ')'

  parseExpr() {
    return this.parseOr();
  }

  parseOr() {
    let left = this.parseAnd();
    while (this.peek() && this.peek().type === 'OR') {
      this.consume('OR');
      const right = this.parseAnd();
      left = left || right;
    }
    return left;
  }

  parseAnd() {
    let left = this.parsePostfix();
    while (this.peek() && this.peek().type === 'AND') {
      this.consume('AND');
      const right = this.parsePostfix();
      left = left && right;
    }
    return left;
  }

  parsePostfix() {
    let val = this.parseFactor();
    while (this.peek() && this.peek().type === 'NOT_POSTFIX') {
      this.consume('NOT_POSTFIX');
      val = !val;
    }
    return val;
  }

  parseFactor() {
    if (this.peek() && this.peek().type === 'NOT_PREFIX') {
      this.consume('NOT_PREFIX');
      return !this.parseFactor();
    }
    return this.parsePrimary();
  }

  parsePrimary() {
    const tok = this.peek();
    if (!tok) throw new Error("Unexpected end of input, expected primary value");

    if (tok.type === 'VAR') {
      this.consume('VAR');
      if (this.varValues[tok.val] === undefined) {
        throw new Error(`Variable ${tok.val} is not defined in current variable set.`);
      }
      return Boolean(this.varValues[tok.val]);
    } else if (tok.type === 'CONST') {
      this.consume('CONST');
      return tok.val;
    } else if (tok.type === 'LPAREN') {
      this.consume('LPAREN');
      const val = this.parseExpr();
      this.consume('RPAREN');
      return val;
    } else {
      throw new Error(`Unexpected token: ${tok.type}`);
    }
  }

  evaluate() {
    if (this.tokens.length === 0) return false;
    const res = this.parseExpr();
    if (this.tIdx < this.tokens.length) {
      throw new Error(`Unexpected token remaining: ${this.tokens[this.tIdx].type}`);
    }
    return res;
  }
}

/**
 * Evaluates a Boolean expression string given variable assignment values safely without eval/Function.
 */
function evaluateExpression(expr, varValues) {
  if (!expr || !expr.trim()) return false;
  try {
    const parser = new BooleanParser(expr, varValues);
    return parser.evaluate();
  } catch (err) {
    // console.warn("Parser error:", err.message);
    return false;
  }
}

/**
 * Validates a Boolean expression and checks if all variables fit within numVars.
 * Returns { valid: boolean, error: string|null }
 */
function validateBooleanExpression(expr, numVars) {
  if (!expr || !expr.trim()) {
    return { valid: false, error: "Expression cannot be empty." };
  }
  const allowedVars = new Set(getVarNames(numVars));
  const dummyValues = {};
  allowedVars.forEach(v => dummyValues[v] = false);

  try {
    const parser = new BooleanParser(expr, dummyValues);
    // Check tokens for invalid variables
    for (const tok of parser.tokens) {
      if (tok.type === 'VAR' && !allowedVars.has(tok.val)) {
        return {
          valid: false,
          error: `Variable "${tok.val}" is not allowed for ${numVars} variables (${Array.from(allowedVars).join(', ')}).`
        };
      }
    }
    parser.evaluate();
    return { valid: true, error: null };
  } catch (err) {
    return { valid: false, error: `Syntax Error: ${err.message}` };
  }
}

/**
 * Extracts minterms from a Boolean expression for a given number of variables.
 */
function getMintermsFromExpression(expr, numVars) {
  const vars = getVarNames(numVars);
  const minterms = [];
  const total = 1 << numVars;

  for (let i = 0; i < total; i++) {
    const bin = toBinary(i, numVars);
    const varValues = {};
    vars.forEach((v, idx) => {
      varValues[v] = bin[idx] === '1';
    });

    if (evaluateExpression(expr, varValues)) {
      minterms.push(i);
    }
  }

  return minterms;
}
