import { AsyncIterator, TransformIterator, range } from 'asynciterator';
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

    it('should forward errors [Error type]', async() => {
      const resolve = new Promise(res => {
        iterator.on('error', res);
      });

      source.emit('error', new Error('my error'));
      expect(await iterator.toArray()).toEqual([ 1, 2, 3, 4, 5 ]);
      await expect(iterator.getCardinality()).rejects.toEqual(new Error('my error'));
      expect(await resolve).toEqual(new Error('my error'));
    });

    it('should forward errors [Error type] [calling getCardinality first]', async() => {
      const resolve = new Promise(res => {
        iterator.on('error', res);
      });

      source.emit('error', new Error('my error'));

      await expect(iterator.getCardinality()).rejects.toEqual(new Error('my error'));
      expect(await iterator.toArray()).toEqual([ 1, 2, 3, 4, 5 ]);
      expect(await resolve).toEqual(new Error('my error'));
    });

    it('should forward errors [String type]', async() => {
      const resolve = new Promise(res => {
        iterator.on('error', res);
      });

      source.emit('error', 'my error');
      expect(await iterator.toArray()).toEqual([ 1, 2, 3, 4, 5 ]);
      await expect(iterator.getCardinality()).rejects.toEqual('my error');
      expect(await resolve).toEqual('my error');
    });
  });

  describe('called on an iterator that emits an error', () => {
    let source: AsyncIterator<number>;
    let iterator: LazyCardinalityIterator<number>;
    let err: Error;
    beforeEach(() => {
      err = new Error('My error');
      source = new AsyncIterator();
      iterator = new LazyCardinalityIterator(source);
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      iterator.on('error', () => {});
      source.readable = true;
      source.read = () => {
        source.destroy(err);
        return null;
      };
    });

    it('should reject #toArray() the promise of the iterator', async() => {
      await expect(iterator.toArray()).rejects.toEqual(err);
    });

    it('should reject #toArray() the promise of the source', async() => {
      await expect(source.toArray()).rejects.toEqual(err);
    });

    it('should reject #getCardinality() the promise', async() => {
      await expect(iterator.getCardinality()).rejects.toEqual(err);
    });
  });

  describe('input MyIterator which emits 1, 0, errors and then closes', () => {
    let iterator: LazyCardinalityIterator<number>;
    let source: AsyncIterator<number>;

    class MyIterator extends AsyncIterator<number> {
      public constructor() {
        super();
        this.readable = true;
      }

      private i = 2;

      public read() {
        if (this.i > 0) {
          this.i--;
          return this.i;
        }
        // This.emit('error', new Error('my error'));
        this.emit('error', 'my error');
        // This.close();
        return null;
      }
    }
    beforeEach(() => {
      source = new MyIterator();
      iterator = new LazyCardinalityIterator(source);
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      iterator.on('error', () => {});
    });

    it('should reject #getCardinality() the promise', async() => {
      await expect(iterator.getCardinality()).rejects.toEqual('my error');
    });

    it('should reject #toArray() the promise', async() => {
      await expect(iterator.toArray()).rejects.toEqual('my error');
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
