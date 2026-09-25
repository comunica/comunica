import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import type { Bindings } from '@comunica/types';
import { isSeekableBindingsStream } from '@comunica/utils-iterator';
import { AsyncIterator } from 'asynciterator';

/**
 * Marks that a source has no binding available yet, as opposed to having none left.
 */
const PENDING = Symbol('pending');

const SEEKING = 0;
const COLLECTING = 1;
const EMITTING = 2;

/**
 * An iterator that joins any number of streams that are all sorted on one join key, by leapfrogging:
 * every stream that is behind the furthest one skips ahead to it, until all of them are at the same key.
 * The runs of that key are then emitted as a cross product, after which the streams move on.
 *
 * Unlike a chain of binary merge joins, every stream skips ahead to the furthest key among all of them,
 * so a selective stream saves reads in all others at once.
 *
 * `read` is fully synchronous: it only stops when a source has nothing buffered, and resumes when that
 * source becomes readable again.
 *
 * As in the merge join, a stream is only asked to skip once it has fallen behind a number of times in a row,
 * since a skip has a fixed cost that only pays off over a gap of more than a few bindings.
 */
export class LeapfrogJoinIterator extends AsyncIterator<Bindings> {
  /**
   * The number of times in a row that a stream must fall behind before it is asked to skip ahead.
   */
  public static readonly SEEK_AFTER_BEHIND = 3;

  private readonly sources: AsyncIterator<Bindings>[];
  private readonly compareKeys: (left: Bindings, right: Bindings) => number;
  private readonly seekAfterBehind: number;

  /**
   * The binding each source is at, undefined if it must still be read, or null if the source ended.
   */
  private readonly heads: (Bindings | null | undefined)[];
  private readonly behind: number[];
  private phase: number = SEEKING;
  /**
   * The bindings that share the current key, per source.
   */
  private readonly runs: Bindings[][];
  /**
   * The source whose run is being collected.
   */
  private collecting = 0;
  /**
   * The runs in the order they are combined in: shortest first, so that the joins of the runs that only hold
   * a single binding are shared by all combinations, rather than redone for each.
   */
  private combined: Bindings[][] = [];
  /**
   * The current combination of the cross product, as an index into every combined run.
   */
  private readonly combination: number[];
  /**
   * The join of the first i + 1 bindings of the current combination, valid up to `depth`.
   */
  private readonly prefixes: Bindings[];
  private depth = 0;

  /**
   * @param sources The streams to join, all sorted on the join key.
   * @param compareKeys Compares the join keys of two bindings.
   * @param seekAfterBehind The number of times in a row that a stream must fall behind before it is asked to skip.
   */
  public constructor(
    sources: AsyncIterator<Bindings>[],
    compareKeys: (left: Bindings, right: Bindings) => number,
    seekAfterBehind = LeapfrogJoinIterator.SEEK_AFTER_BEHIND,
  ) {
    super();
    this.sources = sources;
    this.compareKeys = compareKeys;
    this.seekAfterBehind = seekAfterBehind;
    this.heads = Array.from({ length: sources.length });
    this.behind = sources.map(() => 0);
    this.runs = sources.map(() => []);
    this.combination = sources.map(() => 0);
    this.prefixes = [];

    for (const source of sources) {
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
   * The binding a source is at, reading it if it has not been read yet.
   * @param index The index of the source.
   */
  protected head(index: number): Bindings | null | typeof PENDING {
    const held = this.heads[index];
    if (held !== undefined) {
      return held;
    }
    const source = this.sources[index];
    const item = source.read();
    if (item === null && !source.done) {
      this.readable = false;
      return PENDING;
    }
    this.heads[index] = item;
    return item;
  }

  /**
   * Drop the binding a source is at, and skip ahead to `target` when the source supports it,
   * and has fallen behind often enough in a row for a skip to be worth its cost.
   * @param index The index of the source.
   * @param target The binding that the furthest source is at.
   */
  protected advance(index: number, target: Bindings): void {
    this.heads[index] = undefined;
    const source = this.sources[index];
    if (++this.behind[index] >= this.seekAfterBehind && isSeekableBindingsStream(source)) {
      source.seek(target);
      this.behind[index] = 0;
    }
  }

  /**
   * Skip ahead to the first binding whose key is not before that of the given one.
   * This is a hint: bindings of which the run was already found are still emitted.
   * @param target The binding to skip to.
   */
  public seek(target: Bindings): void {
    if (this.phase !== SEEKING) {
      return;
    }
    for (let index = 0; index < this.sources.length; index++) {
      const held = this.heads[index];
      if (held === undefined || (held !== null && this.compareKeys(held, target) < 0)) {
        this.heads[index] = undefined;
        const source = this.sources[index];
        if (isSeekableBindingsStream(source)) {
          source.seek(target);
        }
      }
    }
  }

  /**
   * The next binding of the cross product of the runs, or undefined once all combinations were produced.
   */
  protected nextCombination(): Bindings | undefined {
    const runs = this.combined;
    const combination = this.combination;
    const prefixes = this.prefixes;
    const last = runs.length - 1;
    let position = this.depth;
    for (;;) {
      if (combination[position] >= runs[position].length) {
        // All bindings at this position were combined with the current prefix, so move on to the next prefix.
        if (position === 0) {
          this.depth = 0;
          return undefined;
        }
        combination[position] = 0;
        position--;
        combination[position]++;
        continue;
      }
      const binding = runs[position][combination[position]];
      const joined = position === 0 ? binding : ActorRdfJoin.joinBindings(prefixes[position - 1], binding);
      if (joined === null) {
        combination[position]++;
        continue;
      }
      if (position === last) {
        combination[position]++;
        this.depth = position;
        return joined;
      }
      prefixes[position] = joined;
      position++;
    }
  }

  public override read(): Bindings | null {
    const count = this.sources.length;
    while (!this.done) {
      if (this.phase === EMITTING) {
        const joined = this.nextCombination();
        if (joined !== undefined) {
          return joined;
        }
        this.phase = SEEKING;
        continue;
      }

      if (this.phase === COLLECTING) {
        // Collect the run of the current key from every source, keeping the first binding past it as its head.
        while (this.collecting < count) {
          const index = this.collecting;
          const next = this.head(index);
          if (next === PENDING) {
            return null;
          }
          if (next !== null && this.compareKeys(this.runs[index][0], next) === 0) {
            this.runs[index].push(next);
            this.heads[index] = undefined;
            continue;
          }
          this.collecting++;
        }
        this.combined = [ ...this.runs ].sort((left, right) => left.length - right.length);
        this.combination.fill(0);
        this.depth = 0;
        this.phase = EMITTING;
        continue;
      }

      // Find the furthest key, and make every source that is behind it catch up.
      let furthest: Bindings | undefined;
      for (let index = 0; index < count; index++) {
        const head = this.head(index);
        if (head === PENDING) {
          return null;
        }
        if (head === null) {
          this._end();
          return null;
        }
        if (furthest === undefined || this.compareKeys(head, furthest) > 0) {
          furthest = head;
        }
      }
      let aligned = true;
      for (let index = 0; index < count; index++) {
        if (this.compareKeys(<Bindings> this.heads[index], furthest!) < 0) {
          this.advance(index, furthest!);
          aligned = false;
        }
      }
      if (!aligned) {
        continue;
      }

      // All sources are at the same key.
      for (let index = 0; index < count; index++) {
        this.runs[index] = [ <Bindings> this.heads[index] ];
        this.heads[index] = undefined;
        this.behind[index] = 0;
      }
      this.collecting = 0;
      this.phase = COLLECTING;
    }
    return null;
  }

  protected override _end(destroy?: boolean): void {
    super._end(destroy);
    for (const source of this.sources) {
      source.destroy();
    }
  }
}
