import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import type { Bindings } from '@comunica/types';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import type * as RDF from '@rdfjs/types';
import arrayifyStream from 'arrayify-stream';
import { ArrayIterator, BufferedIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { termToString } from 'rdf-string';
import { createKeyComparator, MergeJoinIterator, readOrWait } from '../lib/MergeJoinIterator';
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

function bindA(a: number, other: string, otherValue: string): Bindings {
  return BF.bindings([
    [ DF.variable('a'), DF.literal(String(a)) ],
    [ DF.variable(other), DF.literal(otherValue) ],
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

  public poke(): void {
    this.emit('readable');
  }
}

describe('createKeyComparator', () => {
  it('orders ascending on the key', () => {
    const compare = createKeyComparator(termComparator, ASC_A);
    expect(compare(bindA(1, 'b', 'x'), bindA(2, 'b', 'x'))).toBe(-1);
    expect(compare(bindA(2, 'b', 'x'), bindA(1, 'b', 'x'))).toBe(1);
  });

  it('inverts the comparison for descending keys', () => {
    const compare = createKeyComparator(termComparator, DESC_A);
    expect(compare(bindA(1, 'b', 'x'), bindA(2, 'b', 'x'))).toBe(1);
    expect(compare(bindA(2, 'b', 'x'), bindA(1, 'b', 'x'))).toBe(-1);
  });

  it('considers bindings with equal keys but different other values equal', () => {
    const compare = createKeyComparator(termComparator, ASC_A);
    expect(compare(bindA(1, 'b', 'x'), bindA(1, 'b', 'y'))).toBe(0);
  });

  it('falls through to the next key of a composite order', () => {
    const compare = createKeyComparator(termComparator, [
      { term: DF.variable('a'), direction: 'asc' },
      { term: DF.variable('b'), direction: 'asc' },
    ]);
    expect(compare(bindA(1, 'b', 'x'), bindA(1, 'b', 'y'))).toBe(-1);
    expect(compare(bindA(1, 'b', 'y'), bindA(1, 'b', 'x'))).toBe(1);
    expect(compare(bindA(1, 'b', 'x'), bindA(1, 'b', 'x'))).toBe(0);
  });
});

describe('readOrWait', () => {
  it('reads a buffered item synchronously', () => {
    const iterator = new ArrayIterator<Bindings>([ bindA(1, 'b', 'x') ], { autoStart: false });
    expect(<Bindings> readOrWait(iterator)).toEqualBindings(bindA(1, 'b', 'x'));
    iterator.destroy();
  });

  it('returns null synchronously for an iterator that already ended', async() => {
    const iterator = new ArrayIterator<Bindings>([], { autoStart: false });
    await arrayifyStream(iterator);
    expect(iterator.done).toBe(true);
    expect(readOrWait(iterator)).toBeNull();
  });

  it('waits for an item that is not available yet', async() => {
    const iterator = new ControlledIterator();
    const pending = readOrWait(iterator);
    iterator.add(bindA(1, 'b', 'x'));
    await expect(pending).resolves.toEqualBindings(bindA(1, 'b', 'x'));
    iterator.destroy();
  });

  it('keeps waiting when readable fires without an item being available', async() => {
    const iterator = new ControlledIterator();
    const pending = readOrWait(iterator);
    iterator.poke();
    iterator.add(bindA(1, 'b', 'x'));
    await expect(pending).resolves.toEqualBindings(bindA(1, 'b', 'x'));
    iterator.destroy();
  });

  it('resolves to null when the iterator ends while waiting', async() => {
    const iterator = new ControlledIterator();
    const pending = readOrWait(iterator);
    iterator.finish();
    await expect(pending).resolves.toBeNull();
  });

  it('rejects when the iterator errors while waiting', async() => {
    const iterator = new ControlledIterator();
    const pending = readOrWait(iterator);
    iterator.fail(new Error('readOrWait error'));
    await expect(pending).rejects.toThrow('readOrWait error');
  });
});

describe('MergeJoinIterator', () => {
  const compare = createKeyComparator(termComparator, ASC_A);

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
      BF.bindings([
        [ DF.variable('a'), DF.literal('2') ],
        [ DF.variable('b'), DF.literal('l2') ],
        [ DF.variable('c'), DF.literal('r1') ],
      ]),
      BF.bindings([
        [ DF.variable('a'), DF.literal('2') ],
        [ DF.variable('b'), DF.literal('l2') ],
        [ DF.variable('c'), DF.literal('r2') ],
      ]),
      BF.bindings([
        [ DF.variable('a'), DF.literal('2') ],
        [ DF.variable('b'), DF.literal('l3') ],
        [ DF.variable('c'), DF.literal('r1') ],
      ]),
      BF.bindings([
        [ DF.variable('a'), DF.literal('2') ],
        [ DF.variable('b'), DF.literal('l3') ],
        [ DF.variable('c'), DF.literal('r2') ],
      ]),
    ]);
  });

  it('handles a buffered run that continues until the end of its stream', async() => {
    const streamed = new ArrayIterator<Bindings>([ bindA(2, 'b', 'l1') ], { autoStart: false });
    const buffered = new ArrayIterator<Bindings>([
      bindA(2, 'c', 'r1'),
      bindA(2, 'c', 'r2'),
    ], { autoStart: false });

    await expect(arrayifyStream(new MergeJoinIterator(streamed, buffered, compare))).resolves.toEqualBindingsArray([
      BF.bindings([
        [ DF.variable('a'), DF.literal('2') ],
        [ DF.variable('b'), DF.literal('l1') ],
        [ DF.variable('c'), DF.literal('r1') ],
      ]),
      BF.bindings([
        [ DF.variable('a'), DF.literal('2') ],
        [ DF.variable('b'), DF.literal('l1') ],
        [ DF.variable('c'), DF.literal('r2') ],
      ]),
    ]);
  });

  it('drops bindings within a run that disagree on a non-key variable', async() => {
    const streamed = new ArrayIterator<Bindings>([
      BF.bindings([
        [ DF.variable('a'), DF.literal('2') ],
        [ DF.variable('b'), DF.literal('shared') ],
      ]),
    ], { autoStart: false });
    const buffered = new ArrayIterator<Bindings>([
      BF.bindings([
        [ DF.variable('a'), DF.literal('2') ],
        [ DF.variable('b'), DF.literal('other') ],
      ]),
      BF.bindings([
        [ DF.variable('a'), DF.literal('2') ],
        [ DF.variable('b'), DF.literal('shared') ],
      ]),
    ], { autoStart: false });

    await expect(arrayifyStream(new MergeJoinIterator(streamed, buffered, compare))).resolves.toEqualBindingsArray([
      BF.bindings([
        [ DF.variable('a'), DF.literal('2') ],
        [ DF.variable('b'), DF.literal('shared') ],
      ]),
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

  it('destroys both sources once it ends', async() => {
    const streamed = new ArrayIterator<Bindings>([ bindA(1, 'b', 'l1') ], { autoStart: false });
    const buffered = new ArrayIterator<Bindings>([ bindA(1, 'c', 'r1') ], { autoStart: false });
    await arrayifyStream(new MergeJoinIterator(streamed, buffered, compare));
    expect(streamed.done).toBe(true);
    expect(buffered.done).toBe(true);
  });

  it('emits errors from a source', async() => {
    const streamed = new ControlledIterator();
    const buffered = new ArrayIterator<Bindings>([ bindA(1, 'c', 'r1') ], { autoStart: false });
    const iterator = new MergeJoinIterator(streamed, buffered, compare);
    const result = arrayifyStream(iterator);
    await new Promise(resolve => setImmediate(resolve));
    streamed.fail(new Error('merge source error'));
    await expect(result).rejects.toThrow('merge source error');
  });

  it('merges more items than fit in a single buffer fill', async() => {
    const items = 20;
    const streamed = new ArrayIterator<Bindings>(
      [ ...Array.from({ length: items }).keys() ].map(i => bindA(i, 'b', `l${i}`)),
      { autoStart: false },
    );
    const buffered = new ArrayIterator<Bindings>(
      [ ...Array.from({ length: items }).keys() ].map(i => bindA(i, 'c', `r${i}`)),
      { autoStart: false },
    );
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
        const joined = ActorRdfJoin.joinBindings(leftItem, rightItem);
        if (joined !== null) {
          expected.push(joined);
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
});
