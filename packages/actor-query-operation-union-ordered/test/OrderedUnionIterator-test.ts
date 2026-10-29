import type { Bindings, TermsOrder } from '@comunica/types';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { ArrayIterator, BufferedIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { OrderedUnionIterator } from '../lib/OrderedUnionIterator';
import '@comunica/utils-jest';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);

const a = DF.variable('a');
const b = DF.variable('b');
const orderA: TermsOrder<RDF.Variable> = [{ term: a, direction: 'asc' }];
const orderAB: TermsOrder<RDF.Variable> = [{ term: a, direction: 'asc' }, { term: b, direction: 'asc' }];

function bindings(valueA: string, valueB = '0'): Bindings {
  return BF.bindings([[ a, DF.literal(valueA) ], [ b, DF.literal(valueB) ]]);
}

function values(items: Bindings[]): string[] {
  return items.map(item => `${item.get(a)!.value}${item.get(b)!.value}`);
}

/**
 * A stream that makes each binding available asynchronously.
 * @param items The bindings.
 */
function delayedStream(items: Bindings[]): BufferedIterator<Bindings> {
  const remaining = [ ...items ];
  const stream = new BufferedIterator<Bindings>({ maxBufferSize: 1, autoStart: false });
  (<any> stream)._read = (_count: number, done: () => void): void => {
    setImmediate(() => {
      if (remaining.length > 0) {
        (<any> stream)._push(remaining.shift());
      } else {
        stream.close();
      }
      done();
    });
  };
  return stream;
}

function array(items: Bindings[]): AsyncIterator<Bindings> {
  return new ArrayIterator(items, { autoStart: false });
}

describe('OrderedUnionIterator', () => {
  describe('without an order', () => {
    it('reads the inputs in turn when read before an order is given', async() => {
      const union = new OrderedUnionIterator([ array([ bindings('1'), bindings('3') ]), array([ bindings('2') ]) ]);
      const items = await union.toArray();
      expect(values(items)).toEqual([ '10', '20', '30' ]);
      expect(union.useOrder(orderA)).toBeUndefined();
    });

    it('reads the inputs in turn when they share no order', async() => {
      const union = new OrderedUnionIterator([ array([ bindings('3') ]), array([ bindings('1'), bindings('2') ]) ]);
      expect(union.useOrder(undefined)).toBeUndefined();
      expect(union.useOrder(orderA)).toBeUndefined();
      expect(values(await union.toArray())).toEqual([ '30', '10', '20' ]);
    });

    it('waits for inputs that have nothing available yet', async() => {
      const union = new OrderedUnionIterator([
        delayedStream([ bindings('1'), bindings('3') ]),
        array([ bindings('2') ]),
      ]);
      const items = await union.toArray();
      expect(values(items).sort()).toEqual([ '10', '20', '30' ]);
    });

    it('ends without inputs', async() => {
      const union = new OrderedUnionIterator([]);
      await expect(union.toArray()).resolves.toEqual([]);
    });

    it('returns nothing once ended', async() => {
      const union = new OrderedUnionIterator([]);
      await union.toArray();
      expect(union.read()).toBeNull();
    });

    it('does not skip on a seek', async() => {
      const union = new OrderedUnionIterator([ array([ bindings('1'), bindings('2') ]) ]);
      union.seek(bindings('2'));
      expect(values(await union.toArray())).toEqual([ '10', '20' ]);
    });
  });

  describe('with an order', () => {
    it('merges the inputs in that order', async() => {
      const union = new OrderedUnionIterator([
        array([ bindings('1'), bindings('4'), bindings('5') ]),
        array([ bindings('2'), bindings('3'), bindings('6') ]),
      ]);
      expect(union.useOrder(orderA)).toBe(orderA);
      expect(union.useOrder(undefined)).toBe(orderA);
      expect(values(await union.toArray())).toEqual([ '10', '20', '30', '40', '50', '60' ]);
    });

    it('merges the inputs in a descending order', async() => {
      const union = new OrderedUnionIterator([
        array([ bindings('5'), bindings('1') ]),
        array([ bindings('3') ]),
      ]);
      union.useOrder([{ term: a, direction: 'desc' }]);
      expect(values(await union.toArray())).toEqual([ '50', '30', '10' ]);
    });

    it('merges the inputs on all order variables', async() => {
      const union = new OrderedUnionIterator([
        array([ bindings('1', '1'), bindings('1', '3') ]),
        array([ bindings('1', '2') ]),
      ]);
      union.useOrder(orderAB);
      expect(values(await union.toArray())).toEqual([ '11', '12', '13' ]);
    });

    it('keeps bindings with the same key', async() => {
      const union = new OrderedUnionIterator([ array([ bindings('1') ]), array([ bindings('1') ]) ]);
      union.useOrder(orderA);
      expect(values(await union.toArray())).toEqual([ '10', '10' ]);
    });

    it('waits for inputs that have nothing available yet', async() => {
      const union = new OrderedUnionIterator([
        delayedStream([ bindings('1'), bindings('4') ]),
        array([ bindings('2'), bindings('3') ]),
      ]);
      union.useOrder(orderA);
      expect(values(await union.toArray())).toEqual([ '10', '20', '30', '40' ]);
    });

    it('skips the bindings before a seek target', async() => {
      const seek = vi.fn();
      const seekable = Object.assign(array([ bindings('1'), bindings('2'), bindings('5') ]), { seek });
      const union = new OrderedUnionIterator([ seekable, array([ bindings('3'), bindings('6') ]) ]);
      union.useOrder(orderA);
      expect(union.read()).toEqual(bindings('1'));
      union.seek(bindings('4'));
      expect(seek).toHaveBeenCalledWith(bindings('4'));
      // The held 3 is dropped, while the mock seek skips nothing, so 2 is still read.
      expect(values(await union.toArray())).toEqual([ '20', '50', '60' ]);
    });

    it('keeps a held binding that is not before a seek target', async() => {
      const seek = vi.fn();
      const seekable = Object.assign(array([ bindings('5') ]), { seek });
      const union = new OrderedUnionIterator([ seekable, array([ bindings('1'), bindings('6') ]) ]);
      union.useOrder(orderA);
      expect(union.read()).toEqual(bindings('1'));
      union.seek(bindings('4'));
      expect(seek).not.toHaveBeenCalled();
      expect(values(await union.toArray())).toEqual([ '50', '60' ]);
    });

    it('only compares a seek target on the order variables it binds', async() => {
      const union = new OrderedUnionIterator([
        array([ bindings('1', '5'), bindings('2', '1') ]),
        array([ bindings('1', '7') ]),
      ]);
      union.useOrder(orderAB);
      expect(union.read()).toEqual(bindings('1', '5'));
      union.seek(BF.bindings([[ a, DF.literal('1') ]]));
      expect(values(await union.toArray())).toEqual([ '17', '21' ]);
    });

    it('ignores ended inputs on a seek', async() => {
      const union = new OrderedUnionIterator([ array([]), array([ bindings('1'), bindings('2') ]) ]);
      union.useOrder(orderA);
      // The empty input only ends asynchronously.
      expect(union.read()).toBeNull();
      await new Promise(resolve => setImmediate(resolve));
      expect(union.read()).toEqual(bindings('1'));
      union.seek(bindings('2'));
      expect(values(await union.toArray())).toEqual([ '20' ]);
    });
  });

  it('forwards errors of its inputs', async() => {
    const failing = array([]);
    const union = new OrderedUnionIterator([ failing ]);
    const error = new Error('input failed');
    const promise = union.toArray();
    failing.emit('error', error);
    await expect(promise).rejects.toThrow(error);
  });

  it('closes its inputs when it ends', async() => {
    const input = array([ bindings('1') ]);
    const union = new OrderedUnionIterator([ input ]);
    union.destroy();
    expect(input.destroyed).toBe(true);
  });
});
