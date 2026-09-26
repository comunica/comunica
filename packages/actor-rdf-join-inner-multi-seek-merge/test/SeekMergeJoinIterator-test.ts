import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import type { Bindings } from '@comunica/types';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { compareTerms } from '@comunica/utils-iterator';
import arrayifyStream from 'arrayify-stream';
import type { AsyncIterator } from 'asynciterator';
import { ArrayIterator, BufferedIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { SeekMergeJoinIterator } from '../lib/SeekMergeJoinIterator';
import '@comunica/utils-jest';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);
const A = DF.variable('a');

function compare(left: Bindings, right: Bindings): number {
  return compareTerms(left.get(A)!, right.get(A)!);
}

// Keys are compared lexicographically, so they are zero-padded to stay sorted.
function bind(a: number, other: string, otherValue: string): Bindings {
  return BF.bindings([
    [ A, DF.literal(String(a).padStart(6, '0')) ],
    [ DF.variable(other), DF.literal(otherValue) ],
  ]);
}

function joined(a: number, ...others: [string, string][]): Bindings {
  return BF.bindings([
    [ A, DF.literal(String(a).padStart(6, '0')) ],
    ...others.map(([ name, value ]): [any, any] => [ DF.variable(name), DF.literal(value) ]),
  ]);
}

function array(items: Bindings[]): AsyncIterator<Bindings> {
  return new ArrayIterator<Bindings>(items, { autoStart: false });
}

// Bindings within a key may be emitted in any order, so results are compared as multisets.
function asMultiset(bindings: Bindings[]): string[] {
  return bindings
    .map(item => [ ...item ].map(([ key, value ]) => `${key.value}=${value.value}`).sort().join('|'))
    .sort();
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
  public reads = 0;
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
    this.reads++;
    return this.items[this.position++];
  }

  public seek(target: Bindings): void {
    this.seeks++;
    let low = this.position;
    let high = this.items.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (compare(this.items[middle], target) < 0) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }
    this.skipped += low - this.position;
    this.position = low;
  }
}

describe('SeekMergeJoinIterator', () => {
  it('joins the keys that all streams share, as a cross product of their runs', async() => {
    const it = new SeekMergeJoinIterator([
      array([ bind(1, 'b', 'b1'), bind(2, 'b', 'b2'), bind(2, 'b', 'b2x'), bind(4, 'b', 'b4') ]),
      array([ bind(2, 'c', 'c2'), bind(3, 'c', 'c3'), bind(4, 'c', 'c4') ]),
      array([ bind(0, 'd', 'd0'), bind(2, 'd', 'd2'), bind(2, 'd', 'd2x'), bind(4, 'd', 'd4') ]),
    ], compare);
    await expect(arrayifyStream(it)).resolves.toEqualBindingsArray([
      joined(2, [ 'b', 'b2' ], [ 'c', 'c2' ], [ 'd', 'd2' ]),
      joined(2, [ 'b', 'b2' ], [ 'c', 'c2' ], [ 'd', 'd2x' ]),
      joined(2, [ 'b', 'b2x' ], [ 'c', 'c2' ], [ 'd', 'd2' ]),
      joined(2, [ 'b', 'b2x' ], [ 'c', 'c2' ], [ 'd', 'd2x' ]),
      joined(4, [ 'b', 'b4' ], [ 'c', 'c4' ], [ 'd', 'd4' ]),
    ]);
  });

  it('drops combinations that disagree on a variable outside the key', async() => {
    const it = new SeekMergeJoinIterator([
      array([ bind(1, 'b', 'x'), bind(1, 'b', 'y') ]),
      array([ bind(1, 'b', 'y'), bind(1, 'b', 'z') ]),
      array([ bind(1, 'c', 'c1') ]),
    ], compare);
    await expect(arrayifyStream(it)).resolves.toEqualBindingsArray([
      joined(1, [ 'b', 'y' ], [ 'c', 'c1' ]),
    ]);
  });

  it('produces nothing when a combination at the first run never agrees', async() => {
    const it = new SeekMergeJoinIterator([
      array([ bind(1, 'b', 'x'), bind(1, 'b', 'y') ]),
      array([ bind(1, 'b', 'z'), bind(1, 'b', 'w') ]),
      array([ bind(1, 'c', 'c1'), bind(1, 'c', 'c2') ]),
    ], compare);
    await expect(arrayifyStream(it)).resolves.toEqualBindingsArray([]);
  });

  it('produces nothing for streams without a common key', async() => {
    const it = new SeekMergeJoinIterator([
      array([ bind(1, 'b', 'b1'), bind(3, 'b', 'b3') ]),
      array([ bind(1, 'c', 'c1'), bind(2, 'c', 'c2') ]),
      array([ bind(2, 'd', 'd2'), bind(3, 'd', 'd3') ]),
    ], compare);
    await expect(arrayifyStream(it)).resolves.toEqualBindingsArray([]);
  });

  it('produces nothing when one stream is empty', async() => {
    const it = new SeekMergeJoinIterator([
      array([ bind(1, 'b', 'b1') ]),
      array([]),
      array([ bind(1, 'd', 'd1') ]),
    ], compare);
    await expect(arrayifyStream(it)).resolves.toEqualBindingsArray([]);
  });

  it('returns null when read after it has ended, and destroys its sources', async() => {
    const sources = [ array([ bind(1, 'b', 'b1') ]), array([ bind(1, 'c', 'c1') ]), array([ bind(1, 'd', 'd1') ]) ];
    const it = new SeekMergeJoinIterator(sources, compare);
    await expect(arrayifyStream(it)).resolves.toHaveLength(1);
    expect(it.read()).toBeNull();
    for (const source of sources) {
      expect(source.done).toBe(true);
    }
  });

  it('emits errors from its sources', async() => {
    const failing = new ControlledIterator();
    const result = arrayifyStream(new SeekMergeJoinIterator([
      array([ bind(1, 'b', 'b1') ]),
      failing,
      array([ bind(1, 'd', 'd1') ]),
    ], compare));
    await new Promise(resolve => setImmediate(resolve));
    failing.fail(new Error('merge source error'));
    await expect(result).rejects.toThrow('merge source error');
  });

  it('waits for sources that have nothing buffered yet', async() => {
    const sources = [ new ControlledIterator(), new ControlledIterator(), new ControlledIterator() ];
    const result = arrayifyStream(new SeekMergeJoinIterator(sources, compare));
    const tick = (): Promise<void> => new Promise(resolve => setImmediate(resolve));
    // Feed the sources in stages, so that seeking and collecting both have to pause and resume.
    await tick();
    sources[0].add(bind(1, 'b', 'b1'));
    await tick();
    sources[1].add(bind(1, 'c', 'c1'));
    await tick();
    sources[2].add(bind(1, 'd', 'd1'));
    await tick();
    sources[0].add(bind(1, 'b', 'b1x'));
    await tick();
    sources[1].add(bind(2, 'c', 'c2'));
    await tick();
    for (const source of sources) {
      source.finish();
    }
    await expect(result).resolves.toEqualBindingsArray([
      joined(1, [ 'b', 'b1' ], [ 'c', 'c1' ], [ 'd', 'd1' ]),
      joined(1, [ 'b', 'b1x' ], [ 'c', 'c1' ], [ 'd', 'd1' ]),
    ]);
  });

  it('matches a nested loop join over randomized inputs with duplicate keys', async() => {
    let seed = 42;
    const random = (bound: number): number => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed % bound;
    };
    const build = (count: number, extraVariable: string): Bindings[] => Array.from({ length: count }, () =>
      BF.bindings([
        // A small key domain forces long runs of equal keys.
        [ A, DF.literal(`k${random(6)}`) ],
        // A shared variable outside the key, so that some combinations are incompatible.
        [ DF.variable('b'), DF.literal(`v${random(3)}`) ],
        [ DF.variable(extraVariable), DF.literal(`u${random(100)}`) ],
      ])).sort(compare);
    const inputs = [ build(30, 'x'), build(20, 'y'), build(25, 'z'), build(10, 'w') ];

    let expected: Bindings[] = inputs[0];
    for (const input of inputs.slice(1)) {
      const next: Bindings[] = [];
      for (const left of expected) {
        for (const right of input) {
          const result = ActorRdfJoin.joinBindings(left, right);
          if (result !== null) {
            next.push(result);
          }
        }
      }
      expected = next;
    }
    expect(expected.length).toBeGreaterThan(0);

    const plain = await arrayifyStream(new SeekMergeJoinIterator(inputs.map(array), compare));
    expect(asMultiset(plain)).toEqual(asMultiset(expected));
    const seeking = await arrayifyStream(new SeekMergeJoinIterator(
      inputs.map(input => new SeekableIterator(input)),
      compare,
      1,
    ));
    expect(asMultiset(seeking)).toEqual(asMultiset(expected));
  });

  it('does not read a later stream at keys that the earlier ones do not share', async() => {
    const first = new SeekableIterator([ bind(1, 'b', 'b1'), bind(3, 'b', 'b3'), bind(5, 'b', 'b5') ]);
    const second = new SeekableIterator([ bind(2, 'c', 'c2'), bind(4, 'c', 'c4'), bind(6, 'c', 'c6') ]);
    const last = new SeekableIterator(Array.from({ length: 100 }, (_, i) => bind(i, 'd', `d${i}`)));
    await expect(arrayifyStream(new SeekMergeJoinIterator([ first, second, last ], compare))).resolves.toHaveLength(0);
    expect(last.reads).toBe(0);
  });

  describe('with seekable sources', () => {
    it('skips ahead in every stream that falls behind the furthest one', async() => {
      const long = (other: string): SeekableIterator => new SeekableIterator(
        Array.from({ length: 1000 }, (_, i) => bind(i, other, `${other}${i}`)),
      );
      const sources = [ long('b'), new SeekableIterator([ bind(500, 'c', 'c'), bind(900, 'c', 'c') ]), long('d') ];
      const it = new SeekMergeJoinIterator(sources, compare);
      await expect(arrayifyStream(it)).resolves.toHaveLength(2);
      expect(sources[0].skipped).toBeGreaterThan(800);
      expect(sources[2].skipped).toBeGreaterThan(800);
    });

    it('reads through keys that interleave closely instead of skipping', async() => {
      const sources = [ 'b', 'c', 'd' ].map(other => new SeekableIterator(
        Array.from({ length: 100 }, (_, i) => bind(i, other, `${other}${i}`)),
      ));
      await expect(arrayifyStream(new SeekMergeJoinIterator(sources, compare))).resolves.toHaveLength(100);
      for (const source of sources) {
        expect(source.seeks).toBe(0);
      }
    });
  });

  describe('seek', () => {
    function sources(): SeekableIterator[] {
      return [ 'b', 'c', 'd' ].map(other => new SeekableIterator(
        Array.from({ length: 100 }, (_, i) => bind(i, other, `${other}${i}`)),
      ));
    }

    it('skips every source ahead before anything was read', async() => {
      const inputs = sources();
      const it = new SeekMergeJoinIterator(inputs, compare);
      it.seek(bind(90, 'e', 'e'));
      await expect(arrayifyStream(it)).resolves.toHaveLength(10);
      for (const input of inputs) {
        expect(input.skipped).toBe(90);
      }
    });

    it('drops the bindings held before the target, and skips their sources ahead', async() => {
      const behind = new SeekableIterator([ bind(1, 'b', 'b1'), bind(5, 'b', 'b5'), bind(7, 'b', 'b7') ]);
      const pending = new ControlledIterator();
      const ahead = new SeekableIterator([ bind(7, 'd', 'd7') ]);
      const it = new SeekMergeJoinIterator([ behind, pending, ahead ], compare, Number.POSITIVE_INFINITY);
      // The first source now holds its first binding, and the second has none yet.
      expect(it.read()).toBeNull();
      it.seek(bind(6, 'e', 'e'));
      expect(behind.seeks).toBe(1);
      expect(behind.skipped).toBe(1);
      pending.add(bind(7, 'c', 'c7'));
      pending.finish();
      await expect(arrayifyStream(it)).resolves.toEqualBindingsArray([
        joined(7, [ 'b', 'b7' ], [ 'c', 'c7' ], [ 'd', 'd7' ]),
      ]);
    });

    it('keeps the bindings held at or after the target', async() => {
      const first = new SeekableIterator([ bind(7, 'b', 'b7') ]);
      const second = new SeekableIterator([ bind(7, 'c', 'c7'), bind(9, 'c', 'c9') ]);
      const pending = new ControlledIterator();
      const it = new SeekMergeJoinIterator([ first, second, pending ], compare, Number.POSITIVE_INFINITY);
      // The first two sources are at key 7, and the third has nothing yet.
      expect(it.read()).toBeNull();
      it.seek(bind(6, 'e', 'e'));
      expect(first.seeks).toBe(0);
      expect(second.seeks).toBe(0);
      pending.add(bind(7, 'd', 'd7'));
      pending.finish();
      await expect(arrayifyStream(it)).resolves.toEqualBindingsArray([
        joined(7, [ 'b', 'b7' ], [ 'c', 'c7' ], [ 'd', 'd7' ]),
      ]);
    });

    it('is ignored while a key is being emitted', async() => {
      const it = new SeekMergeJoinIterator([
        array([ bind(1, 'b', 'b1'), bind(1, 'b', 'b1x'), bind(2, 'b', 'b2') ]),
        array([ bind(1, 'c', 'c1'), bind(2, 'c', 'c2') ]),
        array([ bind(1, 'd', 'd1'), bind(2, 'd', 'd2') ]),
      ], compare);
      expect(it.read()).toEqualBindings(joined(1, [ 'b', 'b1' ], [ 'c', 'c1' ], [ 'd', 'd1' ]));
      it.seek(bind(2, 'e', 'e'));
      await expect(arrayifyStream(it)).resolves.toEqualBindingsArray([
        joined(1, [ 'b', 'b1x' ], [ 'c', 'c1' ], [ 'd', 'd1' ]),
        joined(2, [ 'b', 'b2' ], [ 'c', 'c2' ], [ 'd', 'd2' ]),
      ]);
    });

    it('leaves sources alone that ended or cannot skip', async() => {
      const it = new SeekMergeJoinIterator([
        array([ bind(1, 'b', 'b1') ]),
        array([]),
        array([ bind(1, 'd', 'd1') ]),
      ], compare);
      expect(it.read()).toBeNull();
      expect(() => it.seek(bind(0, 'e', 'e'))).not.toThrow();
      await expect(arrayifyStream(it)).resolves.toEqualBindingsArray([]);
    });
  });
});
