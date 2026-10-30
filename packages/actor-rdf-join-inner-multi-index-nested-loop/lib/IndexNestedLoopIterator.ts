import type { Bindings, BindingsStream, IActionContext, IQuerySource } from '@comunica/types';
import type { AlgebraFactory } from '@comunica/utils-algebra';
import { Algebra, isKnownOperation } from '@comunica/utils-algebra';
import type { BindingsFactory } from '@comunica/utils-bindings-factory';
import { materializeOperation, materializeTerm } from '@comunica/utils-query-operation';
import { AsyncIterator } from 'asynciterator';

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
    const { operation, source, context, optional = false } = this.lookups[this.levels.length];
    const bound = this.bindOperation(operation, bindings);
    const results = source.queryBindingsSynchronous?.(bound, context);
    if (results) {
      this.levels.push({ parent: bindings, results, index: 0, optional, produced: false });
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
