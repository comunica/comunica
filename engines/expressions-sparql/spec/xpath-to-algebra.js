const { toAlgebra12Builder } = require('@traqula/algebra-sparql-1-2');
const { createAlgebraContext } = require('@traqula/algebra-transformations-1-2');
const { TransformerSubTyped } = require('@traqula/core');
const { AstFactory } = require('@traqula/rules-sparql-1-2');
const { DataFactory } = require('rdf-data-factory');

const DF = new DataFactory();
const F = new AstFactory();
const transformer = new TransformerSubTyped();
const toAlgebra = toAlgebra12Builder.build();

const XSD = 'http://www.w3.org/2001/XMLSchema#';

/**
 * Thrown for XPath expressions that have no SPARQL equivalent, so the test can be skipped instead of failed.
 */
class UnsupportedError extends Error {}

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
const FUNCTIONS = {
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

const COMPARISONS = {
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
 * @param {string} xpath
 */
function stripComments(xpath) {
  let result = '';
  let depth = 0;
  let quote;
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

/**
 * @param {string} xpath
 */
function tokenize(xpath) {
  const tokens = [];
  TOKEN.lastIndex = 0;
  while (TOKEN.lastIndex < xpath.length) {
    const match = TOKEN.exec(xpath);
    if (!match) {
      throw new UnsupportedError(`Unknown token at ${TOKEN.lastIndex}`);
    }
    const [ type, value ] = Object.entries(match.groups).find(([ , val ]) => val !== undefined);
    if (type !== 'space') {
      tokens.push({ type, value });
    }
  }
  return tokens;
}

/**
 * Create a node of the XPath syntax tree.
 * @param {string} subType The kind of node.
 * @param {object} fields The fields of the node.
 */
function node(subType, fields) {
  return { type: 'xpath', subType, ...fields };
}

/**
 * A recursive descent parser for the subset of XPath 3.1 that maps onto SPARQL expressions,
 * which produces an XPath syntax tree (https://www.w3.org/TR/xpath-31/#id-grammar).
 */
class Parser {
  /**
   * @param {string} xpath The XPath expression.
   */
  constructor(xpath) {
    this.tokens = tokenize(stripComments(xpath));
    this.position = 0;
  }

  parse() {
    const expression = this.orExpr();
    if (this.peek()) {
      throw new UnsupportedError(`Unsupported token ${this.peek().value}`);
    }
    return expression;
  }

  peek(offset = 0) {
    return this.tokens[this.position + offset];
  }

  isName(value, offset = 0) {
    const token = this.peek(offset);
    return token?.type === 'name' && token.value === value;
  }

  isSymbol(value, offset = 0) {
    const token = this.peek(offset);
    return token?.type === 'symbol' && token.value === value;
  }

  expectSymbol(value) {
    if (!this.isSymbol(value)) {
      throw new UnsupportedError(`Expected ${value}`);
    }
    this.position++;
  }

  orExpr() {
    let left = this.andExpr();
    while (this.isName('or')) {
      this.position++;
      left = node('operator', { operator: '||', args: [ left, this.andExpr() ]});
    }
    return left;
  }

  andExpr() {
    let left = this.comparisonExpr();
    while (this.isName('and')) {
      this.position++;
      left = node('operator', { operator: '&&', args: [ left, this.comparisonExpr() ]});
    }
    return left;
  }

  comparisonExpr() {
    const left = this.additiveExpr();
    const token = this.peek();
    if (token && (token.type === 'name' || token.type === 'symbol') && COMPARISONS[token.value]) {
      this.position++;
      return node('operator', { operator: COMPARISONS[token.value], args: [ left, this.additiveExpr() ]});
    }
    return left;
  }

  additiveExpr() {
    let left = this.multiplicativeExpr();
    while (this.isSymbol('+') || this.isSymbol('-')) {
      const operator = this.peek().value;
      this.position++;
      left = node('operator', { operator, args: [ left, this.multiplicativeExpr() ]});
    }
    return left;
  }

  multiplicativeExpr() {
    let left = this.castExpr();
    while (this.isSymbol('*') || this.isName('div')) {
      const operator = this.isSymbol('*') ? '*' : '/';
      this.position++;
      left = node('operator', { operator, args: [ left, this.castExpr() ]});
    }
    return left;
  }

  castExpr() {
    const expression = this.unaryExpr();
    if (this.isName('cast') && this.isName('as', 1)) {
      this.position += 2;
      const type = this.peek();
      if (type?.type !== 'name' || this.isSymbol('?', 1)) {
        throw new UnsupportedError('Unsupported cast type');
      }
      this.position++;
      return node('cast', { typeName: type.value, arg: expression });
    }
    return expression;
  }

  unaryExpr() {
    if (this.isSymbol('-') || this.isSymbol('+')) {
      const operator = this.peek().value === '-' ? 'uminus' : 'uplus';
      this.position++;
      return node('operator', { operator, args: [ this.unaryExpr() ]});
    }
    return this.primaryExpr();
  }

  primaryExpr() {
    const token = this.peek();
    if (!token) {
      throw new UnsupportedError('Unexpected end of expression');
    }
    this.position++;
    switch (token.type) {
      case 'integer':
      case 'decimal':
      case 'double':
        return node('literal', { value: token.value, datatype: token.type });
      case 'string':
        return node('literal', {
          value: token.value.slice(1, -1).replaceAll(token.value[0] + token.value[0], token.value[0]),
          datatype: 'string',
        });
      case 'variable':
        return node('variable', { name: token.value.slice(1) });
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

  ifExpr() {
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
    return node('operator', { operator: 'if', args: [ condition, thenExpression, this.orExpr() ]});
  }

  functionCall(name) {
    this.expectSymbol('(');
    const args = [];
    if (!this.isSymbol(')')) {
      args.push(this.orExpr());
      while (this.isSymbol(',')) {
        this.position++;
        args.push(this.orExpr());
      }
    }
    this.expectSymbol(')');
    return node('call', { name: name.includes(':') ? name : `fn:${name}`, args });
  }
}

/**
 * Create a SPARQL literal.
 * @param {string} value The lexical form.
 * @param {string} datatype The local name of the XSD datatype.
 */
function literal(value, datatype) {
  return F.termLiteral(F.gen(), value, datatype === 'string' ? undefined : F.termNamed(F.gen(), `${XSD}${datatype}`));
}

/**
 * Create the SPARQL equivalent of an XPath cast.
 * @param {string} typeName The prefixed name of the type to cast to.
 * @param {object} expression The SPARQL expression to cast.
 */
function cast(typeName, expression) {
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
 * Create the SPARQL equivalent of an XPath function call.
 * @param {string} name The prefixed name of the function.
 * @param {object[]} args The SPARQL expressions of the arguments.
 */
function functionCall(name, args) {
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
 * @param {string} xpath The XPath expression.
 * @param {Record<string, any>} variables SPARQL expressions to substitute variable references with.
 * @throws {UnsupportedError} If the expression has no SPARQL equivalent.
 */
function xpathToSparql(xpath, variables = {}) {
  return transformer.transformNodeSpecific(new Parser(xpath).parse(), {}, {
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
      operator: { transform: ({ operator, args }) => F.expressionOperation(operator, args, F.gen()) },
      cast: { transform: ({ typeName, arg }) => cast(typeName, arg) },
      call: { transform: ({ name, args }) => functionCall(name, args) },
    },
  });
}

/**
 * Translate an XPath expression into SPARQL algebra,
 * in the same way as the algebra of the expressions in a SPARQL query.
 * @param {string} xpath The XPath expression.
 * @param {Record<string, any>} variables SPARQL expressions to substitute variable references with.
 * @throws {UnsupportedError} If the expression has no SPARQL equivalent.
 */
function xpathToAlgebra(xpath, variables = {}) {
  return toAlgebra.translateExpression(createAlgebraContext({ dataFactory: DF }), xpathToSparql(xpath, variables));
}

/**
 * Create a SPARQL variable, to refer to in the variables of {@link xpathToSparql}.
 * @param {string} name The name of the variable.
 */
function sparqlVariable(name) {
  return F.termVariable(name, F.gen());
}

module.exports = { xpathToSparql, xpathToAlgebra, sparqlVariable, UnsupportedError, DF, XSD };
