import type { Algebra } from '@comunica/utils-algebra';
import { toAlgebra12Builder } from '@traqula/algebra-sparql-1-2';
import { createAlgebraContext } from '@traqula/algebra-transformations-1-2';
import type { SubTyped } from '@traqula/core';
import { TransformerSubTyped } from '@traqula/core';
import type { Expression, TermVariable } from '@traqula/rules-sparql-1-1';
import { AstFactory } from '@traqula/rules-sparql-1-2';
import { DataFactory } from 'rdf-data-factory';

const DF = new DataFactory();
const F = new AstFactory();
const toAlgebra = toAlgebra12Builder.build();

export const XSD = 'http://www.w3.org/2001/XMLSchema#';

/**
 * Thrown for XPath expressions that have no SPARQL equivalent, so the test can be skipped instead of failed.
 */
export class UnsupportedError extends Error {}

/**
 * A node of the XPath syntax tree, of which the children are transformed into SPARQL expressions.
 */
type XPathNode =
  (SubTyped<'xpath', 'literal'> & { value: string; datatype: string }) |
  (SubTyped<'xpath', 'variable'> & { name: string }) |
  (SubTyped<'xpath', 'operator'> & { operator: string; args: XPathNode[] }) |
  (SubTyped<'xpath', 'cast'> & { typeName: string; arg: XPathNode }) |
  (SubTyped<'xpath', 'call'> & { name: string; args: XPathNode[] });

const transformer = new TransformerSubTyped<XPathNode>();

/**
 * The XSD types for which the expression engine has a cast function.
 */
const CAST_TYPES = new Set([
  'string',
  'boolean',
  'integer',
  'decimal',
  'float',
  'double',
  'dateTime',
  'date',
  'time',
  'duration',
  'dayTimeDuration',
  'yearMonthDuration',
]);

/**
 * The XSD types derived from xsd:integer, which the expression engine knows but has no cast function for.
 * Constructing them from a string literal results in a typed literal.
 */
const INTEGER_TYPES = new Set([
  'nonPositiveInteger',
  'negativeInteger',
  'long',
  'int',
  'short',
  'byte',
  'nonNegativeInteger',
  'unsignedLong',
  'unsignedInt',
  'unsignedShort',
  'unsignedByte',
  'positiveInteger',
]);

/**
 * XPath functions, by name and arity, mapped onto the SPARQL operators that the SPARQL specification defines with them.
 */
const FUNCTIONS: Record<string, { arities: number[]; operator: string }> = {
  abs: { arities: [ 1 ], operator: 'abs' },
  ceiling: { arities: [ 1 ], operator: 'ceil' },
  floor: { arities: [ 1 ], operator: 'floor' },
  round: { arities: [ 1 ], operator: 'round' },
  'string-length': { arities: [ 1 ], operator: 'strlen' },
  substring: { arities: [ 2, 3 ], operator: 'substr' },
  'upper-case': { arities: [ 1 ], operator: 'ucase' },
  'lower-case': { arities: [ 1 ], operator: 'lcase' },
  'starts-with': { arities: [ 2 ], operator: 'strstarts' },
  'ends-with': { arities: [ 2 ], operator: 'strends' },
  contains: { arities: [ 2 ], operator: 'contains' },
  'substring-before': { arities: [ 2 ], operator: 'strbefore' },
  'substring-after': { arities: [ 2 ], operator: 'strafter' },
  'encode-for-uri': { arities: [ 1 ], operator: 'encode_for_uri' },
  matches: { arities: [ 2, 3 ], operator: 'regex' },
  replace: { arities: [ 3, 4 ], operator: 'replace' },
  'year-from-dateTime': { arities: [ 1 ], operator: 'year' },
  'year-from-date': { arities: [ 1 ], operator: 'year' },
  'month-from-dateTime': { arities: [ 1 ], operator: 'month' },
  'month-from-date': { arities: [ 1 ], operator: 'month' },
  'day-from-dateTime': { arities: [ 1 ], operator: 'day' },
  'day-from-date': { arities: [ 1 ], operator: 'day' },
  'hours-from-dateTime': { arities: [ 1 ], operator: 'hours' },
  'hours-from-time': { arities: [ 1 ], operator: 'hours' },
  'minutes-from-dateTime': { arities: [ 1 ], operator: 'minutes' },
  'minutes-from-time': { arities: [ 1 ], operator: 'minutes' },
  'seconds-from-dateTime': { arities: [ 1 ], operator: 'seconds' },
  'seconds-from-time': { arities: [ 1 ], operator: 'seconds' },
  'timezone-from-dateTime': { arities: [ 1 ], operator: 'timezone' },
  not: { arities: [ 1 ], operator: '!' },
};

const COMPARISONS: Record<string, string> = {
  eq: '=',
  ne: '!=',
  lt: '<',
  le: '<=',
  gt: '>',
  ge: '>=',
  '=': '=',
  '!=': '!=',
  '<': '<',
  '<=': '<=',
  '>': '>',
  '>=': '>=',
};

/**
 * Remove (possibly nested) XPath comments.
 */
function stripComments(xpath: string): string {
  let result = '';
  let depth = 0;
  let quote: string | undefined;
  for (let i = 0; i < xpath.length; i++) {
    const char = xpath[i];
    if (depth === 0 && quote) {
      result += char;
      if (char === quote) {
        quote = undefined;
      }
    } else if (xpath.startsWith('(:', i)) {
      depth++;
      i++;
    } else if (depth > 0 && xpath.startsWith(':)', i)) {
      depth--;
      i++;
      result += ' ';
    } else if (depth === 0) {
      if (char === '"' || char === '\'') {
        quote = char;
      }
      result += char;
    }
  }
  return result;
}

const TOKEN = new RegExp([
  // Whitespace
  String.raw`(?<space>\s+)`,
  // Numeric literals, where a double has an exponent and a decimal has a dot,
  // and which must not be directly followed by a name (https://www.w3.org/TR/xpath-31/#id-terminal-delimitation)
  String.raw`(?<double>(?:\.\d+|\d+(?:\.\d*)?)[eE][+-]?\d+(?![A-Za-z_]))`,
  String.raw`(?<decimal>(?:\.\d+|\d+\.\d*)(?![A-Za-z_]))`,
  String.raw`(?<integer>\d+(?![\d.A-Za-z_]))`,
  // String literals, where a doubled quote escapes the quote
  String.raw`(?<string>"(?:[^"]|"")*"|'(?:[^']|'')*')`,
  // Variable references and (prefixed) names
  String.raw`(?<variable>\$[A-Za-z_][\w.-]*)`,
  String.raw`(?<name>[A-Za-z_][\w.-]*(?::[A-Za-z_][\w.-]*)?)`,
  // Symbols, longest first
  String.raw`(?<symbol>!=|<=|>=|\|\||[-+*(),<>=?!|/\[\]{}#@.;:])`,
].join('|'), 'uy');

interface IToken {
  type: string;
  value: string;
}

function tokenize(xpath: string): IToken[] {
  const tokens: IToken[] = [];
  TOKEN.lastIndex = 0;
  while (TOKEN.lastIndex < xpath.length) {
    const match = TOKEN.exec(xpath);
    if (!match) {
      throw new UnsupportedError(`Unknown token at ${TOKEN.lastIndex}`);
    }
    const [ type, value ] = Object.entries(match.groups!).find(([ , val ]) => val !== undefined)!;
    if (type !== 'space') {
      tokens.push({ type, value });
    }
  }
  return tokens;
}

/**
 * A recursive descent parser for the subset of XPath 3.1 that maps onto SPARQL expressions,
 * which produces an XPath syntax tree (https://www.w3.org/TR/xpath-31/#id-grammar).
 */
class Parser {
  private readonly tokens: IToken[];
  private position = 0;

  public constructor(xpath: string) {
    this.tokens = tokenize(stripComments(xpath));
  }

  public parse(): XPathNode {
    const expression = this.orExpr();
    if (this.peek()) {
      throw new UnsupportedError(`Unsupported token ${this.peek()!.value}`);
    }
    return expression;
  }

  private peek(offset = 0): IToken | undefined {
    return this.tokens[this.position + offset];
  }

  private isName(value: string, offset = 0): boolean {
    const token = this.peek(offset);
    return token?.type === 'name' && token.value === value;
  }

  private isSymbol(value: string, offset = 0): boolean {
    const token = this.peek(offset);
    return token?.type === 'symbol' && token.value === value;
  }

  private expectSymbol(value: string): void {
    if (!this.isSymbol(value)) {
      throw new UnsupportedError(`Expected ${value}`);
    }
    this.position++;
  }

  private operator(operator: string, args: XPathNode[]): XPathNode {
    return { type: 'xpath', subType: 'operator', operator, args };
  }

  private orExpr(): XPathNode {
    let left = this.andExpr();
    while (this.isName('or')) {
      this.position++;
      left = this.operator('||', [ left, this.andExpr() ]);
    }
    return left;
  }

  private andExpr(): XPathNode {
    let left = this.comparisonExpr();
    while (this.isName('and')) {
      this.position++;
      left = this.operator('&&', [ left, this.comparisonExpr() ]);
    }
    return left;
  }

  private comparisonExpr(): XPathNode {
    const left = this.additiveExpr();
    const token = this.peek();
    if (token && (token.type === 'name' || token.type === 'symbol') && COMPARISONS[token.value]) {
      this.position++;
      return this.operator(COMPARISONS[token.value], [ left, this.additiveExpr() ]);
    }
    return left;
  }

  private additiveExpr(): XPathNode {
    let left = this.multiplicativeExpr();
    while (this.isSymbol('+') || this.isSymbol('-')) {
      const operator = this.peek()!.value;
      this.position++;
      left = this.operator(operator, [ left, this.multiplicativeExpr() ]);
    }
    return left;
  }

  private multiplicativeExpr(): XPathNode {
    let left = this.castExpr();
    while (this.isSymbol('*') || this.isName('div')) {
      const operator = this.isSymbol('*') ? '*' : '/';
      this.position++;
      left = this.operator(operator, [ left, this.castExpr() ]);
    }
    return left;
  }

  private castExpr(): XPathNode {
    const expression = this.unaryExpr();
    if (this.isName('cast') && this.isName('as', 1)) {
      this.position += 2;
      const type = this.peek();
      if (type?.type !== 'name' || this.isSymbol('?', 1)) {
        throw new UnsupportedError('Unsupported cast type');
      }
      this.position++;
      return { type: 'xpath', subType: 'cast', typeName: type.value, arg: expression };
    }
    return expression;
  }

  private unaryExpr(): XPathNode {
    if (this.isSymbol('-') || this.isSymbol('+')) {
      const operator = this.peek()!.value === '-' ? 'uminus' : 'uplus';
      this.position++;
      return this.operator(operator, [ this.unaryExpr() ]);
    }
    return this.primaryExpr();
  }

  private primaryExpr(): XPathNode {
    const token = this.peek();
    if (!token) {
      throw new UnsupportedError('Unexpected end of expression');
    }
    this.position++;
    switch (token.type) {
      case 'integer':
      case 'decimal':
      case 'double':
        return { type: 'xpath', subType: 'literal', value: token.value, datatype: token.type };
      case 'string':
        return {
          type: 'xpath',
          subType: 'literal',
          value: token.value.slice(1, -1).replaceAll(token.value[0] + token.value[0], token.value[0]),
          datatype: 'string',
        };
      case 'variable':
        return { type: 'xpath', subType: 'variable', name: token.value.slice(1) };
      case 'symbol':
        if (token.value === '(') {
          const expression = this.orExpr();
          this.expectSymbol(')');
          return expression;
        }
        break;
      case 'name':
        if (token.value === 'if' && this.isSymbol('(')) {
          return this.ifExpr();
        }
        if (this.isSymbol('(')) {
          return this.functionCall(token.value);
        }
        break;
    }
    throw new UnsupportedError(`Unsupported token ${token.value}`);
  }

  private ifExpr(): XPathNode {
    this.expectSymbol('(');
    const condition = this.orExpr();
    this.expectSymbol(')');
    if (!this.isName('then')) {
      throw new UnsupportedError('Expected then');
    }
    this.position++;
    const thenExpression = this.orExpr();
    if (!this.isName('else')) {
      throw new UnsupportedError('Expected else');
    }
    this.position++;
    return this.operator('if', [ condition, thenExpression, this.orExpr() ]);
  }

  private functionCall(name: string): XPathNode {
    this.expectSymbol('(');
    const args: XPathNode[] = [];
    if (!this.isSymbol(')')) {
      args.push(this.orExpr());
      while (this.isSymbol(',')) {
        this.position++;
        args.push(this.orExpr());
      }
    }
    this.expectSymbol(')');
    return { type: 'xpath', subType: 'call', name: name.includes(':') ? name : `fn:${name}`, args };
  }
}

/**
 * Create a SPARQL literal, given its lexical form and the local name of its XSD datatype.
 */
function literal(value: string, datatype: string): Expression {
  return F.termLiteral(F.gen(), value, datatype === 'string' ? undefined : F.termNamed(F.gen(), `${XSD}${datatype}`));
}

/**
 * Create the SPARQL equivalent of an XPath cast to the type with the given prefixed name.
 */
function cast(typeName: string, expression: Expression): Expression {
  const [ prefix, localName ] = typeName.split(':');
  if (prefix !== 'xs') {
    throw new UnsupportedError(`Unsupported cast type ${typeName}`);
  }
  if (CAST_TYPES.has(localName)) {
    return F.expressionFunctionCall(F.termNamed(F.gen(), `${XSD}${localName}`), [ expression ], false, F.gen());
  }
  // Integer types have no cast function, but a string literal can become a typed literal.
  // Other types, such as xs:untypedAtomic and xs:anyURI, are not SPARQL operand types.
  if (INTEGER_TYPES.has(localName) && F.isTermLiteralStr(expression)) {
    return literal(expression.value, localName);
  }
  throw new UnsupportedError(`Unsupported cast type ${typeName}`);
}

/**
 * Create the SPARQL equivalent of a call of the XPath function with the given prefixed name.
 */
function functionCall(name: string, args: Expression[]): Expression {
  const [ prefix, localName ] = name.split(':');
  if (prefix === 'xs' && args.length === 1) {
    return cast(name, args[0]);
  }
  if (prefix !== 'fn') {
    throw new UnsupportedError(`Unsupported function ${name}`);
  }
  if ((localName === 'true' || localName === 'false') && args.length === 0) {
    return literal(localName, 'boolean');
  }
  if (localName === 'boolean' && args.length === 1) {
    // The effective boolean value, as negating twice
    return F.expressionOperation('!', [ F.expressionOperation('!', args, F.gen()) ], F.gen());
  }
  if (localName === 'string' && args.length === 1) {
    // The string value of an atomic value is its cast to xs:string
    return cast('xs:string', args[0]);
  }
  if (localName === 'concat' && args.length >= 2) {
    // XPath converts the arguments to strings, while SPARQL only accepts strings
    return F.expressionOperation('concat', args.map(arg => cast('xs:string', arg)), F.gen());
  }
  const definition = FUNCTIONS[localName];
  if (!definition?.arities.includes(args.length)) {
    throw new UnsupportedError(`Unsupported function ${name}#${args.length}`);
  }
  return F.expressionOperation(definition.operator, args, F.gen());
}

/**
 * Translate an XPath expression into a SPARQL expression, as a Traqula syntax tree.
 * The XPath syntax tree is transformed bottom-up, so the children of a node are SPARQL expressions already.
 * @param xpath The XPath expression.
 * @param variables SPARQL expressions to substitute variable references with.
 * @throws {UnsupportedError} If the expression has no SPARQL equivalent.
 */
export function xpathToSparql(xpath: string, variables: Record<string, Expression> = {}): Expression {
  return transformer.transformNodeSpecific<'unsafe', Expression>(new Parser(xpath).parse(), {}, {
    xpath: {
      literal: { transform: ({ value, datatype }) => literal(value, datatype) },
      variable: {
        transform({ name }) {
          if (!variables[name]) {
            throw new UnsupportedError(`Unknown variable $${name}`);
          }
          return variables[name];
        },
      },
      operator: {
        transform: ({ operator, args }) => F.expressionOperation(operator, <Expression[]> <unknown> args, F.gen()),
      },
      cast: { transform: ({ typeName, arg }) => cast(typeName, <Expression> <unknown> arg) },
      call: { transform: ({ name, args }) => functionCall(name, <Expression[]> <unknown> args) },
    },
  });
}

/**
 * Translate an XPath expression into SPARQL algebra,
 * in the same way as the algebra of the expressions in a SPARQL query.
 * @param xpath The XPath expression.
 * @param variables SPARQL expressions to substitute variable references with.
 * @throws {UnsupportedError} If the expression has no SPARQL equivalent.
 */
export function xpathToAlgebra(xpath: string, variables: Record<string, Expression> = {}): Algebra.Expression {
  return <Algebra.Expression> toAlgebra
    .translateExpression(createAlgebraContext({ dataFactory: DF }), xpathToSparql(xpath, variables));
}

/**
 * Create a SPARQL variable, to refer to in the variables of {@link xpathToSparql}.
 */
export function sparqlVariable(name: string): TermVariable {
  return F.termVariable(name, F.gen());
}
