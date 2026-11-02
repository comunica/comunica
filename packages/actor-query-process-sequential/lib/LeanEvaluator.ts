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
import { LeanStoreScan } from './LeanStoreScan';

type Row = Record<string, RDF.Term>;

// Algebra types, read once instead of through re-exports on every access
const TYPE_BGP = Algebra.Types.BGP;
const TYPE_JOIN = Algebra.Types.JOIN;
const TYPE_PATTERN = Algebra.Types.PATTERN;
const TYPE_PATH = Algebra.Types.PATH;
const TYPE_LEFT_JOIN = Algebra.Types.LEFT_JOIN;
const TYPE_EXTEND = Algebra.Types.EXTEND;
const TYPE_UNION = Algebra.Types.UNION;
const TYPE_SLICE = Algebra.Types.SLICE;
const TYPE_DISTINCT = Algebra.Types.DISTINCT;
const TYPE_PROJECT = Algebra.Types.PROJECT;
const TYPE_ORDER_BY = Algebra.Types.ORDER_BY;
const TYPE_LINK = Algebra.Types.LINK;
const TYPE_INV = Algebra.Types.INV;
const TYPE_SEQ = Algebra.Types.SEQ;
const TYPE_ALT = Algebra.Types.ALT;
const TYPE_ZERO_OR_MORE_PATH = Algebra.Types.ZERO_OR_MORE_PATH;
const TYPE_ONE_OR_MORE_PATH = Algebra.Types.ONE_OR_MORE_PATH;
const TYPE_ZERO_OR_ONE_PATH = Algebra.Types.ZERO_OR_ONE_PATH;
const EXPRESSION_TERM = Algebra.ExpressionTypes.TERM;
const EXPRESSION_OPERATOR = Algebra.ExpressionTypes.OPERATOR;

/**
 * Thrown when lean evaluation does not apply, after which the regular query process is used.
 */
class FallbackError extends Error {}

/**
 * A triple pattern, or a path of a link or alternative links, in a group of joined operations.
 */
interface IPatternItem {
  kind: 'pattern';
  subject: RDF.Term;
  predicates: RDF.Term[];
  object: RDF.Term;
  variables: string[];
  /**
   * If other patterns in the group have the same subject, so that its quads can be read at once.
   */
  star: boolean;
  /**
   * The estimated cardinality, once determined.
   */
  count?: number;
  /**
   * The quads per predicate, if they were read to determine the cardinality.
   */
  reads?: RDF.Quad[][];
}

/**
 * Another property path in a group of joined operations.
 */
interface IPathItem {
  kind: 'path';
  subject: RDF.Term;
  path: Algebra.Operation;
  object: RDF.Term;
  variables: string[];
}

/**
 * Another operation in a group of joined operations.
 */
interface INodeItem {
  kind: 'node';
  node: IPlanNode;
  variables: string[];
}

type IItem = IPatternItem | IPathItem | INodeItem;

interface IPlanNodeBase {
  /**
   * The variables the operation may bind.
   */
  variables: Set<string>;
  /**
   * The variables the operation binds in all its results.
   */
  certain: Set<string>;
}

interface IGroupNode extends IPlanNodeBase {
  kind: 'group';
  items: IItem[];
  /**
   * Evaluation orders of the items by the variables that are bound before.
   */
  orders: Map<string, IOrder>;
}

interface ILeftJoinNode extends IPlanNodeBase {
  kind: 'leftjoin';
  left: IPlanNode;
  right: IPlanNode;
}

interface IExtendNode extends IPlanNodeBase {
  kind: 'extend';
  input: IPlanNode;
  variable: string;
  expression: Algebra.Expression;
  expressionVariables: string[];
}

interface IUnionNode extends IPlanNodeBase {
  kind: 'union';
  inputs: IPlanNode[];
}

type IPlanNode = IGroupNode | ILeftJoinNode | IExtendNode | IUnionNode;

/**
 * An evaluation order of the items of a group.
 */
interface IOrder {
  items: IItem[];
  /**
   * Per position, if all quads of the subject should be read at once, as several lookups on it follow.
   */
  stars: boolean[];
  /**
   * Per position, if all matches of the pattern for any subject should be read at once into a map by subject,
   * as the pattern is looked up for many subjects.
   */
  materialize: boolean[];
}

/**
 * A query that can be evaluated by the lean evaluator.
 */
export interface ILeanPlan {
  root: IPlanNode;
  projection: RDF.Variable[];
  sortKeys?: { variable: string; ascending: boolean }[];
  distinct: boolean;
  slice?: { start: number; length?: number };
}

interface IState {
  source: IQuerySource;
  context: IActionContext;
  algebraFactory: AlgebraFactory;
  dataFactory: ComunicaDataFactory;
  work: number;
  /**
   * Quads of subjects of star patterns by predicate, or null for subjects with too many quads.
   */
  subjects: Map<string, Map<string, RDF.Quad[]> | null>;
  /**
   * All matches of patterns by subject, for patterns that are looked up for many subjects.
   */
  materialized: Map<IPatternItem, Map<string, RDF.Quad[]>>;
  /**
   * Direct lookups in the store of the source, if supported.
   */
  scan?: LeanStoreScan;
}

/**
 * Prototype: evaluates selective SELECT queries over a single source with synchronous lookups,
 * as nested loops over plain row objects, without operation mediation, iterators, or bindings.
 * Supports basic graph patterns, property paths, OPTIONAL, UNION, BIND with terms and COALESCE,
 * ORDER BY on variables, DISTINCT, and LIMIT/OFFSET.
 * Queries are first compiled into a plan in a single pass, and evaluation returns undefined
 * when it exceeds its budget.
 */
export class LeanEvaluator {
  /**
   * The maximum number of quads of a subject to read at once for star patterns.
   */
  public static readonly MAX_SUBJECT_QUADS = 256;
  /**
   * The assumed number of matches of a pattern that is only joined on its object.
   */
  public static readonly FANOUT_ESTIMATE = 64;
  /**
   * The maximum number of matches of a pattern to read at once into a map by subject.
   */
  public static readonly MAX_MATERIALIZED = 50_000;
  /**
   * How many quads can be iterated over in the time of one index seek.
   */
  public static readonly SEEK_COST = 1;

  public constructor(
    private readonly maxWork = 200_000,
    private readonly maxStartCardinality = 1_000,
  ) {}

  // ---------- Compilation ----------

  /**
   * Compile a query into a plan, or return undefined if it has an unsupported shape.
   * @param operation A parsed operation.
   */
  public static compile(operation: Algebra.Operation): ILeanPlan | undefined {
    let current = operation;
    let slice: ILeanPlan['slice'];
    if (algebraUtils.isKnownOperation(current, TYPE_SLICE)) {
      slice = { start: current.start, length: current.length };
      current = current.input;
    }
    let distinct = false;
    if (algebraUtils.isKnownOperation(current, TYPE_DISTINCT)) {
      distinct = true;
      current = current.input;
    }
    if (!algebraUtils.isKnownOperation(current, TYPE_PROJECT)) {
      return;
    }
    const projection = current.variables;
    current = current.input;
    let sortKeys: ILeanPlan['sortKeys'];
    if (algebraUtils.isKnownOperation(current, TYPE_ORDER_BY)) {
      sortKeys = [];
      for (const expression of current.expressions) {
        const key = LeanEvaluator.getSortVariable(expression);
        if (!key) {
          return;
        }
        sortKeys.push(key);
      }
      current = current.input;
    }
    const root = LeanEvaluator.compileNode(current);
    return root ? { root, projection, sortKeys, distinct, slice } : undefined;
  }

  public static compileNode(operation: Algebra.Operation): IPlanNode | undefined {
    switch (operation.type) {
      case TYPE_LEFT_JOIN: {
        const leftJoin = <Algebra.LeftJoin> operation;
        if (leftJoin.expression) {
          return;
        }
        const left = LeanEvaluator.compileNode(leftJoin.input[0]);
        const right = left && LeanEvaluator.compileNode(leftJoin.input[1]);
        if (!right) {
          return;
        }
        return {
          kind: 'leftjoin',
          left,
          right,
          variables: new Set([ ...left.variables, ...right.variables ]),
          certain: left.certain,
        };
      }
      case TYPE_EXTEND: {
        const extend = <Algebra.Extend> operation;
        if (!LeanEvaluator.isSupportedExpression(extend.expression)) {
          return;
        }
        const input = LeanEvaluator.compileNode(extend.input);
        if (!input) {
          return;
        }
        const variable = extend.variable.value;
        return {
          kind: 'extend',
          input,
          variable,
          expression: extend.expression,
          expressionVariables: LeanEvaluator.getExpressionVariables(extend.expression),
          variables: new Set([ ...input.variables, variable ]),
          certain: LeanEvaluator.isTotalExpression(extend.expression, input.certain) ?
            new Set([ ...input.certain, variable ]) :
            input.certain,
        };
      }
      case TYPE_UNION: {
        const inputs: IPlanNode[] = [];
        for (const input of (<Algebra.Union> operation).input) {
          const node = LeanEvaluator.compileNode(input);
          if (!node) {
            return;
          }
          inputs.push(node);
        }
        const variables = new Set<string>();
        for (const input of inputs) {
          for (const variable of input.variables) {
            variables.add(variable);
          }
        }
        const certain = new Set([ ...inputs[0].certain ]
          .filter(variable => inputs.every(input => input.certain.has(variable))));
        return { kind: 'union', inputs, variables, certain };
      }
      case TYPE_BGP:
      case TYPE_JOIN:
      case TYPE_PATTERN:
      case TYPE_PATH:
        return LeanEvaluator.compileGroup(operation);
      default:
        return undefined;
    }
  }

  /**
   * Compile joins, basic graph patterns, patterns, and paths into a group of items.
   */
  public static compileGroup(operation: Algebra.Operation): IGroupNode | undefined {
    const node: IGroupNode = {
      kind: 'group',
      items: [],
      variables: new Set(),
      certain: new Set(),
      orders: new Map(),
    };
    if (!LeanEvaluator.collectItems(operation, node) || node.items.length === 0) {
      return;
    }
    LeanEvaluator.markStars(node.items);
    return node;
  }

  /**
   * Add the items of an operation to a group, or return false if it is not supported.
   */
  public static collectItems(input: Algebra.Operation, node: IGroupNode): boolean {
    switch (input.type) {
      case TYPE_BGP:
        for (const pattern of (<Algebra.Bgp> input).patterns) {
          if (!LeanEvaluator.collectItems(pattern, node)) {
            return false;
          }
        }
        return true;
      case TYPE_JOIN:
        if ('expression' in input) {
          return false;
        }
        for (const child of (<Algebra.Join> input).input) {
          if (!LeanEvaluator.collectItems(child, node)) {
            return false;
          }
        }
        return true;
      case TYPE_PATTERN: {
        const pattern = <Algebra.Pattern> input;
        if (pattern.graph.termType !== 'DefaultGraph' || !LeanEvaluator.isSupportedTerm(pattern.subject) ||
          !LeanEvaluator.isSupportedTerm(pattern.predicate) || !LeanEvaluator.isSupportedTerm(pattern.object)) {
          return false;
        }
        const variables = LeanEvaluator.termVariables(pattern.subject, pattern.predicate, pattern.object);
        node.items.push({
          kind: 'pattern',
          subject: pattern.subject,
          predicates: [ pattern.predicate ],
          object: pattern.object,
          variables,
          star: false,
        });
        LeanEvaluator.addVariables(node, variables, variables);
        return true;
      }
      case TYPE_PATH: {
        const path = <Algebra.Path> input;
        if (path.graph.termType !== 'DefaultGraph' || !LeanEvaluator.isSupportedTerm(path.subject) ||
          !LeanEvaluator.isSupportedTerm(path.object) || !LeanEvaluator.isSupportedPath(path.predicate)) {
          return false;
        }
        const variables = LeanEvaluator.termVariables(path.subject, path.object);
        // Links and alternatives of links are looked up like patterns
        const predicates = LeanEvaluator.getLinks(path.predicate);
        node.items.push(predicates ?
            { kind: 'pattern', subject: path.subject, predicates, object: path.object, variables, star: false } :
            { kind: 'path', subject: path.subject, path: path.predicate, object: path.object, variables });
        LeanEvaluator.addVariables(node, variables, variables);
        return true;
      }
      default: {
        const child = LeanEvaluator.compileNode(input);
        if (!child) {
          return false;
        }
        node.items.push({ kind: 'node', node: child, variables: [ ...child.variables ]});
        LeanEvaluator.addVariables(node, child.variables, child.certain);
        return true;
      }
    }
  }

  private static addVariables(node: IPlanNodeBase, variables: Iterable<string>, certain: Iterable<string>): void {
    for (const variable of variables) {
      node.variables.add(variable);
    }
    for (const variable of certain) {
      node.certain.add(variable);
    }
  }

  /**
   * Mark patterns that share their subject with another pattern with constant predicates.
   */
  public static markStars(items: IItem[]): void {
    // Subjects are variables or IRIs
    const variableCounts = new Map<string, number>();
    const iriCounts = new Map<string, number>();
    let candidates = 0;
    for (const item of items) {
      if (item.kind === 'pattern' && LeanEvaluator.hasConstantPredicates(item)) {
        const counts = item.subject.termType === 'Variable' ? variableCounts : iriCounts;
        counts.set(item.subject.value, (counts.get(item.subject.value) ?? 0) + 1);
        candidates++;
      }
    }
    if (variableCounts.size + iriCounts.size === candidates) {
      return;
    }
    for (const item of items) {
      if (item.kind === 'pattern' && LeanEvaluator.hasConstantPredicates(item)) {
        const counts = item.subject.termType === 'Variable' ? variableCounts : iriCounts;
        item.star = counts.get(item.subject.value)! > 1;
      }
    }
  }

  private static hasConstantPredicates(item: IPatternItem): boolean {
    for (const predicate of item.predicates) {
      if (predicate.termType !== 'NamedNode') {
        return false;
      }
    }
    return true;
  }

  public static isSupportedTerm(term: RDF.Term): boolean {
    return term.termType !== 'Quad' && term.termType !== 'BlankNode';
  }

  public static isSupportedPath(path: Algebra.Operation): boolean {
    switch (path.type) {
      case TYPE_LINK:
        return true;
      case TYPE_INV:
      case TYPE_ZERO_OR_MORE_PATH:
      case TYPE_ONE_OR_MORE_PATH:
      case TYPE_ZERO_OR_ONE_PATH:
        return LeanEvaluator.isSupportedPath((<any> path).path);
      case TYPE_SEQ:
      case TYPE_ALT:
        return (<Algebra.Operation[]> (<any> path).input).every(input => LeanEvaluator.isSupportedPath(input));
      default:
        return false;
    }
  }

  public static isSupportedExpression(expression: Algebra.Expression): boolean {
    if (algebraUtils.isKnownSubType(expression, EXPRESSION_TERM)) {
      return LeanEvaluator.isSupportedTerm(expression.term);
    }
    if (algebraUtils.isKnownSubType(expression, EXPRESSION_OPERATOR)) {
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
    if (algebraUtils.isKnownSubType(expression, EXPRESSION_OPERATOR) && expression.operator === 'desc') {
      ascending = false;
      expression = expression.args[0];
    }
    if (algebraUtils.isKnownSubType(expression, EXPRESSION_TERM) &&
      expression.term.termType === 'Variable') {
      return { variable: expression.term.value, ascending };
    }
  }

  /**
   * The IRIs of a link or an alternative of links, or undefined for other paths.
   */
  public static getLinks(path: Algebra.Operation): RDF.Term[] | undefined {
    if (algebraUtils.isKnownOperation(path, TYPE_LINK)) {
      return [ path.iri ];
    }
    if (algebraUtils.isKnownOperation(path, TYPE_ALT) &&
      path.input.every(input => algebraUtils.isKnownOperation(input, TYPE_LINK))) {
      return path.input.map(input => (input).iri);
    }
  }

  // ---------- Evaluation ----------

  /**
   * Evaluate a compiled query, or return undefined if it can not be evaluated cheaply.
   * @param plan A compiled query.
   * @param context A context with identified query sources.
   * @param comparator A term comparator, required for queries with ORDER BY.
   */
  public evaluate(
    plan: ILeanPlan,
    context: IActionContext,
    comparator?: ITermComparator,
  ): IQueryOperationResultBindings | undefined {
    const sources: IQuerySourceWrapper[] | undefined = context.get(KeysQueryOperation.querySources);
    if (sources?.length !== 1 || !sources[0].source.readQuadsSynchronous || (plan.sortKeys && !comparator)) {
      return;
    }
    const dataFactory: ComunicaDataFactory = context.getSafe(KeysInitQuery.dataFactory);
    const state: IState = {
      source: sources[0].source,
      context: sources[0].context ? context.merge(sources[0].context) : context,
      algebraFactory: new AlgebraFactory(dataFactory),
      dataFactory,
      work: 0,
      subjects: new Map(),
      materialized: new Map(),
    };
    if ((<any> globalThis).__proto?.leanScan) {
      state.scan = LeanStoreScan.forStore(state.source.getSynchronousStore?.(state.context));
    }

    let rows: Row[];
    try {
      rows = this.evaluateNode(plan.root, {}, state);
    } catch (error: unknown) {
      if (error instanceof FallbackError) {
        return;
      }
      throw error;
    }

    if (plan.sortKeys) {
      const keys = plan.sortKeys;
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
    const variables = plan.projection.map(variable => variable.value);
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
    if (plan.distinct) {
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
    if (plan.slice) {
      const { start, length } = plan.slice;
      rows = rows.slice(start, length === undefined ? undefined : start + length);
    }

    const certain = plan.root.certain;
    const finalRows = rows;
    let bindingsStream: BindingsStream | undefined;
    const result: IQueryOperationResultBindings = {
      type: 'bindings',
      // Only created when consumed, as consumers of the raw rows do not need it
      get bindingsStream(): BindingsStream {
        if (!bindingsStream) {
          const bindingsFactory = new BindingsFactory(dataFactory);
          bindingsStream = <BindingsStream> <unknown> new ArrayIterator(finalRows, { autoStart: false })
            .map(values => bindingsFactory.bindings(Object.entries(values)
              .map(([ key, value ]): [RDF.Variable, RDF.Term] => [ dataFactory.variable(key), value ])));
        }
        return bindingsStream;
      },
      metadata: async() => ({
        state: new MetadataValidationState(),
        cardinality: { type: 'exact', value: finalRows.length },
        variables: plan.projection
          .map((variable): MetadataVariable => ({ variable, canBeUndef: !certain.has(variable.value) })),
      }),
    };
    (<any> result)[RAW_ROWS] = <IRawRows> { variables, rows: finalRows };
    return result;
  }

  /**
   * Evaluate a plan node, extending the given row.
   * Nodes are evaluated with the bindings of the row substituted (bind join),
   * which is only done when that gives the same results as joining afterwards.
   */
  public evaluateNode(node: IPlanNode, row: Row, state: IState): Row[] {
    switch (node.kind) {
      case 'leftjoin': {
        // Variables of the right side that are bound outside, but possibly not by the left side,
        // would make a bind join differ from a left join.
        LeanEvaluator.assertSubstitutable(node.right.variables, row, node.left.certain);
        const rows: Row[] = [];
        for (const leftRow of this.evaluateNode(node.left, row, state)) {
          const rightRows = this.evaluateNode(node.right, leftRow, state);
          if (rightRows.length > 0) {
            for (const rightRow of rightRows) {
              rows.push(rightRow);
            }
          } else {
            rows.push(leftRow);
          }
        }
        return this.count(rows, state);
      }
      case 'extend': {
        LeanEvaluator.assertSubstitutable(node.expressionVariables, row, node.input.certain);
        const variable = node.variable;
        const rows: Row[] = [];
        for (const inputRow of this.evaluateNode(node.input, row, state)) {
          const value = LeanEvaluator.evaluateExpression(node.expression, inputRow);
          if (!value) {
            rows.push(inputRow);
          } else if (!inputRow[variable]) {
            inputRow[variable] = value;
            rows.push(inputRow);
          } else if (inputRow[variable].equals(value)) {
            rows.push(inputRow);
          }
        }
        return rows;
      }
      case 'union': {
        const rows: Row[] = [];
        for (const input of node.inputs) {
          for (const inputRow of this.evaluateNode(input, row, state)) {
            rows.push(inputRow);
          }
        }
        return this.count(rows, state);
      }
      case 'group':
        return this.evaluateGroup(node, row, state);
    }
  }

  /**
   * Evaluate a group of joined items as nested loops, in a greedy order.
   * Rows are extended in place and restored after each nested loop, and only copied for results.
   */
  public evaluateGroup(node: IGroupNode, row: Row, state: IState): Row[] {
    const order = this.orderItems(node, row, state);
    const ordered = order.items;
    const rows: Row[] = [];
    const step = (index: number, current: Row): void => {
      if (index === ordered.length) {
        rows.push({ ...current });
        this.addWork(1, state);
        return;
      }
      const item = ordered[index];
      if (item.kind === 'node') {
        // Nested nodes return new rows
        for (const next of this.evaluateNode(item.node, current, state)) {
          step(index + 1, next);
        }
        return;
      }
      const subject = LeanEvaluator.resolve(item.subject, current);
      const object = LeanEvaluator.resolve(item.object, current);
      const assigned: string[] = [];
      if (item.kind === 'path') {
        for (const [ pathSubject, pathObject ] of this.evaluatePath(item.path, subject, object, state)) {
          if (LeanEvaluator.assign(current, subject, pathSubject, assigned) &&
            LeanEvaluator.assign(current, object, pathObject, assigned)) {
            step(index + 1, current);
          }
          LeanEvaluator.unassign(current, assigned);
        }
        return;
      }
      const reads = subject === item.subject && object === item.object ? item.reads : undefined;
      for (let predicateIndex = 0; predicateIndex < item.predicates.length; predicateIndex++) {
        const predicate = item.predicates[predicateIndex];
        const resolvedPredicate = LeanEvaluator.resolve(predicate, current);
        let quads: Iterable<RDF.Quad>;
        if (reads && resolvedPredicate === predicate) {
          quads = reads[predicateIndex];
        } else if (order.materialize[index]) {
          quads = this.lookupMaterialized(item, subject, object, state);
        } else {
          quads = this.lookup(order.stars[index], subject, resolvedPredicate, object, state);
        }
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
      case TYPE_LINK:
        return [ ...this.readQuads(subject, (<Algebra.Link> path).iri, object, state) ]
          .filter(quad => subject.termType !== 'Variable' || object.termType !== 'Variable' ||
            subject.value !== object.value || quad.subject.equals(quad.object))
          .map(quad => [ quad.subject, quad.object ]);
      case TYPE_INV:
        return this.evaluatePath((<Algebra.Inv> path).path, object, subject, state)
          .map(([ left, right ]) => [ right, left ]);
      case TYPE_ALT:
        return (<Algebra.Alt> path).input.flatMap(input => this.evaluatePath(input, subject, object, state));
      case TYPE_SEQ: {
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
      case TYPE_ZERO_OR_MORE_PATH:
      case TYPE_ONE_OR_MORE_PATH:
      case TYPE_ZERO_OR_ONE_PATH: {
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
        if (path.type !== TYPE_ONE_OR_MORE_PATH) {
          reached.set(LeanEvaluator.termKey(subject), subject);
        }
        const maxDepth = path.type === TYPE_ZERO_OR_ONE_PATH ? 1 : Number.POSITIVE_INFINITY;
        for (let depth = 0; depth < maxDepth && frontier.length > 0; depth++) {
          const next: RDF.Term[] = [];
          for (const node of frontier) {
            for (const [ , end ] of this.evaluatePath(inner, node, variable, state)) {
              const key = LeanEvaluator.termKey(end);
              if (!reached.has(key)) {
                reached.set(key, end);
                next.push(end);
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

  // ---------- Join ordering ----------

  /**
   * Order items greedily: start from the item with the lowest cardinality,
   * then prefer items that share a bound variable, with a bound subject first.
   */
  public orderItems(node: IGroupNode, row: Row, state: IState): IOrder {
    // The order only depends on which variables are bound
    const boundKey = Object.keys(row).join(' ');
    let order = node.orders.get(boundKey);
    if (!order) {
      const items = this.computeOrder(node.items, row, state);
      order = {
        items,
        stars: LeanEvaluator.computeStars(items, row),
        materialize: this.computeMaterialize(items, row, state),
      };
      node.orders.set(boundKey, order);
    }
    return order;
  }

  /**
   * Determine for each position in an order if all quads of the subject should be read at once,
   * which is when the subject is bound there, its object is not, and at least three such open lookups on the subject
   * follow, including this one. Reading a subject costs one index seek and iterating over all its quads,
   * while each lookup costs a seek. Checks, with a bound object, stay point lookups, as they are cheaper and
   * often eliminate the subject.
   */
  public static computeStars(items: IItem[], row: Row): boolean[] {
    // Prototype: without whole-subject reads, for when point lookups are cheap
    if ((<any> globalThis).__proto?.leanNoStars) {
      return items.map(() => false);
    }
    // The variables bound before each position
    const boundBefore: Set<string>[] = [];
    const bound = new Set(Object.keys(row));
    for (const item of items) {
      boundBefore.push(new Set(bound));
      for (const variable of item.kind === 'node' ? item.node.certain : item.variables) {
        bound.add(variable);
      }
    }
    const isBound = (term: RDF.Term, index: number): boolean =>
      term.termType !== 'Variable' || boundBefore[index].has(term.value);
    const isOpenLookup = (item: IItem, index: number): item is IPatternItem => item.kind === 'pattern' && item.star &&
      isBound(item.subject, index) && !isBound(item.object, index);
    return items.map((item, index) => {
      if (!isOpenLookup(item, index)) {
        return false;
      }
      let lookups = 0;
      for (let other = index; other < items.length; other++) {
        const candidate = items[other];
        if (isOpenLookup(candidate, other) && candidate.subject.equals(item.subject)) {
          lookups += candidate.predicates.length;
        }
      }
      return lookups >= 3;
    });
  }

  /**
   * Determine for each position in an order if all matches of its pattern should be read at once into a map by subject,
   * instead of looking it up per subject. This applies to patterns with a single constant predicate on a subject
   * variable bound before, when reading all matches costs less than the index seeks of the expected lookups,
   * which are estimated as the cardinality of the first pattern.
   */
  public computeMaterialize(items: IItem[], row: Row, state: IState): boolean[] {
    const flag = (<any> globalThis).__proto?.leanMaterialize;
    if (!flag) {
      return items.map(() => false);
    }
    const seekCost = typeof flag === 'number' ? flag : LeanEvaluator.SEEK_COST;
    const first = items[0];
    const expected = first.kind === 'pattern' ? first.count : undefined;
    const bound = new Set(Object.keys(row));
    return items.map((item, index) => {
      let materialize = false;
      if (index > 0 && expected !== undefined && Number.isFinite(expected) && item.kind === 'pattern' &&
        item.predicates.length === 1 && item.predicates[0].termType === 'NamedNode' &&
        item.subject.termType === 'Variable' && bound.has(item.subject.value)) {
        const count = state.source.cardinalitySynchronous?.(state.algebraFactory.createPattern(
          state.dataFactory.variable('__lean_subject'),
          item.predicates[0],
          item.object.termType === 'Variable' ? state.dataFactory.variable('__lean_object') : item.object,
          state.dataFactory.defaultGraph(),
        ), state.context);
        materialize = count !== undefined && count <= LeanEvaluator.MAX_MATERIALIZED &&
          count <= expected * seekCost;
      }
      for (const variable of item.kind === 'node' ? item.node.certain : item.variables) {
        bound.add(variable);
      }
      return materialize;
    });
  }

  /**
   * Look up the matches of a pattern for a subject in a map of all matches by subject, which is read once.
   */
  private lookupMaterialized(item: IPatternItem, subject: RDF.Term, object: RDF.Term, state: IState): RDF.Quad[] {
    let bySubject = state.materialized.get(item);
    if (!bySubject) {
      bySubject = new Map();
      let count = 0;
      for (const quad of this.readQuads(
        state.dataFactory.variable('__lean_subject'),
        item.predicates[0],
        item.object.termType === 'Variable' ? state.dataFactory.variable('__lean_object') : item.object,
        state,
      )) {
        count++;
        const key = LeanEvaluator.termKey(quad.subject);
        const quads = bySubject.get(key);
        if (quads) {
          quads.push(quad);
        } else {
          bySubject.set(key, [ quad ]);
        }
      }
      this.addWork(count, state);
      state.materialized.set(item, bySubject);
    }
    const quads = bySubject.get(LeanEvaluator.termKey(subject)) ?? [];
    // Patterns with a variable object are read for all objects, so bound objects are filtered here
    return item.object.termType === 'Variable' && object.termType !== 'Variable' ?
      quads.filter(quad => quad.object.equals(object)) :
      quads;
  }

  private computeOrder(items: IItem[], row: Row, state: IState): IItem[] {
    const bound = new Set(Object.keys(row));
    // Prototype: a number for leanStartLimit overrides the maximum start cardinality
    const startLimit: number = (<any> globalThis).__proto?.leanStartLimit ?? this.maxStartCardinality;
    if (items.length === 1) {
      if (!items[0].variables.some(variable => bound.has(variable)) &&
        this.rank(items[0], bound, state)[1] > startLimit) {
        throw new FallbackError('Expensive start');
      }
      return items;
    }
    const remaining = [ ...items ];
    const ordered: IItem[] = [];
    while (remaining.length > 0) {
      let connectedCount = 0;
      for (const item of remaining) {
        if (item.variables.some(variable => bound.has(variable))) {
          connectedCount++;
        }
      }
      let best: IItem | undefined;
      let bestRank: [number, number] = [ 0, 0 ];
      let bestUnconnected: IItem | undefined;
      let bestUnconnectedCount = Number.POSITIVE_INFINITY;
      for (const candidate of remaining) {
        if (connectedCount > 0 && !candidate.variables.some(variable => bound.has(variable))) {
          const count = this.rank(candidate, bound, state)[1];
          if (count < bestUnconnectedCount) {
            bestUnconnected = candidate;
            bestUnconnectedCount = count;
          }
          continue;
        }
        const rank = this.rank(candidate, bound, state);
        const better = !best || (connectedCount > 0 ?
          rank[0] < bestRank[0] || (rank[0] === bestRank[0] && rank[1] < bestRank[1]) :
          rank[1] < bestRank[1]);
        if (better) {
          best = candidate;
          bestRank = rank;
        }
      }
      // A connected item that is only joined on a variable object can fan out widely,
      // so a small unconnected pattern goes first, which makes the connected item a check
      if (bestUnconnected && bestRank[0] > 0 && bestRank[1] > LeanEvaluator.FANOUT_ESTIMATE &&
        bestUnconnectedCount <= LeanEvaluator.FANOUT_ESTIMATE) {
        best = bestUnconnected;
      }
      if (connectedCount === 0 && bestRank[1] > startLimit) {
        throw new FallbackError('Expensive start');
      }
      remaining.splice(remaining.indexOf(best!), 1);
      ordered.push(best!);
      for (const variable of best!.kind === 'node' ? best!.node.certain : best!.variables) {
        bound.add(variable);
      }
    }
    return ordered;
  }

  /**
   * Rank an item by whether its subject or object is bound, and its estimated cardinality.
   */
  public rank(item: IItem, bound: Set<string>, state: IState): [number, number] {
    if (item.kind === 'node') {
      let best: [number, number] = [ 2, Number.POSITIVE_INFINITY ];
      for (const first of LeanEvaluator.getFirstItems(item.node)) {
        const rank = this.rank(first, bound, state);
        if (rank[1] < best[1]) {
          best = rank;
        }
      }
      return best;
    }
    let boundRank = 2;
    if (item.subject.termType !== 'Variable' || bound.has(item.subject.value)) {
      boundRank = 0;
    } else if (item.object.termType !== 'Variable' || bound.has(item.object.value)) {
      boundRank = 1;
    }
    if (item.kind === 'path') {
      return [ boundRank, boundRank < 2 ? 1 : Number.POSITIVE_INFINITY ];
    }
    return [ boundRank, this.countItem(item, state) ];
  }

  /**
   * The items a node can start with when it is nested in a group.
   */
  public static getFirstItems(node: IPlanNode): IItem[] {
    switch (node.kind) {
      case 'leftjoin':
        return LeanEvaluator.getFirstItems(node.left);
      case 'extend':
        return LeanEvaluator.getFirstItems(node.input);
      case 'union':
        return node.inputs.flatMap(input => LeanEvaluator.getFirstItems(input));
      case 'group':
        return node.items;
    }
  }

  /**
   * The cardinality of a pattern with at least two constants, or infinity.
   * Patterns with a constant subject are read instead of counted, as they tend to be small and are needed anyway.
   */
  private countItem(item: IPatternItem, state: IState): number {
    if (item.count === undefined) {
      let constants = 0;
      for (const term of [ item.subject, item.predicates[0], item.object ]) {
        if (term.termType !== 'Variable') {
          constants++;
        }
      }
      let value = constants >= 2 ? this.readSmallItem(item, state) : undefined;
      // Prototype: patterns with only a constant predicate are counted too, so queries without other constants
      // can start from a small predicate
      const countable = constants >= 2 || ((<any> globalThis).__proto?.leanPredicateCounts &&
        item.predicates.every(predicate => predicate.termType !== 'Variable'));
      if (value === undefined) {
        value = 0;
        for (const predicate of item.predicates) {
          value += countable ?
            state.source.cardinalitySynchronous?.(state.algebraFactory.createPattern(
              item.subject,
              predicate,
              item.object,
              state.dataFactory.defaultGraph(),
            ), state.context) ?? Number.POSITIVE_INFINITY :
            Number.POSITIVE_INFINITY;
        }
      }
      item.count = value;
    }
    return item.count;
  }

  /**
   * Read the quads of an item with a constant subject, and return their number,
   * or undefined if the subject is not constant or there are too many quads.
   */
  private readSmallItem(item: IPatternItem, state: IState): number | undefined {
    if (item.subject.termType === 'Variable' ||
      item.predicates.some(predicate => predicate.termType === 'Variable')) {
      return;
    }
    const reads: RDF.Quad[][] = [];
    let total = 0;
    for (const predicate of item.predicates) {
      const quads: RDF.Quad[] = [];
      for (const quad of this.lookup(item.star, item.subject, predicate, item.object, state)) {
        if (++total > this.maxStartCardinality) {
          return;
        }
        quads.push(quad);
      }
      reads.push(quads);
    }
    item.reads = reads;
    return total;
  }

  // ---------- Lookups ----------

  /**
   * Look up the quads of a pattern, reading all quads of the subject at once for star patterns,
   * as one index seek is much more expensive than iterating over a few quads.
   */
  private lookup(star: boolean, subject: RDF.Term, predicate: RDF.Term, object: RDF.Term, state: IState):
  Iterable<RDF.Quad> {
    if (subject.termType === 'Variable' || predicate.termType === 'Variable') {
      return this.readQuads(subject, predicate, object, state);
    }
    const key = LeanEvaluator.termKey(subject);
    let byPredicate = state.subjects.get(key);
    // Subjects that were read already are reused, others are only read at once for stars
    if (byPredicate === undefined && !star) {
      return this.readQuads(subject, predicate, object, state);
    }
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
    if (state.scan) {
      const out: RDF.Quad[] = [];
      if (state.scan.scan(
        subject.termType === 'Variable' ? undefined : subject,
        predicate.termType === 'Variable' ? undefined : predicate,
        object.termType === 'Variable' ? undefined : object,
        out,
      )) {
        return out;
      }
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

  // ---------- Helpers ----------

  /**
   * Fall back if variables of a nested node are bound in the row but not certainly bound by the node itself,
   * as substituting them would then give other results than joining afterwards.
   */
  public static assertSubstitutable(variables: Iterable<string>, row: Row, certain: Set<string>): void {
    for (const variable of variables) {
      if (row[variable] && !certain.has(variable)) {
        throw new FallbackError(`Variable ${variable} can not be substituted`);
      }
    }
  }

  public static evaluateExpression(expression: Algebra.Expression, row: Row): RDF.Term | undefined {
    if (algebraUtils.isKnownSubType(expression, EXPRESSION_TERM)) {
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
    if (algebraUtils.isKnownSubType(expression, EXPRESSION_TERM)) {
      return expression.term.termType !== 'Variable' || certain.has(expression.term.value);
    }
    return (<Algebra.OperatorExpression> expression).args.some(arg => LeanEvaluator.isTotalExpression(arg, certain));
  }

  public static getExpressionVariables(expression: Algebra.Expression): string[] {
    if (algebraUtils.isKnownSubType(expression, EXPRESSION_TERM)) {
      return expression.term.termType === 'Variable' ? [ expression.term.value ] : [];
    }
    return (<Algebra.OperatorExpression> expression).args.flatMap(arg => LeanEvaluator.getExpressionVariables(arg));
  }

  public static termVariables(...terms: RDF.Term[]): string[] {
    const variables: string[] = [];
    for (const term of terms) {
      if (term.termType === 'Variable' && !variables.includes(term.value)) {
        variables.push(term.value);
      }
    }
    return variables;
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

  /**
   * A unique string for a term.
   * IRIs are their own key, as IRIs can not start with the `_:` or `"` prefixes of the other keys.
   */
  public static termKey(term: RDF.Term | undefined): string {
    if (!term) {
      return '';
    }
    switch (term.termType) {
      case 'NamedNode':
        return term.value;
      case 'Literal':
        return `"${term.value}"@${term.language}^^${term.datatype.value}`;
      case 'BlankNode':
        return `_:${term.value}`;
      default:
        return `${term.termType}:${term.value}`;
    }
  }
}
