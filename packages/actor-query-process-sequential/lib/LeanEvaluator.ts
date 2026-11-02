import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import type {
  BindingsStream,
  ComunicaDataFactory,
  IActionContext,
  IQueryOperationResultBindings,
  IQuerySource,
  IQuerySourceWrapper,
  ITermComparator,
  MetadataVariable,
} from '@comunica/types';
import { Algebra, AlgebraFactory, algebraUtils } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import { RAW_ROWS } from './LeanBgpEvaluator';
import type { IRawRows } from './LeanBgpEvaluator';

type Row = Record<string, RDF.Term>;

/**
 * Thrown when lean evaluation does not apply, after which the regular query process is used.
 */
class FallbackError extends Error {}

/**
 * A triple pattern or property path in a group of joined operations, or another operation in such a group.
 */
interface IItem {
  subject?: RDF.Term;
  predicates?: RDF.Term[];
  object?: RDF.Term;
  path?: Algebra.Operation;
  operation?: Algebra.Operation;
  variables: string[];
  /**
   * If other patterns in the group have the same subject, so that its quads can be read at once.
   */
  star?: boolean;
}

interface IState {
  source: IQuerySource;
  context: IActionContext;
  algebraFactory: AlgebraFactory;
  dataFactory: ComunicaDataFactory;
  work: number;
  /**
   * Quads of items with a constant subject, read while estimating their cardinality, per predicate.
   */
  reads: Map<IItem, RDF.Quad[][]>;
  /**
   * Quads of subjects of star patterns by predicate, or null for subjects with too many quads.
   */
  subjects: Map<string, Map<string, RDF.Quad[]> | null>;
}

/**
 * Prototype: evaluates selective SELECT queries over a single source with synchronous lookups,
 * as nested loops over plain row objects, without operation mediation, iterators, or bindings.
 * Supports basic graph patterns, property paths, OPTIONAL, UNION, BIND with terms and COALESCE,
 * ORDER BY on variables, DISTINCT, and LIMIT/OFFSET.
 * Returns undefined for other queries, or when evaluation exceeds its budget.
 */
export class LeanEvaluator {
  /**
   * The maximum number of quads of a subject to read at once for star patterns.
   */
  public static readonly MAX_SUBJECT_QUADS = 256;

  private readonly certainCache = new WeakMap<Algebra.Operation, Set<string>>();
  private readonly variablesCache = new WeakMap<Algebra.Operation, Set<string>>();
  private readonly itemsCache = new WeakMap<Algebra.Operation, IItem[]>();
  private readonly countCache = new WeakMap<IItem, number>();
  private readonly orderCache = new WeakMap<IItem[], Map<string, IItem[]>>();

  public constructor(
    private readonly maxWork = 200_000,
    private readonly maxStartCardinality = 1_000,
  ) {}

  /**
   * Check if the operation has a supported shape.
   * @param operation A parsed operation.
   */
  public static isSupported(operation: Algebra.Operation): boolean {
    let current = operation;
    if (algebraUtils.isKnownOperation(current, Algebra.Types.SLICE)) {
      current = current.input;
    }
    if (algebraUtils.isKnownOperation(current, Algebra.Types.DISTINCT)) {
      current = current.input;
    }
    if (!algebraUtils.isKnownOperation(current, Algebra.Types.PROJECT)) {
      return false;
    }
    current = current.input;
    if (algebraUtils.isKnownOperation(current, Algebra.Types.ORDER_BY)) {
      if (!current.expressions.every(expression => LeanEvaluator.getSortVariable(expression))) {
        return false;
      }
      current = current.input;
    }
    return LeanEvaluator.isSupportedPattern(current);
  }

  public static isSupportedPattern(operation: Algebra.Operation): boolean {
    if (algebraUtils.isKnownOperation(operation, Algebra.Types.BGP)) {
      return operation.patterns.every(pattern => LeanEvaluator.isSupportedPattern(pattern));
    }
    if (algebraUtils.isKnownOperation(operation, Algebra.Types.JOIN) ||
      algebraUtils.isKnownOperation(operation, Algebra.Types.UNION)) {
      return !('expression' in operation) &&
        operation.input.every(input => LeanEvaluator.isSupportedPattern(input));
    }
    if (algebraUtils.isKnownOperation(operation, Algebra.Types.PATTERN)) {
      return operation.graph.termType === 'DefaultGraph' &&
        [ operation.subject, operation.predicate, operation.object ].every(term => LeanEvaluator.isSupportedTerm(term));
    }
    if (algebraUtils.isKnownOperation(operation, Algebra.Types.PATH)) {
      return operation.graph.termType === 'DefaultGraph' && LeanEvaluator.isSupportedTerm(operation.subject) &&
        LeanEvaluator.isSupportedTerm(operation.object) && LeanEvaluator.isSupportedPath(operation.predicate);
    }
    if (algebraUtils.isKnownOperation(operation, Algebra.Types.LEFT_JOIN)) {
      return !operation.expression && operation.input.every(input => LeanEvaluator.isSupportedPattern(input));
    }
    if (algebraUtils.isKnownOperation(operation, Algebra.Types.EXTEND)) {
      return LeanEvaluator.isSupportedExpression(operation.expression) &&
        LeanEvaluator.isSupportedPattern(operation.input);
    }
    return false;
  }

  public static isSupportedTerm(term: RDF.Term): boolean {
    return term.termType !== 'Quad' && term.termType !== 'BlankNode';
  }

  public static isSupportedPath(path: Algebra.Operation): boolean {
    switch (path.type) {
      case Algebra.Types.LINK:
        return true;
      case Algebra.Types.INV:
      case Algebra.Types.ZERO_OR_MORE_PATH:
      case Algebra.Types.ONE_OR_MORE_PATH:
      case Algebra.Types.ZERO_OR_ONE_PATH:
        return LeanEvaluator.isSupportedPath((<any> path).path);
      case Algebra.Types.SEQ:
      case Algebra.Types.ALT:
        return (<Algebra.Operation[]> (<any> path).input).every(input => LeanEvaluator.isSupportedPath(input));
      default:
        return false;
    }
  }

  public static isSupportedExpression(expression: Algebra.Expression): boolean {
    if (algebraUtils.isKnownSubType(expression, Algebra.ExpressionTypes.TERM)) {
      return LeanEvaluator.isSupportedTerm(expression.term);
    }
    if (algebraUtils.isKnownSubType(expression, Algebra.ExpressionTypes.OPERATOR)) {
      return expression.operator === 'coalesce' &&
        expression.args.every(arg => LeanEvaluator.isSupportedExpression(arg));
    }
    return false;
  }

  /**
   * The variable an ORDER BY expression sorts on, or undefined if it is not a plain variable.
   */
  public static getSortVariable(expression: Algebra.Expression): { variable: string; ascending: boolean } | undefined {
    let ascending = true;
    if (algebraUtils.isKnownSubType(expression, Algebra.ExpressionTypes.OPERATOR) && expression.operator === 'desc') {
      ascending = false;
      expression = expression.args[0];
    }
    if (algebraUtils.isKnownSubType(expression, Algebra.ExpressionTypes.TERM) &&
      expression.term.termType === 'Variable') {
      return { variable: expression.term.value, ascending };
    }
  }

  /**
   * Check if the query sorts its results.
   * @param operation A supported operation.
   */
  public static needsComparator(operation: Algebra.Operation): boolean {
    return algebraUtils.hasOperationType(operation, [ Algebra.Types.ORDER_BY ]);
  }

  /**
   * Evaluate the given query, or return undefined if it can not be evaluated cheaply.
   * @param operation A supported operation.
   * @param context A context with identified query sources.
   * @param comparator A term comparator, required for queries with ORDER BY.
   */
  public evaluate(
    operation: Algebra.Operation,
    context: IActionContext,
    comparator?: ITermComparator,
  ): IQueryOperationResultBindings | undefined {
    const sources: IQuerySourceWrapper[] | undefined = context.get(KeysQueryOperation.querySources);
    if (sources?.length !== 1 || !sources[0].source.readQuadsSynchronous) {
      return;
    }
    const dataFactory: ComunicaDataFactory = context.getSafe(KeysInitQuery.dataFactory);
    const state: IState = {
      source: sources[0].source,
      context: sources[0].context ? context.merge(sources[0].context) : context,
      algebraFactory: new AlgebraFactory(dataFactory),
      dataFactory,
      work: 0,
      reads: new Map(),
      subjects: new Map(),
    };

    // Unwrap the solution modifiers
    let slice: Algebra.Slice | undefined;
    let distinct = false;
    let current = operation;
    if (algebraUtils.isKnownOperation(current, Algebra.Types.SLICE)) {
      slice = current;
      current = current.input;
    }
    if (algebraUtils.isKnownOperation(current, Algebra.Types.DISTINCT)) {
      distinct = true;
      current = current.input;
    }
    const project = <Algebra.Project> current;
    current = project.input;
    let sortKeys: { variable: string; ascending: boolean }[] | undefined;
    if (algebraUtils.isKnownOperation(current, Algebra.Types.ORDER_BY)) {
      if (!comparator) {
        return;
      }
      sortKeys = current.expressions.map(expression => LeanEvaluator.getSortVariable(expression)!);
      current = current.input;
    }

    const pattern = current;
    let rows: Row[];
    try {
      rows = this.evaluatePattern(pattern, {}, state);
    } catch (error: unknown) {
      if (error instanceof FallbackError) {
        return;
      }
      throw error;
    }

    if (sortKeys) {
      const keys = sortKeys;
      rows = rows
        .map((row, index) => ({ row, index }))
        .sort((left, right) => {
          for (const { variable, ascending } of keys) {
            const order = comparator!.orderTypes(left.row[variable], right.row[variable]);
            if (order !== 0) {
              return ascending ? order : -order;
            }
          }
          return left.index - right.index;
        })
        .map(({ row }) => row);
    }
    const variables = project.variables.map(variable => variable.value);
    rows = rows.map((row) => {
      const result: Row = {};
      for (const variable of variables) {
        const value = row[variable];
        if (value) {
          result[variable] = value;
        }
      }
      return result;
    });
    if (distinct) {
      const seen = new Set<string>();
      rows = rows.filter((row) => {
        const key = variables.map(variable => LeanEvaluator.termKey(row[variable])).join('\u0000');
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
    }
    if (slice) {
      rows = rows.slice(slice.start, slice.length === undefined ? undefined : slice.start + slice.length);
    }

    const certain = this.getCertainVariables(pattern);
    const bindingsFactory = new BindingsFactory(dataFactory);
    const metadataVariables: MetadataVariable[] = project.variables
      .map(variable => ({ variable, canBeUndef: !certain.has(variable.value) }));
    const result: IQueryOperationResultBindings = {
      type: 'bindings',
      bindingsStream: <BindingsStream> <unknown> new ArrayIterator(rows, { autoStart: false })
        .map(values => bindingsFactory.bindings(Object.entries(values)
          .map(([ key, value ]): [RDF.Variable, RDF.Term] => [ dataFactory.variable(key), value ]))),
      metadata: async() => ({
        state: new MetadataValidationState(),
        cardinality: { type: 'exact', value: rows.length },
        variables: metadataVariables,
      }),
    };
    (<any> result)[RAW_ROWS] = <IRawRows> { variables, rows };
    return result;
  }

  /**
   * Evaluate a graph pattern, extending the given row.
   * Operations are evaluated with the bindings of the row substituted (bind join),
   * which is only done when that gives the same results as joining afterwards.
   */
  public evaluatePattern(operation: Algebra.Operation, row: Row, state: IState): Row[] {
    switch (operation.type) {
      case Algebra.Types.LEFT_JOIN: {
        const [ left, right ] = (<Algebra.LeftJoin> operation).input;
        // Variables of the right side that are bound outside, but possibly not by the left side,
        // would make a bind join differ from a left join.
        this.assertSubstitutable(this.getVariables(right), row, this.getCertainVariables(left));
        const rows: Row[] = [];
        for (const leftRow of this.evaluatePattern(left, row, state)) {
          const rightRows = this.evaluatePattern(right, leftRow, state);
          if (rightRows.length > 0) {
            rows.push(...rightRows);
          } else {
            rows.push(leftRow);
          }
        }
        return this.count(rows, state);
      }
      case Algebra.Types.EXTEND: {
        const extend = <Algebra.Extend> operation;
        this.assertSubstitutable(
          LeanEvaluator.getExpressionVariables(extend.expression),
          row,
          this.getCertainVariables(extend.input),
        );
        const variable = extend.variable.value;
        const rows: Row[] = [];
        for (const inputRow of this.evaluatePattern(extend.input, row, state)) {
          const value = LeanEvaluator.evaluateExpression(extend.expression, inputRow);
          if (!value) {
            rows.push(inputRow);
          } else if (!inputRow[variable]) {
            rows.push({ ...inputRow, [variable]: value });
          } else if (inputRow[variable].equals(value)) {
            rows.push(inputRow);
          }
        }
        return rows;
      }
      case Algebra.Types.UNION:
        return this.count((<Algebra.Union> operation).input
          .flatMap(input => this.evaluatePattern(input, row, state)), state);
      default:
        return this.evaluateGroup(this.getItems(operation), row, state);
    }
  }

  /**
   * Evaluate a group of joined items as nested loops, in a greedy order.
   * Rows are extended in place and restored after each nested loop, and only copied for results.
   */
  public evaluateGroup(items: IItem[], row: Row, state: IState): Row[] {
    const ordered = this.orderItems(items, row, state);
    const rows: Row[] = [];
    const step = (index: number, current: Row): void => {
      if (index === ordered.length) {
        rows.push({ ...current });
        this.addWork(1, state);
        return;
      }
      const item = ordered[index];
      if (item.operation) {
        // Nested operations return new rows
        for (const next of this.evaluatePattern(item.operation, current, state)) {
          step(index + 1, next);
        }
        return;
      }
      const subject = LeanEvaluator.resolve(item.subject!, current);
      const object = LeanEvaluator.resolve(item.object!, current);
      const assigned: string[] = [];
      if (item.path) {
        for (const [ pathSubject, pathObject ] of this.evaluatePath(item.path, subject, object, state)) {
          if (LeanEvaluator.assign(current, subject, pathSubject, assigned) &&
            LeanEvaluator.assign(current, object, pathObject, assigned)) {
            step(index + 1, current);
          }
          LeanEvaluator.unassign(current, assigned);
        }
        return;
      }
      const reads = subject === item.subject && object === item.object ? state.reads.get(item) : undefined;
      for (const [ predicateIndex, predicate ] of item.predicates!.entries()) {
        const resolvedPredicate = LeanEvaluator.resolve(predicate, current);
        const quads = reads && resolvedPredicate === predicate ?
          reads[predicateIndex] :
          this.lookup(item, subject, resolvedPredicate, object, state);
        for (const quad of quads) {
          if (LeanEvaluator.assign(current, subject, quad.subject, assigned) &&
            LeanEvaluator.assign(current, resolvedPredicate, quad.predicate, assigned) &&
            LeanEvaluator.assign(current, object, quad.object, assigned)) {
            step(index + 1, current);
          }
          LeanEvaluator.unassign(current, assigned);
        }
      }
    };
    step(0, { ...row });
    return rows;
  }

  /**
   * Evaluate a property path, returning subject-object pairs with bag semantics for links, sequences,
   * alternatives, and inverses, and set semantics for the closures.
   * @param path A supported path.
   * @param subject The subject, or a variable if unbound.
   * @param object The object, or a variable if unbound.
   * @param state The evaluation state.
   */
  public evaluatePath(path: Algebra.Operation, subject: RDF.Term, object: RDF.Term, state: IState):
  [RDF.Term, RDF.Term][] {
    switch (path.type) {
      case Algebra.Types.LINK:
        return [ ...this.readQuads(subject, (<Algebra.Link> path).iri, object, state) ]
          .filter(quad => subject.termType !== 'Variable' || object.termType !== 'Variable' ||
            subject.value !== object.value || quad.subject.equals(quad.object))
          .map(quad => [ quad.subject, quad.object ]);
      case Algebra.Types.INV:
        return this.evaluatePath((<Algebra.Inv> path).path, object, subject, state)
          .map(([ left, right ]) => [ right, left ]);
      case Algebra.Types.ALT:
        return (<Algebra.Alt> path).input.flatMap(input => this.evaluatePath(input, subject, object, state));
      case Algebra.Types.SEQ: {
        const inputs = (<Algebra.Seq> path).input;
        if (subject.termType === 'Variable' && object.termType !== 'Variable') {
          // Evaluate backwards from the bound object
          const reversed: Algebra.Operation = state.algebraFactory.createSeq(
            [ ...inputs ].reverse().map(input => state.algebraFactory.createInv(<any> input)),
          );
          return this.evaluatePath(reversed, object, subject, state).map(([ left, right ]) => [ right, left ]);
        }
        if (subject.termType === 'Variable') {
          throw new FallbackError('Unbound sequence path');
        }
        let pairs: [RDF.Term, RDF.Term][] = [[ subject, subject ]];
        const intermediate = state.dataFactory.variable('__lean_seq');
        for (const [ index, input ] of inputs.entries()) {
          const last = index === inputs.length - 1;
          const next: [RDF.Term, RDF.Term][] = [];
          for (const [ start, middle ] of pairs) {
            for (const [ , end ] of this.evaluatePath(input, middle, last ? object : intermediate, state)) {
              next.push([ start, end ]);
            }
          }
          pairs = this.count(next, state);
        }
        return pairs;
      }
      case Algebra.Types.ZERO_OR_MORE_PATH:
      case Algebra.Types.ONE_OR_MORE_PATH:
      case Algebra.Types.ZERO_OR_ONE_PATH: {
        const inner = (<Algebra.ZeroOrMorePath> path).path;
        if (subject.termType === 'Variable' && object.termType !== 'Variable') {
          return this.evaluatePath(
            <Algebra.Operation> { ...path, path: state.algebraFactory.createInv(<any> inner) },
            object,
            subject,
            state,
          ).map(([ left, right ]) => [ right, left ]);
        }
        if (subject.termType === 'Variable') {
          throw new FallbackError('Unbound closure path');
        }
        const variable = state.dataFactory.variable('__lean_closure');
        const reached = new Map<string, RDF.Term>();
        let frontier: RDF.Term[] = [ subject ];
        if (path.type !== Algebra.Types.ONE_OR_MORE_PATH) {
          reached.set(LeanEvaluator.termKey(subject), subject);
        }
        const maxDepth = path.type === Algebra.Types.ZERO_OR_ONE_PATH ? 1 : Number.POSITIVE_INFINITY;
        for (let depth = 0; depth < maxDepth && frontier.length > 0; depth++) {
          const next: RDF.Term[] = [];
          for (const node of frontier) {
            for (const [ , end ] of this.evaluatePath(inner, node, variable, state)) {
              const key = LeanEvaluator.termKey(end);
              if (!reached.has(key)) {
                reached.set(key, end);
                next.push(end);
              } else if (path.type === Algebra.Types.ONE_OR_MORE_PATH && end.equals(subject)) {
                reached.set(key, end);
              }
            }
          }
          frontier = this.count(next, state);
        }
        const pairs: [RDF.Term, RDF.Term][] = [];
        for (const end of reached.values()) {
          if (object.termType === 'Variable' ?
            object.value !== subject.value || end.equals(subject) :
            end.equals(object)) {
            pairs.push([ subject, end ]);
          }
        }
        return pairs;
      }
      default:
        throw new FallbackError(`Unsupported path ${path.type}`);
    }
  }

  /**
   * Order items greedily: start from the item with the lowest cardinality,
   * then prefer items that share a bound variable, with a bound subject first.
   */
  public orderItems(items: IItem[], row: Row, state: IState): IItem[] {
    // The order only depends on which variables are bound
    const boundKey = Object.keys(row).join(' ');
    let orders = this.orderCache.get(items);
    if (!orders) {
      orders = new Map();
      this.orderCache.set(items, orders);
    }
    let ordered = orders.get(boundKey);
    if (!ordered) {
      ordered = this.computeOrder(items, row, state);
      orders.set(boundKey, ordered);
    }
    return ordered;
  }

  private computeOrder(items: IItem[], row: Row, state: IState): IItem[] {
    const bound = new Set(Object.keys(row));
    const remaining = [ ...items ];
    const ordered: IItem[] = [];
    while (remaining.length > 0) {
      const connected = remaining.filter(item => item.variables.some(variable => bound.has(variable)));
      const candidates = connected.length > 0 ? connected : remaining;
      let best = candidates[0];
      let bestRank = this.rank(best, bound, state);
      for (const candidate of candidates.slice(1)) {
        const rank = this.rank(candidate, bound, state);
        const better = connected.length > 0 ?
          rank[0] < bestRank[0] || (rank[0] === bestRank[0] && rank[1] < bestRank[1]) :
          rank[1] < bestRank[1];
        if (better) {
          best = candidate;
          bestRank = rank;
        }
      }
      if (connected.length === 0 && bestRank[1] > this.maxStartCardinality) {
        throw new FallbackError('Expensive start');
      }
      remaining.splice(remaining.indexOf(best), 1);
      ordered.push(best);
      const certain = best.operation ? this.getCertainVariables(best.operation) : best.variables;
      for (const variable of certain) {
        bound.add(variable);
      }
    }
    return ordered;
  }

  /**
   * Rank an item by whether its subject or object is bound, and its estimated cardinality.
   */
  public rank(item: IItem, bound: Set<string>, state: IState): [number, number] {
    if (item.operation) {
      const first = this.orderItemsSafe(this.getFirstItems(item.operation), bound, state);
      return first ? this.rank(first, bound, state) : [ 2, Number.POSITIVE_INFINITY ];
    }
    const isBound = (term: RDF.Term): boolean => term.termType !== 'Variable' || bound.has(term.value);
    let boundRank = 2;
    if (isBound(item.subject!)) {
      boundRank = 0;
    } else if (isBound(item.object!)) {
      boundRank = 1;
    }
    if (item.path) {
      return [ boundRank, boundRank < 2 ? 1 : Number.POSITIVE_INFINITY ];
    }
    return [ boundRank, this.countItem(item, state) ];
  }

  private orderItemsSafe(items: IItem[], bound: Set<string>, state: IState): IItem | undefined {
    let best: IItem | undefined;
    let bestCount = Number.POSITIVE_INFINITY;
    for (const item of items) {
      const [ , count ] = this.rank(item, bound, state);
      if (!best || count < bestCount) {
        best = item;
        bestCount = count;
      }
    }
    return best;
  }

  /**
   * The items an operation can start with when it is nested in a group.
   */
  private getFirstItems(operation: Algebra.Operation): IItem[] {
    switch (operation.type) {
      case Algebra.Types.LEFT_JOIN:
        return this.getFirstItems((<Algebra.LeftJoin> operation).input[0]);
      case Algebra.Types.EXTEND:
        return this.getFirstItems((<Algebra.Extend> operation).input);
      case Algebra.Types.UNION:
        return (<Algebra.Union> operation).input.flatMap(input => this.getFirstItems(input));
      default:
        return this.getItems(operation);
    }
  }

  /**
   * The cardinality of a pattern with at least two constants, or infinity.
   * Patterns with a constant subject are read instead of counted, as they tend to be small and are needed anyway.
   */
  private countItem(item: IItem, state: IState): number {
    let value = this.countCache.get(item);
    if (value === undefined) {
      const constants = [ item.subject!, item.predicates![0], item.object! ]
        .filter(term => term.termType !== 'Variable').length;
      value = constants >= 2 ? this.readSmallItem(item, state) : undefined;
      if (value === undefined) {
        value = 0;
        for (const predicate of item.predicates!) {
          value += constants >= 2 ?
            state.source.cardinalitySynchronous?.(state.algebraFactory.createPattern(
              item.subject!,
              predicate,
              item.object!,
              state.dataFactory.defaultGraph(),
            ), state.context) ?? Number.POSITIVE_INFINITY :
            Number.POSITIVE_INFINITY;
        }
      }
      this.countCache.set(item, value);
    }
    return value;
  }

  /**
   * Read the quads of an item with a constant subject into the state, and return their number,
   * or undefined if the subject is not constant or there are too many quads.
   */
  private readSmallItem(item: IItem, state: IState): number | undefined {
    if (item.subject!.termType === 'Variable' ||
      item.predicates!.some(predicate => predicate.termType === 'Variable')) {
      return;
    }
    const reads: RDF.Quad[][] = [];
    let total = 0;
    for (const predicate of item.predicates!) {
      const quads: RDF.Quad[] = [];
      for (const quad of this.lookup(item, item.subject!, predicate, item.object!, state)) {
        if (++total > this.maxStartCardinality) {
          return;
        }
        quads.push(quad);
      }
      reads.push(quads);
    }
    state.reads.set(item, reads);
    return total;
  }

  /**
   * Flatten joins, basic graph patterns, patterns, and paths into items.
   */
  private getItems(operation: Algebra.Operation): IItem[] {
    let items = this.itemsCache.get(operation);
    if (!items) {
      items = [];
      const collect = (input: Algebra.Operation): void => {
        if (algebraUtils.isKnownOperation(input, Algebra.Types.BGP)) {
          for (const pattern of input.patterns) {
            collect(pattern);
          }
        } else if (algebraUtils.isKnownOperation(input, Algebra.Types.JOIN)) {
          for (const child of input.input) {
            collect(child);
          }
        } else if (algebraUtils.isKnownOperation(input, Algebra.Types.PATTERN)) {
          items!.push({
            subject: input.subject,
            predicates: [ input.predicate ],
            object: input.object,
            variables: LeanEvaluator.termVariables([ input.subject, input.predicate, input.object ]),
          });
        } else if (algebraUtils.isKnownOperation(input, Algebra.Types.PATH)) {
          // Links and alternatives of links are looked up like patterns
          const predicates = LeanEvaluator.getLinks(input.predicate);
          items!.push({
            subject: input.subject,
            predicates,
            object: input.object,
            path: predicates ? undefined : input.predicate,
            variables: LeanEvaluator.termVariables([ input.subject, input.object ]),
          });
        } else {
          items!.push({ operation: input, variables: [ ...this.getVariables(input) ]});
        }
      };
      collect(operation);
      // Mark patterns that share their subject with another pattern with constant predicates
      const subjectCounts = new Map<string, number>();
      const starKey = (item: IItem): string | undefined => item.predicates &&
        item.predicates.every(predicate => predicate.termType === 'NamedNode') ?
        LeanEvaluator.termKey(item.subject) :
        undefined;
      for (const item of items) {
        const key = starKey(item);
        if (key !== undefined) {
          subjectCounts.set(key, (subjectCounts.get(key) ?? 0) + 1);
        }
      }
      for (const item of items) {
        const key = starKey(item);
        item.star = key !== undefined && subjectCounts.get(key)! > 1;
      }
      this.itemsCache.set(operation, items);
    }
    return items;
  }

  /**
   * The IRIs of a link or an alternative of links, or undefined for other paths.
   */
  public static getLinks(path: Algebra.Operation): RDF.Term[] | undefined {
    if (algebraUtils.isKnownOperation(path, Algebra.Types.LINK)) {
      return [ path.iri ];
    }
    if (algebraUtils.isKnownOperation(path, Algebra.Types.ALT) &&
      path.input.every(input => algebraUtils.isKnownOperation(input, Algebra.Types.LINK))) {
      return path.input.map(input => (input).iri);
    }
  }

  /**
   * The variables that an operation binds in all its results.
   */
  public getCertainVariables(operation: Algebra.Operation): Set<string> {
    let variables = this.certainCache.get(operation);
    if (!variables) {
      switch (operation.type) {
        case Algebra.Types.LEFT_JOIN:
          variables = this.getCertainVariables((<Algebra.LeftJoin> operation).input[0]);
          break;
        case Algebra.Types.EXTEND: {
          const extend = <Algebra.Extend> operation;
          variables = this.getCertainVariables(extend.input);
          if (LeanEvaluator.isTotalExpression(extend.expression, variables)) {
            variables = new Set([ ...variables, extend.variable.value ]);
          }
          break;
        }
        case Algebra.Types.UNION: {
          const [ first, ...rest ] = (<Algebra.Union> operation).input.map(input => this.getCertainVariables(input));
          variables = new Set([ ...first ].filter(variable => rest.every(other => other.has(variable))));
          break;
        }
        default:
          variables = new Set(this.getItems(operation).flatMap(item => item.operation ?
              [ ...this.getCertainVariables(item.operation) ] :
            item.variables));
      }
      this.certainCache.set(operation, variables);
    }
    return variables;
  }

  /**
   * The variables that an operation may bind.
   */
  public getVariables(operation: Algebra.Operation): Set<string> {
    let variables = this.variablesCache.get(operation);
    if (!variables) {
      switch (operation.type) {
        case Algebra.Types.LEFT_JOIN:
        case Algebra.Types.UNION:
          variables = new Set((<Algebra.Multi> operation).input.flatMap(input => [ ...this.getVariables(input) ]));
          break;
        case Algebra.Types.EXTEND:
          variables = new Set([
            ...this.getVariables((<Algebra.Extend> operation).input),
            (<Algebra.Extend> operation).variable.value,
          ]);
          break;
        default:
          variables = new Set(this.getItems(operation).flatMap(item => item.operation ?
              [ ...this.getVariables(item.operation) ] :
            item.variables));
      }
      this.variablesCache.set(operation, variables);
    }
    return variables;
  }

  /**
   * Fall back if variables of a nested operation are bound in the row but not certainly bound by the operation itself,
   * as substituting them would then give other results than joining afterwards.
   */
  private assertSubstitutable(variables: Iterable<string>, row: Row, certain: Set<string>): void {
    for (const variable of variables) {
      if (row[variable] && !certain.has(variable)) {
        throw new FallbackError(`Variable ${variable} can not be substituted`);
      }
    }
  }

  /**
   * Look up the quads of a pattern, reading all quads of the subject at once for star patterns,
   * as one index seek is much more expensive than iterating over a few quads.
   */
  private lookup(item: IItem, subject: RDF.Term, predicate: RDF.Term, object: RDF.Term, state: IState):
  Iterable<RDF.Quad> {
    if (!item.star || subject.termType === 'Variable' || predicate.termType === 'Variable') {
      return this.readQuads(subject, predicate, object, state);
    }
    const key = LeanEvaluator.termKey(subject);
    let byPredicate = state.subjects.get(key);
    if (byPredicate === undefined) {
      byPredicate = new Map();
      let count = 0;
      for (const quad of this.readQuads(
        subject,
        state.dataFactory.variable('__lean_predicate'),
        state.dataFactory.variable('__lean_object'),
        state,
      )) {
        if (++count > LeanEvaluator.MAX_SUBJECT_QUADS) {
          byPredicate = null;
          break;
        }
        const quads = byPredicate.get(quad.predicate.value);
        if (quads) {
          quads.push(quad);
        } else {
          byPredicate.set(quad.predicate.value, [ quad ]);
        }
      }
      state.subjects.set(key, byPredicate);
    }
    if (!byPredicate) {
      return this.readQuads(subject, predicate, object, state);
    }
    const quads = byPredicate.get(predicate.value) ?? [];
    return object.termType === 'Variable' ? quads : quads.filter(quad => quad.object.equals(object));
  }

  private readQuads(subject: RDF.Term, predicate: RDF.Term, object: RDF.Term, state: IState): Iterable<RDF.Quad> {
    if (++state.work > this.maxWork) {
      throw new FallbackError('Too many lookups');
    }
    const quads = state.source.readQuadsSynchronous!(state.algebraFactory.createPattern(
      subject,
      predicate,
      object,
      state.dataFactory.defaultGraph(),
    ), state.context);
    if (!quads) {
      throw new FallbackError('No synchronous lookup');
    }
    return quads;
  }

  private count<T>(values: T[], state: IState): T[] {
    this.addWork(values.length, state);
    return values;
  }

  private addWork(amount: number, state: IState): void {
    state.work += amount;
    if (state.work > this.maxWork) {
      throw new FallbackError('Too many results');
    }
  }

  public static evaluateExpression(expression: Algebra.Expression, row: Row): RDF.Term | undefined {
    if (algebraUtils.isKnownSubType(expression, Algebra.ExpressionTypes.TERM)) {
      return expression.term.termType === 'Variable' ? row[expression.term.value] : expression.term;
    }
    // COALESCE is the only supported operator
    for (const arg of (<Algebra.OperatorExpression> expression).args) {
      const value = LeanEvaluator.evaluateExpression(arg, row);
      if (value) {
        return value;
      }
    }
  }

  /**
   * Check if an expression always has a value, given the variables that are certainly bound.
   */
  public static isTotalExpression(expression: Algebra.Expression, certain: Set<string>): boolean {
    if (algebraUtils.isKnownSubType(expression, Algebra.ExpressionTypes.TERM)) {
      return expression.term.termType !== 'Variable' || certain.has(expression.term.value);
    }
    return (<Algebra.OperatorExpression> expression).args.some(arg => LeanEvaluator.isTotalExpression(arg, certain));
  }

  public static getExpressionVariables(expression: Algebra.Expression): string[] {
    if (algebraUtils.isKnownSubType(expression, Algebra.ExpressionTypes.TERM)) {
      return expression.term.termType === 'Variable' ? [ expression.term.value ] : [];
    }
    return (<Algebra.OperatorExpression> expression).args.flatMap(arg => LeanEvaluator.getExpressionVariables(arg));
  }

  public static termVariables(terms: RDF.Term[]): string[] {
    return terms.filter(term => term.termType === 'Variable').map(term => term.value);
  }

  public static resolve(term: RDF.Term, row: Row): RDF.Term {
    return term.termType === 'Variable' ? row[term.value] ?? term : term;
  }

  /**
   * Bind a variable to a value in the row, recording it as assigned, or check that a bound value or constant matches.
   */
  public static assign(row: Row, term: RDF.Term, value: RDF.Term, assigned: string[]): boolean {
    if (term.termType !== 'Variable') {
      return term.equals(value);
    }
    const existing = row[term.value];
    if (existing) {
      return existing.equals(value);
    }
    row[term.value] = value;
    assigned.push(term.value);
    return true;
  }

  public static unassign(row: Row, assigned: string[]): void {
    for (const variable of assigned) {
      delete row[variable];
    }
    assigned.length = 0;
  }

  public static termKey(term: RDF.Term | undefined): string {
    if (!term) {
      return '';
    }
    if (term.termType === 'Literal') {
      return `"${term.value}"@${term.language}^^${term.datatype.value}`;
    }
    return `${term.termType}:${term.value}`;
  }
}
