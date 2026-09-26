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
 * An iterator that joins any number of streams that are all sorted on one join key, by skipping ahead:
 * a candidate key is checked against the streams in the order they were given, where every stream that is
 * behind it skips ahead to it, and a stream that is past it makes its own key the next candidate.
 * Once all streams are at the candidate, the runs of that key are emitted as a cross product.
 *
 * Unlike a chain of binary merge joins, every stream skips ahead to a key that all streams before it share,
 * so a selective stream saves reads in all others at once. Since a stream is only read at keys that all
 * streams before it have, the streams should be given with the most selective ones first: a key that the
 * first streams do not share then never reaches the others, as in a chain of merge joins.
 *
 * `read` is fully synchronous: it only stops when a source has nothing buffered, and resumes when that
 * source becomes readable again.
 *
 * As in the merge join, a stream is only asked to skip once it has fallen behind a number of times in a row,
 * since a skip has a fixed cost that only pays off over a gap of more than a few bindings.
 */
export class SeekMergeJoinIterator extends AsyncIterator<Bindings> {
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
   * The key that the streams are checked against, from the binding of the stream that set it.
   */
  private candidate: Bindings | undefined;
  /**
   * The number of streams, from the first one onwards, that are at the candidate key.
   */
  private matched = 0;
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
   * @param sources The streams to join, all sorted on the join key, most selective first.
   * @param compareKeys Compares the join keys of two bindings.
   * @param seekAfterBehind The number of times in a row that a stream must fall behind before it is asked to skip.
   */
  public constructor(
    sources: AsyncIterator<Bindings>[],
    compareKeys: (left: Bindings, right: Bindings) => number,
    seekAfterBehind = SeekMergeJoinIterator.SEEK_AFTER_BEHIND,
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
    if (this.candidate === undefined || this.compareKeys(this.candidate, target) < 0) {
      this.candidate = target;
      this.matched = 0;
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
        this.matched = 0;
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

      // Check the candidate against the streams in order, so that a stream is only read at keys that
      // all streams before it have.
      while (this.matched < count) {
        const index = this.matched;
        const head = this.head(index);
        if (head === PENDING) {
          return null;
        }
        if (head === null) {
          this._end();
          return null;
        }
        const comparison = this.candidate === undefined ? 1 : this.compareKeys(head, this.candidate);
        if (comparison < 0) {
          this.advance(index, this.candidate!);
        } else if (comparison > 0) {
          // The streams before this one must now catch up with its key.
          this.candidate = head;
          this.matched = index === 0 ? 1 : 0;
        } else {
          this.matched++;
        }
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
