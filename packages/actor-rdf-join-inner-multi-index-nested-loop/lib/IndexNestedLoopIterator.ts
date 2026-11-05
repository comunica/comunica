import type { Bindings, BindingsStream, IActionContext, IQuerySource } from '@comunica/types';
import type { AlgebraFactory } from '@comunica/utils-algebra';
import { Algebra, isKnownOperation } from '@comunica/utils-algebra';
import type { BindingsFactory } from '@comunica/utils-bindings-factory';
import { materializeOperation, materializeTerm } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';
import { AsyncIterator } from 'asynciterator';
import { termToString } from 'rdf-string';

/**
 * A property path that follows a single predicate an arbitrary number of times,
 * which can be looked up by repeatedly looking up that predicate.
 */
export interface IArbitraryLengthPathLookup {
  /**
   * The link operation of the followed predicate, which holds its source.
   */
  link: Algebra.Link;
  /**
   * The followed predicate.
   */
  predicate: RDF.NamedNode;
  /**
   * If the predicate is followed from object to subject.
   */
  inverse: boolean;
  /**
   * If the start term itself is reached, as for ZeroOrMore paths.
   */
  includeStart: boolean;
}

/**
 * Check if the given operation is a ZeroOrMore or OneOrMore path over a single (inverse) predicate in a fixed graph,
 * which can be looked up once its subject or object is bound.
 * @param operation An operation.
 * @return The followed predicate, or undefined if the operation is not such a path.
 */
export function getArbitraryLengthPathLookup(operation: Algebra.Operation): IArbitraryLengthPathLookup | undefined {
  if (!isKnownOperation(operation, Algebra.Types.PATH) || operation.graph.termType === 'Variable') {
    return undefined;
  }
  const predicate = operation.predicate;
  const includeStart = isKnownOperation(predicate, Algebra.Types.ZERO_OR_MORE_PATH);
  if (!includeStart && !isKnownOperation(predicate, Algebra.Types.ONE_OR_MORE_PATH)) {
    return undefined;
  }
  let step = predicate.path;
  let inverse = false;
  if (isKnownOperation(step, Algebra.Types.INV)) {
    step = step.path;
    inverse = true;
  }
  if (!isKnownOperation(step, Algebra.Types.LINK)) {
    return undefined;
  }
  return { link: step, predicate: step.iri, inverse, includeStart };
}

/**
 * An operation that is looked up.
 */
export interface IIndexNestedLoopLookup {
  operation: Algebra.Operation;
  source: IQuerySource;
  context: IActionContext;
  /**
   * If bindings without results for this operation must be kept, as for OPTIONAL.
   */
  optional?: boolean;
  /**
   * If the operation is an arbitrary length path, the predicate it follows.
   */
  path?: IArbitraryLengthPathLookup;
}

/**
 * The results of one lookup, which are joined with the binding the lookup was bound to while being read.
 */
interface ILevel {
  parent: Bindings;
  results: Bindings[];
  index: number;
  optional: boolean;
  produced: boolean;
}

/**
 * An iterator that joins every binding in a stream with a sequence of operations.
 *
 * Lookups are done synchronously when the source supports it,
 * and are otherwise collected from the source's bindings stream.
 */
export class IndexNestedLoopIterator extends AsyncIterator<Bindings> {
  private readonly levels: ILevel[] = [];
  private pending = false;

  /**
   * @param input The stream of bindings to join.
   * @param lookups The operations to look up, in order.
   * @param algebraFactory The algebra factory.
   * @param bindingsFactory The bindings factory, which is only needed if a lookup is not a quad pattern.
   */
  public constructor(
    private readonly input: BindingsStream,
    private readonly lookups: IIndexNestedLoopLookup[],
    private readonly algebraFactory: AlgebraFactory,
    private readonly bindingsFactory?: BindingsFactory,
  ) {
    super();
    input.on('error', error => this.destroy(error));
    input.on('readable', () => {
      this.readable = true;
    });
    input.on('end', () => {
      this.readable = true;
    });
    this.readable = true;
  }

  public override read(): Bindings | null {
    const levels = this.levels;
    const last = this.lookups.length;
    while (!this.done && !this.pending) {
      if (levels.length === 0) {
        const bindings = this.input.read();
        if (bindings === null) {
          if (this.input.done) {
            this.close();
          } else {
            this.readable = false;
          }
          return null;
        }
        this.lookup(bindings);
        continue;
      }

      const level = levels.at(-1)!;
      let joined: Bindings | undefined;
      if (level.index < level.results.length) {
        joined = level.results[level.index++].merge(level.parent);
        if (!joined) {
          continue;
        }
        level.produced = true;
      } else if (level.optional && !level.produced) {
        level.produced = true;
        joined = level.parent;
      } else {
        levels.pop();
        continue;
      }
      if (levels.length === last) {
        return joined;
      }
      this.lookup(joined);
    }
    if (this.pending) {
      this.readable = false;
    }
    return null;
  }

  /**
   * Look up the next operation, bound to the given bindings, as a new level.
   * @param bindings The bindings that the next operation must be bound to.
   */
  protected lookup(bindings: Bindings): void {
    const { operation, source, context, optional = false, path } = this.lookups[this.levels.length];
    const bound = this.bindOperation(operation, bindings);
    const results = path ?
      this.lookupPath(<Algebra.Path> bound, path, source, context) :
      source.queryBindingsSynchronous?.(bound, context);
    if (results) {
      this.levels.push({ parent: bindings, results, index: 0, optional, produced: false });
      return;
    }
    if (path) {
      this.destroy(new Error(`Could not synchronously look up the path ${termToString(path.predicate)}`));
      return;
    }

    // Fall back to the bindings stream of the source.
    const level: ILevel = { parent: bindings, results: [], index: 0, optional, produced: false };
    this.levels.push(level);
    this.pending = true;
    const stream = source.queryBindings(bound, context);
    stream.on('data', (result: Bindings) => level.results.push(result));
    stream.on('error', error => this.destroy(error));
    stream.on('end', () => {
      this.pending = false;
      this.readable = true;
    });
  }

  /**
   * Synchronously look up a bound arbitrary length path,
   * by walking its predicate from the bound subject or object.
   * @param operation A path of which at least the subject or object is bound.
   * @param path The followed predicate.
   * @param source The source of the predicate.
   * @param context The action context.
   * @return The bindings of the path, or undefined if the source can not look up the predicate synchronously.
   */
  protected lookupPath(
    operation: Algebra.Path,
    path: IArbitraryLengthPathLookup,
    source: IQuerySource,
    context: IActionContext,
  ): Bindings[] | undefined {
    const subjectBound = operation.subject.termType !== 'Variable';
    const start = subjectBound ? operation.subject : operation.object;
    const end = subjectBound ? operation.object : operation.subject;
    const reached = this.walkPath(start, path, subjectBound === path.inverse, operation.graph, source, context);
    if (!reached) {
      return undefined;
    }
    if (end.termType === 'Variable') {
      return reached.map(term => this.bindingsFactory!.bindings([[ end, term ]]));
    }
    return reached.some(term => term.equals(end)) ? [ this.bindingsFactory!.bindings() ] : [];
  }

  /**
   * Determine all terms that are reachable from the given term by following the given predicate.
   * @param start The term to start from.
   * @param path The followed predicate.
   * @param backwards If the predicate is followed from object to subject.
   * @param graph The graph to follow the predicate in.
   * @param source The source of the predicate.
   * @param context The action context.
   * @return The distinct reached terms, or undefined if the source can not look up the predicate synchronously.
   */
  protected walkPath(
    start: RDF.Term,
    path: IArbitraryLengthPathLookup,
    backwards: boolean,
    graph: RDF.Term,
    source: IQuerySource,
    context: IActionContext,
  ): RDF.Term[] | undefined {
    const variable = this.algebraFactory.dataFactory.variable!('__indexNestedLoopPathTerm');
    const reached: RDF.Term[] = [];
    const seen = new Set<string>();
    if (path.includeStart) {
      reached.push(start);
      seen.add(termToString(start));
    }
    const todo = [ start ];
    while (todo.length > 0) {
      const term = todo.pop()!;
      const pattern = backwards ?
        this.algebraFactory.createPattern(variable, path.predicate, term, graph) :
        this.algebraFactory.createPattern(term, path.predicate, variable, graph);
      const results = source.queryBindingsSynchronous?.(pattern, context);
      if (!results) {
        return undefined;
      }
      for (const result of results) {
        const next = result.get(variable)!;
        const key = termToString(next);
        if (!seen.has(key)) {
          seen.add(key);
          reached.push(next);
          todo.push(next);
        }
      }
    }
    return reached;
  }

  /**
   * Replace the variables of the given operation by their values in the given bindings.
   * @param operation An operation.
   * @param bindings The bindings to bind with.
   */
  protected bindOperation(operation: Algebra.Operation, bindings: Bindings): Algebra.Operation {
    // Patterns are bound directly, as they are the most common lookups.
    if (isKnownOperation(operation, Algebra.Types.PATTERN)) {
      return Object.assign(this.algebraFactory.createPattern(
        materializeTerm(operation.subject, bindings),
        materializeTerm(operation.predicate, bindings),
        materializeTerm(operation.object, bindings),
        materializeTerm(operation.graph, bindings),
      ), { metadata: operation.metadata });
    }
    return materializeOperation(operation, bindings, this.algebraFactory, this.bindingsFactory!);
  }

  /**
   * Check if the given lookups need a bindings factory, which is the case if one of them is not a quad pattern.
   * @param lookups The operations to look up.
   */
  public static needsBindingsFactory(lookups: IIndexNestedLoopLookup[]): boolean {
    return lookups.some(lookup => !isKnownOperation(lookup.operation, Algebra.Types.PATTERN));
  }

  protected override _end(destroy?: boolean): void {
    super._end(destroy);
    this.input.destroy();
  }
}
