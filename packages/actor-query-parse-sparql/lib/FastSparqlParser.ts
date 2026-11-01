import type { ComunicaDataFactory } from '@comunica/types';
import type { Algebra } from '@comunica/utils-algebra';
import { AlgebraFactory, algebraUtils } from '@comunica/utils-algebra';
import type * as RDF from '@rdfjs/types';

/**
 * Thrown for any input the fast parser does not support, after which the regular parser must be used.
 * This includes invalid queries, so that the regular parser can report the error.
 */
export class FastParserFallbackError extends Error {}

const XSD = 'http://www.w3.org/2001/XMLSchema#';
const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
const BUILTINS = new Set([
  'str',
  'lang',
  'langmatches',
  'datatype',
  'bound',
  'iri',
  'uri',
  'rand',
  'abs',
  'ceil',
  'floor',
  'round',
  'concat',
  'strlen',
  'ucase',
  'lcase',
  'encode_for_uri',
  'contains',
  'strstarts',
  'strends',
  'strbefore',
  'strafter',
  'year',
  'month',
  'day',
  'hours',
  'minutes',
  'seconds',
  'timezone',
  'tz',
  'now',
  'uuid',
  'struuid',
  'md5',
  'sha1',
  'sha256',
  'sha384',
  'sha512',
  'coalesce',
  'if',
  'strlang',
  'strdt',
  'sameterm',
  'isiri',
  'isuri',
  'isblank',
  'isliteral',
  'isnumeric',
  'regex',
  'substr',
  'replace',
]);
const ESCAPES: Record<string, string> = {
  t: '\t',
  n: '\n',
  r: '\r',
  b: '\b',
  f: '\f',
  '"': '"',
  '\'': '\'',
  '\\': '\\',
};
const NUMBER = /^(?:\d+\.\d*(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?|\d+[eE][+-]?\d+|\d+)/u;
// eslint-disable-next-line no-control-regex
const IRIREF = /^<([^\u0000- <>"{}|^`\\]*)>/u;
const PNAME = /^([A-Za-z](?:[\w.-]*[\w-])?)?:((?:[\w:-]|\.(?=[\w:.-]*[\w:-]))*)/u;
const VARNAME = /^[?$](\w+)/u;
const KEYWORD = /^[A-Za-z_]+/u;

type TokenType = 'iri' | 'pname' | 'var' | 'string' | 'number' | 'langtag' | 'keyword' | 'punct' | 'eof';
interface IToken {
  type: TokenType;
  value: string;
  // For pnames: the prefix
  prefix?: string;
  // For numbers: the datatype local name
  datatype?: string;
  // For + and -: if a number directly follows, forming a signed number
  signsNumber?: boolean;
}

/**
 * Prototype: a fast parser for a common subset of SPARQL SELECT queries, that directly produces algebra
 * that is identical to the one of the regular traqula-based parser and toAlgebra.
 */
export class FastSparqlParser {
  private readonly factory: AlgebraFactory;
  private tokens: IToken[] = [];
  private index = 0;
  private prefixes: Record<string, string> = {};
  private variables = new Set<string>();
  private varCount = 0;

  public constructor(private readonly dataFactory: ComunicaDataFactory) {
    this.factory = new AlgebraFactory(dataFactory);
  }

  /**
   * Parse a query into algebra.
   * @param query A SPARQL query string.
   * @param defaultPrefixes Default prefixes.
   * @throws FastParserFallbackError If the query is not supported.
   */
  public parse(query: string, defaultPrefixes: Record<string, string> | undefined): Algebra.Operation {
    this.tokens = FastSparqlParser.tokenize(query);
    this.index = 0;
    this.prefixes = { ...defaultPrefixes };
    this.variables = new Set(this.tokens.filter(token => token.type === 'var').map(token => token.value));
    this.varCount = 0;
    const operation = this.parseQuery();
    // Mark the operation, so that the query processor can use a lean optimization pipeline
    Object.defineProperty(operation, Symbol.for('comunica.prototype.fastParsed'), { value: true });
    return operation;
  }

  // ---------- Lexer ----------

  public static tokenize(query: string): IToken[] {
    const tokens: IToken[] = [];
    let i = 0;
    const length = query.length;
    while (i < length) {
      const char = query[i];
      if (char === ' ' || char === '\n' || char === '\t' || char === '\r') {
        i++;
        continue;
      }
      if (char === '#') {
        while (i < length && query[i] !== '\n') {
          i++;
        }
        continue;
      }
      const rest = query.slice(i, i + 4096);
      let match: RegExpExecArray | null;
      if (char === '<') {
        match = IRIREF.exec(rest);
        if (match) {
          tokens.push({ type: 'iri', value: match[1] });
          i += match[0].length;
          continue;
        }
        if (query[i + 1] === '<') {
          throw new FastParserFallbackError('Triple terms');
        }
        tokens.push({ type: 'punct', value: query[i + 1] === '=' ? '<=' : '<' });
        i += query[i + 1] === '=' ? 2 : 1;
        continue;
      }
      if (char === '?' || char === '$') {
        match = VARNAME.exec(rest);
        if (match) {
          tokens.push({ type: 'var', value: match[1] });
          i += match[0].length;
          continue;
        }
        if (char === '$') {
          throw new FastParserFallbackError('Unexpected $');
        }
        tokens.push({ type: 'punct', value: '?' });
        i++;
        continue;
      }
      if (char === '"' || char === '\'') {
        if (query.startsWith(char.repeat(3), i)) {
          throw new FastParserFallbackError('Long strings');
        }
        let value = '';
        let j = i + 1;
        for (;;) {
          const next = query[j];
          if (next === undefined || next === '\n' || next === '\r') {
            throw new FastParserFallbackError('Unterminated string');
          }
          if (next === char) {
            break;
          }
          if (next === '\\') {
            const escaped = query[j + 1];
            const replacement = ESCAPES[escaped];
            if (replacement === undefined) {
              throw new FastParserFallbackError('Unsupported escape');
            }
            value += replacement;
            j += 2;
            continue;
          }
          value += next;
          j++;
        }
        tokens.push({ type: 'string', value });
        i = j + 1;
        continue;
      }
      if (char === '@') {
        match = /^@([A-Za-z]+(?:-[A-Za-z0-9]+)*)/u.exec(rest);
        if (!match || match[1] !== match[1].toLowerCase()) {
          throw new FastParserFallbackError('Unsupported language tag');
        }
        tokens.push({ type: 'langtag', value: match[1] });
        i += match[0].length;
        continue;
      }
      if (char === '.' && query[i + 1] >= '0' && query[i + 1] <= '9') {
        throw new FastParserFallbackError('Numbers starting with a dot');
      }
      if (char >= '0' && char <= '9') {
        match = NUMBER.exec(rest)!;
        const lexical = match[0];
        const datatype = /[eE]/u.test(lexical) ? 'double' : (lexical.includes('.') ? 'decimal' : 'integer');
        if (lexical.endsWith('.') && datatype === 'decimal') {
          // A trailing dot ends a triple, as in `?s ?p 5.`
          tokens.push({ type: 'number', value: lexical.slice(0, -1), datatype: 'integer' });
          tokens.push({ type: 'punct', value: '.' });
        } else {
          tokens.push({ type: 'number', value: lexical, datatype });
        }
        i += lexical.length;
        continue;
      }
      if (/[A-Za-z:]/u.test(char)) {
        match = PNAME.exec(rest);
        if (match) {
          if (/[\\%]/u.test(query[i + match[0].length] ?? '')) {
            throw new FastParserFallbackError('Escaped local names');
          }
          tokens.push({ type: 'pname', prefix: match[1] ?? '', value: match[2] });
          i += match[0].length;
          continue;
        }
        match = KEYWORD.exec(rest)!;
        tokens.push({ type: 'keyword', value: match[0] });
        i += match[0].length;
        continue;
      }
      const two = query.slice(i, i + 2);
      if (two === '&&' || two === '||' || two === '!=' || two === '>=' || two === '^^') {
        tokens.push({ type: 'punct', value: two });
        i += 2;
        continue;
      }
      if ('{}()[].;,|/^*+!=>-'.includes(char)) {
        const next = query[i + 1];
        const signsNumber = (char === '+' || char === '-') && next >= '0' && next <= '9';
        tokens.push(signsNumber ? { type: 'punct', value: char, signsNumber } : { type: 'punct', value: char });
        i++;
        continue;
      }
      throw new FastParserFallbackError(`Unsupported character ${char}`);
    }
    tokens.push({ type: 'eof', value: '' });
    return tokens;
  }

  // ---------- Token helpers ----------

  private peek(offset = 0): IToken {
    return this.tokens[this.index + offset];
  }

  private isKeyword(name: string, offset = 0): boolean {
    const token = this.peek(offset);
    return token.type === 'keyword' && token.value.toUpperCase() === name;
  }

  private isPunct(value: string, offset = 0): boolean {
    const token = this.peek(offset);
    return token.type === 'punct' && token.value === value;
  }

  private expectKeyword(name: string): void {
    if (!this.isKeyword(name)) {
      throw new FastParserFallbackError(`Expected ${name}`);
    }
    this.index++;
  }

  private expectPunct(value: string): void {
    if (!this.isPunct(value)) {
      throw new FastParserFallbackError(`Expected ${value}`);
    }
    this.index++;
  }

  // ---------- Query ----------

  private parseQuery(): Algebra.Operation {
    while (this.isKeyword('PREFIX')) {
      this.index++;
      const prefix = this.peek();
      const iri = this.peek(1);
      if (prefix.type !== 'pname' || prefix.value !== '' || iri.type !== 'iri') {
        throw new FastParserFallbackError('Invalid prefix');
      }
      this.prefixes[prefix.prefix!] = this.resolveIri(iri.value);
      this.index += 2;
    }
    this.expectKeyword('SELECT');
    let distinct = false;
    if (this.isKeyword('DISTINCT')) {
      distinct = true;
      this.index++;
    }
    const projected: RDF.Variable[] = [];
    while (this.peek().type === 'var') {
      projected.push(this.dataFactory.variable(this.peek().value));
      this.index++;
    }
    if (projected.length === 0) {
      throw new FastParserFallbackError('Unsupported projection');
    }
    if (this.isKeyword('WHERE')) {
      this.index++;
    }
    let result = this.parseGroup();

    if (this.isKeyword('ORDER')) {
      this.index++;
      this.expectKeyword('BY');
      const expressions: Algebra.Expression[] = [];
      for (;;) {
        if (this.isKeyword('ASC') || this.isKeyword('DESC')) {
          const descending = this.isKeyword('DESC');
          this.index++;
          const expression = this.parseBracketted();
          expressions.push(descending ? this.factory.createOperatorExpression('desc', [ expression ]) : expression);
        } else if (this.peek().type === 'var') {
          expressions.push(this.factory.createTermExpression(this.dataFactory.variable(this.peek().value)));
          this.index++;
        } else if (this.isPunct('(') || this.isBuiltinCall()) {
          expressions.push(this.parseConstraint());
        } else {
          break;
        }
      }
      if (expressions.length === 0) {
        throw new FastParserFallbackError('Empty ORDER BY');
      }
      result = this.factory.createOrderBy(result, expressions);
    }
    let limit: number | undefined;
    let offset: number | undefined;
    for (let i = 0; i < 2; i++) {
      if (this.isKeyword('LIMIT') && limit === undefined) {
        this.index++;
        limit = this.parseInteger();
      } else if (this.isKeyword('OFFSET') && offset === undefined) {
        this.index++;
        offset = this.parseInteger();
      }
    }
    if (this.peek().type !== 'eof') {
      throw new FastParserFallbackError('Unsupported trailing input');
    }

    result = this.factory.createProject(result, projected);
    if (distinct) {
      result = this.factory.createDistinct(result);
    }
    if (limit !== undefined || offset) {
      result = this.factory.createSlice(result, offset ?? 0, limit);
    }
    return result;
  }

  private parseInteger(): number {
    const token = this.peek();
    if (token.type !== 'number' || token.datatype !== 'integer') {
      throw new FastParserFallbackError('Expected integer');
    }
    this.index++;
    return Number.parseInt(token.value, 10);
  }

  // ---------- Graph patterns ----------

  private parseGroup(): Algebra.Operation {
    this.expectPunct('{');
    if (this.isKeyword('SELECT')) {
      throw new FastParserFallbackError('Subqueries');
    }
    const filters: Algebra.Expression[] = [];
    let result: Algebra.Operation = this.factory.createBgp([]);
    while (!this.isPunct('}')) {
      if (this.isKeyword('FILTER')) {
        this.index++;
        filters.push(this.parseConstraint());
      } else if (this.isKeyword('OPTIONAL')) {
        this.index++;
        const hasFilter = this.groupHasDirectFilter();
        const group = this.parseGroup();
        result = hasFilter && group.type === 'filter' ?
          this.factory.createLeftJoin(result, (<Algebra.Filter> group).input, (<Algebra.Filter> group).expression) :
          this.factory.createLeftJoin(result, group);
      } else if (this.isKeyword('BIND')) {
        this.index++;
        this.expectPunct('(');
        const expression = this.parseExpression();
        this.expectKeyword('AS');
        const variable = this.peek();
        if (variable.type !== 'var') {
          throw new FastParserFallbackError('Expected variable');
        }
        this.index++;
        this.expectPunct(')');
        // Binding an in-scope variable is invalid (SPARQL note 13), which the regular parser reports
        if (algebraUtils.inScopeVariables(result).some(inScope => inScope.value === variable.value)) {
          throw new FastParserFallbackError('BIND to an in-scope variable');
        }
        result = this.factory.createExtend(result, this.dataFactory.variable(variable.value), expression);
      } else if (this.isPunct('{')) {
        const groups = [ this.parseGroup() ];
        while (this.isKeyword('UNION')) {
          this.index++;
          groups.push(this.parseGroup());
        }
        result = this.simplifiedJoin(result, groups.length === 1 ? groups[0] : this.factory.createUnion(groups));
      } else if (this.peek().type === 'keyword' && !this.isKeyword('A')) {
        throw new FastParserFallbackError(`Unsupported keyword ${this.peek().value}`);
      } else {
        result = this.simplifiedJoin(result, this.parseTriplesBlock());
      }
      if (this.isPunct('.')) {
        this.index++;
      }
    }
    this.index++;
    if (filters.length > 0) {
      let conjunction = filters[0];
      for (const expression of filters.slice(1)) {
        conjunction = this.factory.createOperatorExpression('&&', [ conjunction, expression ]);
      }
      result = this.factory.createFilter(result, conjunction);
    }
    return result;
  }

  /**
   * Check if the group starting at the current token directly contains a FILTER.
   */
  private groupHasDirectFilter(): boolean {
    let depth = 0;
    for (let i = this.index; i < this.tokens.length; i++) {
      const token = this.tokens[i];
      if (token.type === 'punct' && (token.value === '{' || token.value === '(')) {
        depth++;
      } else if (token.type === 'punct' && (token.value === '}' || token.value === ')')) {
        depth--;
        if (depth === 0) {
          return false;
        }
      } else if (depth === 1 && token.type === 'keyword' && token.value.toUpperCase() === 'FILTER') {
        return true;
      }
    }
    return false;
  }

  private simplifiedJoin(G: Algebra.Operation, A: Algebra.Operation): Algebra.Operation {
    if (G.type === 'bgp' && A.type === 'bgp') {
      return this.factory.createBgp([ ...(<Algebra.Bgp> G).patterns, ...(<Algebra.Bgp> A).patterns ]);
    }
    if (G.type === 'bgp' && (<Algebra.Bgp> G).patterns.length === 0) {
      return A;
    }
    if (A.type === 'bgp' && (<Algebra.Bgp> A).patterns.length === 0) {
      return G;
    }
    return this.factory.createJoin([ G, A ]);
  }

  /**
   * Parse consecutive triples into a BGP, with property paths as separate path operations.
   */
  private parseTriplesBlock(): Algebra.Operation {
    const joins: Algebra.Operation[] = [];
    let patterns: Algebra.Pattern[] = [];
    const add = (subject: RDF.Term, path: Algebra.Operation | RDF.NamedNode | RDF.Variable, object: RDF.Term): void => {
      if ('termType' in path) {
        patterns.push(this.factory.createPattern(subject, path, object, this.dataFactory.defaultGraph()));
        return;
      }
      for (const part of this.simplifyPath(subject, path, object)) {
        if (part.type === 'path') {
          if (patterns.length > 0) {
            joins.push(this.factory.createBgp(patterns));
          }
          patterns = [];
          joins.push(part);
        } else {
          patterns.push(<Algebra.Pattern> part);
        }
      }
    };
    for (;;) {
      const subject = this.parseTerm(false);
      for (;;) {
        const verb = this.parseVerb();
        for (;;) {
          add(subject, verb, this.parseTerm(true));
          if (!this.isPunct(',')) {
            break;
          }
          this.index++;
        }
        if (!this.isPunct(';')) {
          break;
        }
        while (this.isPunct(';')) {
          this.index++;
        }
        if (this.isPunct('.') || this.isPunct('}')) {
          break;
        }
      }
      // Continue the block after a dot if more triples follow
      if (this.isPunct('.') && this.startsTriple(1)) {
        this.index++;
        continue;
      }
      break;
    }
    if (patterns.length > 0) {
      joins.push(this.factory.createBgp(patterns));
    }
    return joins.length === 1 ? joins[0] : this.factory.createJoin(joins);
  }

  private startsTriple(offset: number): boolean {
    const token = this.peek(offset);
    return token.type === 'var' || token.type === 'iri' || token.type === 'pname' ||
      token.type === 'string' || token.type === 'number';
  }

  private parseVerb(): Algebra.Operation | RDF.NamedNode | RDF.Variable {
    if (this.peek().type === 'var') {
      const variable = this.dataFactory.variable(this.peek().value);
      this.index++;
      return variable;
    }
    const path = this.parsePathAlternative();
    // Plain IRIs are not paths
    return path.type === 'link' ? (<Algebra.Link> path).iri : path;
  }

  private parsePathAlternative(): Algebra.Operation {
    const items = [ this.parsePathSequence() ];
    while (this.isPunct('|')) {
      this.index++;
      items.push(this.parsePathSequence());
    }
    return items.length === 1 ? items[0] : this.factory.createAlt(items);
  }

  private parsePathSequence(): Algebra.Operation {
    const items = [ this.parsePathEltOrInverse() ];
    while (this.isPunct('/')) {
      this.index++;
      items.push(this.parsePathEltOrInverse());
    }
    return items.length === 1 ? items[0] : this.factory.createSeq(items);
  }

  private parsePathEltOrInverse(): Algebra.Operation {
    if (this.isPunct('^')) {
      this.index++;
      return this.factory.createInv(this.parsePathElt());
    }
    return this.parsePathElt();
  }

  private parsePathElt(): Algebra.Operation {
    let primary: Algebra.Operation;
    if (this.isPunct('(')) {
      this.index++;
      primary = this.parsePathAlternative();
      this.expectPunct(')');
    } else if (this.isKeyword('A') && this.peek().value === 'a') {
      this.index++;
      primary = this.factory.createLink(this.dataFactory.namedNode(RDF_TYPE));
    } else {
      const token = this.peek();
      if (token.type !== 'iri' && token.type !== 'pname') {
        throw new FastParserFallbackError('Unsupported path');
      }
      primary = this.factory.createLink(this.parseIri());
    }
    if (this.isPunct('*')) {
      this.index++;
      return this.factory.createZeroOrMorePath(primary);
    }
    if (this.isPunct('+')) {
      this.index++;
      return this.factory.createOneOrMorePath(primary);
    }
    if (this.isPunct('?')) {
      this.index++;
      return this.factory.createZeroOrOnePath(primary);
    }
    return primary;
  }

  /**
   * Translate a path triple into patterns and path operations, as toAlgebra's simplifyPath.
   */
  private simplifyPath(subject: RDF.Term, predicate: Algebra.Operation, object: RDF.Term): Algebra.Operation[] {
    if (predicate.type === 'link') {
      const iri = (<Algebra.Link> predicate).iri;
      return [ this.factory.createPattern(subject, iri, object, this.dataFactory.defaultGraph()) ];
    }
    if (predicate.type === 'inv') {
      return this.simplifyPath(object, (<Algebra.Inv> predicate).path, subject);
    }
    if (predicate.type === 'seq') {
      let iter = subject;
      const result: Algebra.Operation[] = [];
      const input = (<Algebra.Seq> predicate).input;
      for (const pathOfSeq of input.slice(0, -1)) {
        const joinVar = this.generateFreshVar();
        result.push(...this.simplifyPath(iter, pathOfSeq, joinVar));
        iter = joinVar;
      }
      result.push(...this.simplifyPath(iter, input.at(-1)!, object));
      return result;
    }
    return [ this.factory.createPath(subject, predicate, object, this.dataFactory.defaultGraph()) ];
  }

  private generateFreshVar(): RDF.Variable {
    let name = `var${this.varCount++}`;
    while (this.variables.has(name)) {
      name = `var${this.varCount++}`;
    }
    this.variables.add(name);
    return this.dataFactory.variable(name);
  }

  // ---------- Terms ----------

  private parseIri(): RDF.NamedNode {
    const token = this.peek();
    this.index++;
    if (token.type === 'iri') {
      return this.dataFactory.namedNode(this.resolveIri(token.value));
    }
    if (token.type === 'pname') {
      const namespace = this.prefixes[token.prefix!];
      if (namespace === undefined) {
        throw new FastParserFallbackError('Unknown prefix');
      }
      return this.dataFactory.namedNode(this.resolveIri(namespace + token.value));
    }
    throw new FastParserFallbackError('Expected IRI');
  }

  private resolveIri(iri: string): string {
    if (!/^[A-Za-z][\w+.-]*:/u.test(iri)) {
      throw new FastParserFallbackError('Relative IRIs');
    }
    return iri;
  }

  private parseTerm(allowLiterals: boolean): RDF.Term {
    const token = this.peek();
    if (token.type === 'var') {
      this.index++;
      return this.dataFactory.variable(token.value);
    }
    if (token.type === 'iri' || token.type === 'pname') {
      return this.parseIri();
    }
    if (allowLiterals) {
      const literal = this.parseLiteral();
      if (literal) {
        return literal;
      }
    }
    throw new FastParserFallbackError('Unsupported term');
  }

  private parseLiteral(): RDF.Literal | undefined {
    const token = this.peek();
    if (token.type === 'string') {
      this.index++;
      if (this.peek().type === 'langtag') {
        const language = this.peek().value;
        this.index++;
        return this.dataFactory.literal(token.value, language);
      }
      if (this.isPunct('^^')) {
        this.index++;
        return this.dataFactory.literal(token.value, this.parseIri());
      }
      return this.dataFactory.literal(token.value);
    }
    if (token.type === 'number') {
      this.index++;
      return this.dataFactory.literal(token.value, this.dataFactory.namedNode(`${XSD}${token.datatype}`));
    }
    if (this.isPunct('-') && this.peek().signsNumber) {
      const number = this.peek(1);
      this.index += 2;
      return this.dataFactory.literal(`-${number.value}`, this.dataFactory.namedNode(`${XSD}${number.datatype}`));
    }
    if (token.type === 'keyword' && (token.value === 'true' || token.value === 'false')) {
      this.index++;
      return this.dataFactory.literal(token.value, this.dataFactory.namedNode(`${XSD}boolean`));
    }
    return undefined;
  }

  // ---------- Expressions ----------

  private isBuiltinCall(): boolean {
    return this.peek().type === 'keyword' && BUILTINS.has(this.peek().value.toLowerCase()) && this.isPunct('(', 1);
  }

  private parseConstraint(): Algebra.Expression {
    if (this.isPunct('(')) {
      return this.parseBracketted();
    }
    if (this.isBuiltinCall()) {
      return this.parsePrimary();
    }
    if ((this.peek().type === 'iri' || this.peek().type === 'pname') && this.isPunct('(', 1)) {
      return this.parsePrimary();
    }
    throw new FastParserFallbackError('Unsupported constraint');
  }

  private parseBracketted(): Algebra.Expression {
    this.expectPunct('(');
    const expression = this.parseExpression();
    this.expectPunct(')');
    return expression;
  }

  private parseExpression(): Algebra.Expression {
    let left = this.parseAnd();
    while (this.isPunct('||')) {
      this.index++;
      left = this.factory.createOperatorExpression('||', [ left, this.parseAnd() ]);
    }
    return left;
  }

  private parseAnd(): Algebra.Expression {
    let left = this.parseRelational();
    while (this.isPunct('&&')) {
      this.index++;
      left = this.factory.createOperatorExpression('&&', [ left, this.parseRelational() ]);
    }
    return left;
  }

  private parseRelational(): Algebra.Expression {
    const left = this.parseAdditive();
    for (const operator of [ '=', '!=', '<', '>', '<=', '>=' ]) {
      if (this.isPunct(operator)) {
        this.index++;
        return this.factory.createOperatorExpression(operator, [ left, this.parseAdditive() ]);
      }
    }
    const negated = this.isKeyword('NOT') && this.isKeyword('IN', 1);
    if (negated || this.isKeyword('IN')) {
      this.index += negated ? 2 : 1;
      this.expectPunct('(');
      const args = [ left ];
      if (!this.isPunct(')')) {
        args.push(this.parseExpression());
        while (this.isPunct(',')) {
          this.index++;
          args.push(this.parseExpression());
        }
      }
      this.expectPunct(')');
      return this.factory.createOperatorExpression(negated ? 'notin' : 'in', args);
    }
    return left;
  }

  private parseAdditive(): Algebra.Expression {
    let left = this.parseMultiplicative();
    for (;;) {
      if (this.isPunct('+') || this.isPunct('-')) {
        // Signed numbers directly after an operand have special grammar rules
        if (this.peek().signsNumber) {
          throw new FastParserFallbackError('Signed numbers in additive expressions');
        }
        const operator = this.peek().value;
        this.index++;
        left = this.factory.createOperatorExpression(operator, [ left, this.parseMultiplicative() ]);
      } else {
        return left;
      }
    }
  }

  private parseMultiplicative(): Algebra.Expression {
    let left = this.parseUnary();
    while (this.isPunct('*') || this.isPunct('/')) {
      const operator = this.peek().value;
      this.index++;
      left = this.factory.createOperatorExpression(operator, [ left, this.parseUnary() ]);
    }
    return left;
  }

  private parseUnary(): Algebra.Expression {
    if (this.isPunct('!')) {
      this.index++;
      return this.factory.createOperatorExpression('!', [ this.parsePrimary() ]);
    }
    if (this.isPunct('-') && !this.peek().signsNumber) {
      this.index++;
      return this.factory.createOperatorExpression('uminus', [ this.parsePrimary() ]);
    }
    if (this.isPunct('+')) {
      throw new FastParserFallbackError('Unary plus or positive numbers');
    }
    return this.parsePrimary();
  }

  private parsePrimary(): Algebra.Expression {
    const token = this.peek();
    if (this.isPunct('(')) {
      return this.parseBracketted();
    }
    if (this.isBuiltinCall()) {
      const name = token.value.toLowerCase();
      this.index += 2;
      const args: Algebra.Expression[] = [];
      if (!this.isPunct(')')) {
        args.push(this.parseExpression());
        while (this.isPunct(',')) {
          this.index++;
          args.push(this.parseExpression());
        }
      }
      this.expectPunct(')');
      return this.factory.createOperatorExpression(name, args);
    }
    if (token.type === 'var') {
      this.index++;
      return this.factory.createTermExpression(this.dataFactory.variable(token.value));
    }
    if (token.type === 'iri' || token.type === 'pname') {
      const iri = this.parseIri();
      if (!this.isPunct('(')) {
        return this.factory.createTermExpression(iri);
      }
      this.index++;
      if (this.isKeyword('DISTINCT')) {
        throw new FastParserFallbackError('DISTINCT in function call');
      }
      const args: Algebra.Expression[] = [];
      if (!this.isPunct(')')) {
        args.push(this.parseExpression());
        while (this.isPunct(',')) {
          this.index++;
          args.push(this.parseExpression());
        }
      }
      this.expectPunct(')');
      return this.factory.createNamedExpression(iri, args);
    }
    const literal = this.parseLiteral();
    if (literal) {
      return this.factory.createTermExpression(literal);
    }
    throw new FastParserFallbackError(`Unsupported expression at ${token.value}`);
  }
}
