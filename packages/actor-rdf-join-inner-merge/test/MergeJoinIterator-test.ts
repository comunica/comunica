import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import type { Bindings } from '@comunica/types';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import type * as RDF from '@rdfjs/types';
import arrayifyStream from 'arrayify-stream';
import { ArrayIterator, BufferedIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { termToString } from 'rdf-string';
import { createKeyComparator, MergeJoinIterator } from '../lib/MergeJoinIterator';
import '@comunica/utils-jest';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);

// A comparator that follows the lexicographical fallback documented for the `order` metadata entry.
const termComparator = {
  orderTypes(termA: RDF.Term | undefined, termB: RDF.Term | undefined): -1 | 0 | 1 {
    const stringA = termToString(termA) ?? '';
    const stringB = termToString(termB) ?? '';
    if (stringA < stringB) {
      return -1;
    }
    return stringA > stringB ? 1 : 0;
  },
};

const ASC_A = [{ term: DF.variable('a'), direction: <const> 'asc' }];
const DESC_A = [{ term: DF.variable('a'), direction: <const> 'desc' }];
const compare = createKeyComparator(termComparator, ASC_A);

function bindA(a: number, other: string, otherValue: string): Bindings {
  return BF.bindings([
    [ DF.variable('a'), DF.literal(String(a)) ],
    [ DF.variable(other), DF.literal(otherValue) ],
  ]);
}

// Keys are compared lexicographically, so wide numeric ranges must be zero-padded to stay sorted.
function bindPadded(a: number, other: string, otherValue: string): Bindings {
  return BF.bindings([
    [ DF.variable('a'), DF.literal(String(a).padStart(6, '0')) ],
    [ DF.variable(other), DF.literal(otherValue) ],
  ]);
}

function joined(a: number, b: string, c: string): Bindings {
  return BF.bindings([
    [ DF.variable('a'), DF.literal(String(a)) ],
    [ DF.variable('b'), DF.literal(b) ],
    [ DF.variable('c'), DF.literal(c) ],
  ]);
}

/**
 * An iterator whose items, ending and errors are driven by the test.
 */
class ControlledIterator extends BufferedIterator<Bindings> {
  public constructor() {
    super({ autoStart: false });
  }

  public add(bindings: Bindings): void {
    this._push(bindings);
  }

  public finish(): void {
    this.close();
  }

  public fail(error: Error): void {
    this.emit('error', error);
  }
}

/**
 * A sorted source that can skip ahead to a key by binary search instead of being read one by one.
 */
class SeekableIterator extends ArrayIterator<Bindings> {
  public seeks = 0;
  public skipped = 0;
  private position = 0;
  private readonly items: Bindings[];

  public constructor(items: Bindings[]) {
    super(items, { autoStart: false });
    this.items = items;
  }

  public override read(): Bindings | null {
    if (this.position >= this.items.length) {
      this.close();
      return null;
    }
    return this.items[this.position++];
  }

  public seek(target: Bindings): void {
    this.seeks++;
    let low = this.position;
    let high = this.items.length;
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (compare(this.items[mid], target) < 0) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    this.skipped += low - this.position;
    this.position = low;
  }
}

describe('createKeyComparator', () => {
  it('orders ascending on the key', () => {
    expect(compare(bindA(1, 'b', 'x'), bindA(2, 'b', 'x'))).toBe(-1);
    expect(compare(bindA(2, 'b', 'x'), bindA(1, 'b', 'x'))).toBe(1);
  });

  it('inverts the comparison for descending keys', () => {
    const descending = createKeyComparator(termComparator, DESC_A);
    expect(descending(bindA(1, 'b', 'x'), bindA(2, 'b', 'x'))).toBe(1);
    expect(descending(bindA(2, 'b', 'x'), bindA(1, 'b', 'x'))).toBe(-1);
  });

  it('considers bindings with equal keys but different other values equal', () => {
    expect(compare(bindA(1, 'b', 'x'), bindA(1, 'b', 'y'))).toBe(0);
  });

  it('falls through to the next key of a composite order', () => {
    const composite = createKeyComparator(termComparator, [
      { term: DF.variable('a'), direction: 'asc' },
      { term: DF.variable('b'), direction: 'asc' },
    ]);
    expect(composite(bindA(1, 'b', 'x'), bindA(1, 'b', 'y'))).toBe(-1);
    expect(composite(bindA(1, 'b', 'y'), bindA(1, 'b', 'x'))).toBe(1);
    expect(composite(bindA(1, 'b', 'x'), bindA(1, 'b', 'x'))).toBe(0);
  });
});

describe('MergeJoinIterator', () => {
  it('merges runs of equal keys as a cross product, skipping non-matching keys', async() => {
    // Keys 1 and 4 only occur left, key 3 only occurs right, key 2 occurs twice on both sides.
    const streamed = new ArrayIterator<Bindings>([
      bindA(1, 'b', 'l1'),
      bindA(2, 'b', 'l2'),
      bindA(2, 'b', 'l3'),
      bindA(4, 'b', 'l4'),
    ], { autoStart: false });
    const buffered = new ArrayIterator<Bindings>([
      bindA(2, 'c', 'r1'),
      bindA(2, 'c', 'r2'),
      bindA(3, 'c', 'r3'),
    ], { autoStart: false });

    await expect(arrayifyStream(new MergeJoinIterator(streamed, buffered, compare))).resolves.toEqualBindingsArray([
      joined(2, 'l2', 'r1'),
      joined(2, 'l2', 'r2'),
      joined(2, 'l3', 'r1'),
      joined(2, 'l3', 'r2'),
    ]);
  });

  it('handles a buffered run that continues until the end of its stream', async() => {
    const streamed = new ArrayIterator<Bindings>([ bindA(2, 'b', 'l1') ], { autoStart: false });
    const buffered = new ArrayIterator<Bindings>([
      bindA(2, 'c', 'r1'),
      bindA(2, 'c', 'r2'),
    ], { autoStart: false });

    await expect(arrayifyStream(new MergeJoinIterator(streamed, buffered, compare))).resolves.toEqualBindingsArray([
      joined(2, 'l1', 'r1'),
      joined(2, 'l1', 'r2'),
    ]);
  });

  it('drops bindings within a run that disagree on a non-key variable', async() => {
    const streamed = new ArrayIterator<Bindings>([ bindA(2, 'b', 'shared') ], { autoStart: false });
    const buffered = new ArrayIterator<Bindings>([
      bindA(2, 'b', 'other'),
      bindA(2, 'b', 'shared'),
    ], { autoStart: false });

    await expect(arrayifyStream(new MergeJoinIterator(streamed, buffered, compare))).resolves.toEqualBindingsArray([
      bindA(2, 'b', 'shared'),
    ]);
  });

  it('produces nothing for streams without a common key', async() => {
    const streamed = new ArrayIterator<Bindings>([ bindA(1, 'b', 'l1') ], { autoStart: false });
    const buffered = new ArrayIterator<Bindings>([ bindA(2, 'c', 'r1') ], { autoStart: false });
    await expect(arrayifyStream(new MergeJoinIterator(streamed, buffered, compare))).resolves.toEqualBindingsArray([]);
  });

  it('produces nothing for empty streams', async() => {
    const streamed = new ArrayIterator<Bindings>([], { autoStart: false });
    const buffered = new ArrayIterator<Bindings>([], { autoStart: false });
    await expect(arrayifyStream(new MergeJoinIterator(streamed, buffered, compare))).resolves.toEqualBindingsArray([]);
  });

  it('returns null when read after it has ended', async() => {
    const streamed = new ArrayIterator<Bindings>([ bindA(1, 'b', 'l1') ], { autoStart: false });
    const buffered = new ArrayIterator<Bindings>([ bindA(1, 'c', 'r1') ], { autoStart: false });
    const merged = new MergeJoinIterator(streamed, buffered, compare);
    await arrayifyStream(merged);
    expect(merged.read()).toBeNull();
  });

  it('destroys both sources once it ends', async() => {
    const streamed = new ArrayIterator<Bindings>([ bindA(1, 'b', 'l1') ], { autoStart: false });
    const buffered = new ArrayIterator<Bindings>([ bindA(1, 'c', 'r1') ], { autoStart: false });
    await arrayifyStream(new MergeJoinIterator(streamed, buffered, compare));
    expect(streamed.done).toBe(true);
    expect(buffered.done).toBe(true);
  });

  it('emits errors from the streamed source', async() => {
    const streamed = new ControlledIterator();
    const buffered = new ArrayIterator<Bindings>([ bindA(1, 'c', 'r1') ], { autoStart: false });
    const result = arrayifyStream(new MergeJoinIterator(streamed, buffered, compare));
    await new Promise(resolve => setImmediate(resolve));
    streamed.fail(new Error('merge source error'));
    await expect(result).rejects.toThrow('merge source error');
  });

  it('waits for sources that have nothing buffered yet', async() => {
    const streamed = new ControlledIterator();
    const buffered = new ControlledIterator();
    const result = arrayifyStream(new MergeJoinIterator(streamed, buffered, compare));
    // Feed both sides in stages, so every read has to pause and resume at least once.
    await new Promise(resolve => setImmediate(resolve));
    streamed.add(bindA(1, 'b', 'l1'));
    await new Promise(resolve => setImmediate(resolve));
    buffered.add(bindA(1, 'c', 'r1'));
    await new Promise(resolve => setImmediate(resolve));
    buffered.add(bindA(1, 'c', 'r2'));
    await new Promise(resolve => setImmediate(resolve));
    streamed.add(bindA(1, 'b', 'l2'));
    await new Promise(resolve => setImmediate(resolve));
    streamed.finish();
    buffered.finish();
    await expect(result).resolves.toEqualBindingsArray([
      joined(1, 'l1', 'r1'),
      joined(1, 'l1', 'r2'),
      joined(1, 'l2', 'r1'),
      joined(1, 'l2', 'r2'),
    ]);
  });

  it('merges more items than fit in a single buffer fill', async() => {
    const items = 200;
    const build = (other: string): Bindings[] =>
      [ ...Array.from({ length: items }).keys() ].map(i => bindPadded(i, other, `v${i}`));
    const streamed = new ArrayIterator<Bindings>(build('b'), { autoStart: false });
    const buffered = new ArrayIterator<Bindings>(build('c'), { autoStart: false });
    await expect(arrayifyStream(new MergeJoinIterator(streamed, buffered, compare))).resolves.toHaveLength(items);
  });

  it('matches a nested loop join over randomized inputs with duplicate keys on both sides', async() => {
    // A deterministic pseudo-random generator, so a failure is reproducible.
    let seed = 42;
    const random = (bound: number): number => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed % bound;
    };
    const build = (count: number, extraVariable: string): Bindings[] => [ ...Array.from({ length: count }).keys() ]
      .map(() => BF.bindings([
        // A small key domain forces long runs of equal keys on both sides.
        [ DF.variable('a'), DF.literal(`k${random(5)}`) ],
        // A shared variable outside the key, so some pairs within a run are incompatible.
        [ DF.variable('b'), DF.literal(`v${random(3)}`) ],
        [ DF.variable(extraVariable), DF.literal(`u${random(100)}`) ],
      ]))
      .sort((left, right) => compare(left, right));

    const leftItems = build(40, 'l');
    const rightItems = build(40, 'r');

    // Reference implementation: every pair, keeping the compatible ones.
    const expected: Bindings[] = [];
    for (const leftItem of leftItems) {
      for (const rightItem of rightItems) {
        const result = ActorRdfJoin.joinBindings(leftItem, rightItem);
        if (result !== null) {
          expected.push(result);
        }
      }
    }
    expect(expected.length).toBeGreaterThan(0);

    const actual = await arrayifyStream(new MergeJoinIterator(
      new ArrayIterator<Bindings>(leftItems, { autoStart: false }),
      new ArrayIterator<Bindings>(rightItems, { autoStart: false }),
      compare,
    ));
    // Bindings within a run may be emitted in any order, so compare as multisets.
    const asMultiset = (bindings: Bindings[]): string[] => bindings
      .map(item => [ ...item ].map(([ key, value ]) => `${key.value}=${value.value}`).sort().join('|'))
      .sort();
    expect(asMultiset(actual)).toEqual(asMultiset(expected));
  });

  describe('with a seekable source', () => {
    it('skips ahead on both sides instead of reading every binding', async() => {
      // Two sparse key sets that only meet at 500, so almost everything can be skipped.
      const streamed = new SeekableIterator(
        [ ...Array.from({ length: 1000 }).keys() ].map(i => bindPadded(i * 2, 'b', `l${i}`)),
      );
      const buffered = new SeekableIterator(
        [ ...Array.from({ length: 1000 }).keys() ].map(i => bindPadded(i * 2 + 1, 'c', `r${i}`)),
      );
      const merged = new MergeJoinIterator(streamed, buffered, compare);
      await expect(arrayifyStream(merged)).resolves.toEqualBindingsArray([]);
      expect(streamed.seeks + buffered.seeks).toBeGreaterThan(0);
    });

    it('produces the same results as a non-seekable source', async() => {
      const left = [ ...Array.from({ length: 300 }).keys() ].map(i => bindPadded(i * 3, 'b', `l${i}`));
      const right = [ ...Array.from({ length: 300 }).keys() ].map(i => bindPadded(i * 2, 'c', `r${i}`));
      const withSeek = await arrayifyStream(new MergeJoinIterator(
        new SeekableIterator(left),
        new SeekableIterator(right),
        compare,
      ));
      const withoutSeek = await arrayifyStream(new MergeJoinIterator(
        new ArrayIterator<Bindings>(left, { autoStart: false }),
        new ArrayIterator<Bindings>(right, { autoStart: false }),
        compare,
      ));
      expect(withSeek).toEqualBindingsArray(withoutSeek);
      expect(withSeek.length).toBeGreaterThan(0);
    });
  });
});
