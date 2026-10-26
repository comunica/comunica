import type { Bindings, BindingsStream, IActionContext, IQuerySource } from '@comunica/types';
import type { Algebra, AlgebraFactory } from '@comunica/utils-algebra';
import { materializeTerm } from '@comunica/utils-query-operation';
import { AsyncIterator } from 'asynciterator';

/**
 * A quad pattern that is looked up for every binding that reaches it.
 */
export interface IIndexNestedLoopLookup {
  pattern: Algebra.Pattern;
  source: IQuerySource;
  context: IActionContext;
  /**
   * If bindings without results for this pattern must be kept, as for OPTIONAL.
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
 * An iterator that joins every binding of a stream with a sequence of quad patterns,
 * by binding the first pattern to it, looking it up, binding the next pattern to each result, and so on.
 *
 * Lookups are done synchronously when the source supports it,
 * and are otherwise collected from the source's bindings stream.
 */
export class IndexNestedLoopIterator extends AsyncIterator<Bindings> {
  private readonly levels: ILevel[] = [];
  private pending = false;

  /**
   * @param input The stream of bindings to join.
   * @param lookups The patterns to look up, in order.
   * @param algebraFactory The algebra factory.
   */
  public constructor(
    private readonly input: BindingsStream,
    private readonly lookups: IIndexNestedLoopLookup[],
    private readonly algebraFactory: AlgebraFactory,
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
   * Look up the next pattern, bound to the given bindings, as a new level.
   * @param bindings The bindings that the next pattern must be bound to.
   */
  protected lookup(bindings: Bindings): void {
    const { pattern, source, context, optional = false } = this.lookups[this.levels.length];
    const bound = this.bindPattern(pattern, bindings);
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
   * Replace the variables of the given pattern by their values in the given bindings.
   * @param pattern A quad pattern.
   * @param bindings The bindings to bind with.
   */
  protected bindPattern(pattern: Algebra.Pattern, bindings: Bindings): Algebra.Pattern {
    return Object.assign(this.algebraFactory.createPattern(
      materializeTerm(pattern.subject, bindings),
      materializeTerm(pattern.predicate, bindings),
      materializeTerm(pattern.object, bindings),
      materializeTerm(pattern.graph, bindings),
    ), { metadata: pattern.metadata });
  }

  protected override _end(destroy?: boolean): void {
    super._end(destroy);
    this.input.destroy();
  }
}
