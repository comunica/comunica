import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import type { ITermComparator } from '@comunica/bus-term-comparator-factory';
import type { Bindings, TermsOrder } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { AsyncIterator } from 'asynciterator';

/**
 * A bindings stream that can skip ahead to a key, instead of being consumed one binding at a time.
 *
 * A merge join spends most of its time advancing whichever side is behind. When a source knows where a
 * key lives, for example because it is backed by a sorted array or an index it can descend, it can drop
 * everything before that key at once instead of handing them over to be compared and discarded.
 */
export interface ISeekableBindingsIterator extends AsyncIterator<Bindings> {
  /**
   * Skip past every remaining binding that precedes `target` in this stream's declared order.
   *
   * After this call the next read returns the first binding that does not precede `target`, or nothing
   * if the stream holds no such binding. Implementations may skip fewer bindings than they could, but
   * must never skip one that does not precede `target`.
   * @param target The bindings to skip ahead to.
   */
  seek: (target: Bindings) => void;
}

function isSeekable(iterator: AsyncIterator<Bindings>): iterator is ISeekableBindingsIterator {
  return typeof (<ISeekableBindingsIterator> iterator).seek === 'function';
}

/**
 * Compares two bindings by the terms they bind to the given merge key.
 * Returns a negative number if `left` precedes `right` in the streams' order, 0 if they share the same key.
 * @param termComparator A comparator following the SPARQL order semantics.
 * @param mergeKey The (non-empty) order prefix that both streams are sorted on.
 */
export function createKeyComparator(
  termComparator: ITermComparator,
  mergeKey: TermsOrder<RDF.Variable>,
): (left: Bindings, right: Bindings) => number {
  return (left: Bindings, right: Bindings): number => {
    for (const { term, direction } of mergeKey) {
      const comparison = termComparator.orderTypes(left.get(term), right.get(term));
      if (comparison !== 0) {
        return direction === 'asc' ? comparison : -comparison;
      }
    }
    return 0;
  };
}

/**
 * Marks that a source has no binding available yet, as opposed to having none left.
 */
const PENDING = Symbol('pending');

const SEEKING = 0;
const COLLECTING = 1;
const EMITTING = 2;

/**
 * An iterator that merge-joins two streams that are sorted on a common join key.
 *
 * Both sides are read once, sequentially, always advancing the side that is behind. Whenever both sides
 * are at the same key, the full run of equal keys from `buffered` is materialized, and the run of equal
 * keys from `streamed` is emitted against it as a cross product.
 *
 * `read` is fully synchronous: it only stops when a source has nothing buffered, and resumes when that
 * source becomes readable again. It never awaits per binding.
 */
export class MergeJoinIterator extends AsyncIterator<Bindings> {
  private readonly streamed: AsyncIterator<Bindings>;
  private readonly buffered: AsyncIterator<Bindings>;
  private readonly compareKeys: (left: Bindings, right: Bindings) => number;

  private streamedItem: Bindings | null | undefined;
  private bufferedItem: Bindings | null | undefined;
  private run: Bindings[] = [];
  private runIndex = 0;
  private phase: number = SEEKING;

  public constructor(
    streamed: AsyncIterator<Bindings>,
    buffered: AsyncIterator<Bindings>,
    compareKeys: (left: Bindings, right: Bindings) => number,
  ) {
    super();
    this.streamed = streamed;
    this.buffered = buffered;
    this.compareKeys = compareKeys;

    for (const source of [ streamed, buffered ]) {
      source.on('error', error => this.destroy(error));
      // Both events mean another read may now succeed, so let the consumer try again.
      source.on('readable', () => {
        this.readable = true;
      });
      source.on('end', () => {
        this.readable = true;
      });
    }
    this.readable = true;
  }

  /**
   * Read the next binding of a source, reusing the one already held if it has not been consumed.
   * @param fromStreamed Whether to read the streamed side rather than the buffered side.
   */
  protected readSide(fromStreamed: boolean): Bindings | null | typeof PENDING {
    const held = fromStreamed ? this.streamedItem : this.bufferedItem;
    if (held !== undefined) {
      return held;
    }
    const source = fromStreamed ? this.streamed : this.buffered;
    let item: Bindings | null = source.read();
    if (item === null) {
      if (!source.done) {
        this.readable = false;
        return PENDING;
      }
      item = null;
    }
    if (fromStreamed) {
      this.streamedItem = item;
    } else {
      this.bufferedItem = item;
    }
    return item;
  }

  /**
   * Drop the binding currently held for a source, and skip ahead to `target` when the source supports it.
   * @param fromStreamed Whether to advance the streamed side rather than the buffered side.
   * @param target The bindings that the other side is at.
   */
  protected advance(fromStreamed: boolean, target: Bindings): void {
    if (fromStreamed) {
      this.streamedItem = undefined;
    } else {
      this.bufferedItem = undefined;
    }
    const source = fromStreamed ? this.streamed : this.buffered;
    if (isSeekable(source)) {
      source.seek(target);
    }
  }

  public override read(): Bindings | null {
    while (!this.done) {
      if (this.phase === EMITTING) {
        // Emit the buffered run against the streamed binding that shares its key.
        while (this.runIndex < this.run.length) {
          const joined = ActorRdfJoin.joinBindings(<Bindings> this.streamedItem, this.run[this.runIndex++]);
          if (joined !== null) {
            return joined;
          }
        }
        this.streamedItem = undefined;
        const next = this.readSide(true);
        if (next === PENDING) {
          return null;
        }
        if (next === null || this.compareKeys(next, this.run[0]) !== 0) {
          this.phase = SEEKING;
        } else {
          this.runIndex = 0;
        }
        continue;
      }

      if (this.phase === COLLECTING) {
        // Materialize the run of equal keys on the buffered side.
        const next = this.readSide(false);
        if (next === PENDING) {
          return null;
        }
        if (next !== null && this.compareKeys(this.run[0], next) === 0) {
          this.run.push(next);
          this.bufferedItem = undefined;
          continue;
        }
        this.phase = EMITTING;
        this.runIndex = 0;
        continue;
      }

      const streamed = this.readSide(true);
      if (streamed === PENDING) {
        return null;
      }
      const buffered = this.readSide(false);
      if (buffered === PENDING) {
        return null;
      }
      if (streamed === null || buffered === null) {
        this._end();
        return null;
      }

      const comparison = this.compareKeys(streamed, buffered);
      if (comparison < 0) {
        this.advance(true, buffered);
        continue;
      }
      if (comparison > 0) {
        this.advance(false, streamed);
        continue;
      }
      this.run = [ buffered ];
      this.bufferedItem = undefined;
      this.phase = COLLECTING;
    }
    return null;
  }

  protected override _end(destroy?: boolean): void {
    super._end(destroy);
    this.streamed.destroy();
    this.buffered.destroy();
  }
}
