import type { AsyncIterator } from 'asynciterator';
import { TransformIterator, range } from 'asynciterator';
import { LazyCardinalityIterator } from '../lib/LazyCardinalityIterator';

describe('LazyCardinalityIterator', () => {
  describe('input range', () => {
    let iterator: LazyCardinalityIterator<number>;
    let source: AsyncIterator<number>;
    beforeEach(() => {
      source = range(1, 5);
      iterator = new LazyCardinalityIterator(source);
    });

    it('should be able to get cardinality first and after', async() => {
      expect(await iterator.getCardinality()).toEqual(5);
      expect(await iterator.toArray()).toEqual([ 1, 2, 3, 4, 5 ]);
      expect(await iterator.getCardinality()).toEqual(5);
    });

    it('should be able to get cardinality second', async() => {
      expect(await iterator.toArray()).toEqual([ 1, 2, 3, 4, 5 ]);
      expect(await iterator.getCardinality()).toEqual(5);
    });

    it('should forward errors', async() => {
      const resolve = new Promise(res => {
        iterator.on('error', res);
      });

      source.emit('error', 'my error');
      expect(await iterator.toArray()).toEqual([ 1, 2, 3, 4, 5 ]);
      expect(await iterator.getCardinality()).toEqual(5);
      expect(await resolve).toEqual('my error');
    });
  });

  describe('input TransformIterator', () => {
    let iterator: LazyCardinalityIterator<number>;
    beforeEach(() => {
      const promise = new Promise<AsyncIterator<number>>(resolve => {
        setTimeout(() => { resolve(range(1, 5)); }, 100);
      });
      iterator = new LazyCardinalityIterator(new TransformIterator(promise));
    });

    it('should be able to get cardinality first and after', async() => {
      expect(await iterator.getCardinality()).toEqual(5);
      expect(await iterator.toArray()).toEqual([ 1, 2, 3, 4, 5 ]);
      expect(await iterator.getCardinality()).toEqual(5);
    });

    it('should be able to get cardinality second', async() => {
      expect(await iterator.toArray()).toEqual([ 1, 2, 3, 4, 5 ]);
      expect(await iterator.getCardinality()).toEqual(5);
    });
  });
});
