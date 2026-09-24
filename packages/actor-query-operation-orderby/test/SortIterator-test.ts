import arrayifyStream from 'arrayify-stream';
import { ArrayIterator } from 'asynciterator';
import { SortIterator } from '../lib/SortIterator';

const ascending = (left: number, right: number): number => left - right;

describe('SortIterator', () => {
  describe('without a window', () => {
    it('should sort an unsorted stream', async() => {
      const iterator = new SortIterator(
        new ArrayIterator([ 3, 1, 2 ], { autoStart: false }),
        ascending,
      );
      await expect(arrayifyStream(iterator)).resolves.toEqual([ 1, 2, 3 ]);
    });

    it('should handle an empty stream', async() => {
      const iterator = new SortIterator(
        new ArrayIterator<number>([], { autoStart: false }),
        ascending,
      );
      await expect(arrayifyStream(iterator)).resolves.toEqual([]);
    });

    it('should keep equal items in their original order', async() => {
      // Ties are broken by input order, which is what makes a bounded sort return exactly the
      // first items of an unbounded one.
      const items = [
        { key: 2, id: 'a' },
        { key: 1, id: 'b' },
        { key: 2, id: 'c' },
        { key: 1, id: 'd' },
        { key: 2, id: 'e' },
      ];
      const iterator = new SortIterator(
        new ArrayIterator(items, { autoStart: false }),
        (left, right) => left.key - right.key,
      );
      await expect(arrayifyStream(iterator).then(results => results.map(item => item.id))).resolves
        .toEqual([ 'b', 'd', 'a', 'c', 'e' ]);
    });

    it('should sort a large stream', async() => {
      const items: number[] = [];
      for (let i = 0; i < 10_000; i++) {
        items.push((i * 7919) % 10_000);
      }
      const iterator = new SortIterator(
        new ArrayIterator(items, { autoStart: false }),
        ascending,
      );
      const results = await arrayifyStream<number>(iterator);
      expect(results).toHaveLength(10_000);
      expect(results).toEqual([ ...items ].sort(ascending));
    });
  });

  describe('with a window', () => {
    it('should sort within the window', async() => {
      const iterator = new SortIterator(
        new ArrayIterator([ 3, 1, 2 ], { autoStart: false }),
        ascending,
        { window: 2 },
      );
      await expect(arrayifyStream(iterator)).resolves.toEqual([ 1, 2, 3 ]);
    });

    it('should sort within a window wider than the out-of-order run', async() => {
      const iterator = new SortIterator(
        new ArrayIterator([ 1, 3, 2, 2 ], { autoStart: false }),
        ascending,
        { window: 3 },
      );
      await expect(arrayifyStream(iterator)).resolves.toEqual([ 1, 2, 2, 3 ]);
    });

    it('should not sort beyond the window', async() => {
      const iterator = new SortIterator(
        new ArrayIterator([ 2, 3, 1 ], { autoStart: false }),
        ascending,
        { window: 1 },
      );
      await expect(arrayifyStream(iterator)).resolves.toEqual([ 2, 3, 1 ]);
    });
  });

  describe('with a limit', () => {
    const shuffled = (n: number): number[] => {
      const items: number[] = [];
      for (let i = 0; i < n; i++) {
        items.push((i * 7919) % n);
      }
      return items;
    };

    it('should emit the smallest items of an unsorted stream', async() => {
      const iterator = new SortIterator(
        new ArrayIterator([ 3, 1, 4, 1, 5, 9, 2, 6 ], { autoStart: false }),
        ascending,
        { limit: 3 },
      );
      await expect(arrayifyStream(iterator)).resolves.toEqual([ 1, 1, 2 ]);
    });

    it('should emit everything if the limit exceeds the stream length', async() => {
      const iterator = new SortIterator(
        new ArrayIterator([ 3, 1, 2 ], { autoStart: false }),
        ascending,
        { limit: 10 },
      );
      await expect(arrayifyStream(iterator)).resolves.toEqual([ 1, 2, 3 ]);
    });

    it('should emit everything if the limit equals the stream length', async() => {
      const iterator = new SortIterator(
        new ArrayIterator([ 3, 1, 2 ], { autoStart: false }),
        ascending,
        { limit: 3 },
      );
      await expect(arrayifyStream(iterator)).resolves.toEqual([ 1, 2, 3 ]);
    });

    it('should emit nothing for a limit of 0', async() => {
      const iterator = new SortIterator(
        new ArrayIterator([ 3, 1, 2 ], { autoStart: false }),
        ascending,
        { limit: 0 },
      );
      await expect(arrayifyStream(iterator)).resolves.toEqual([]);
    });

    it('should ignore a negative limit', async() => {
      const iterator = new SortIterator(
        new ArrayIterator([ 3, 1, 2 ], { autoStart: false }),
        ascending,
        { limit: -1 },
      );
      await expect(arrayifyStream(iterator)).resolves.toEqual([ 1, 2, 3 ]);
    });

    it('should emit exactly the first items of the fully sorted stream', async() => {
      const items = shuffled(2_000);
      const expected = [ ...items ].sort(ascending);
      for (const limit of [ 1, 2, 7, 1_999, 2_000, 2_001 ]) {
        const iterator = new SortIterator(
          new ArrayIterator(items, { autoStart: false }),
          ascending,
          { limit },
        );
        await expect(arrayifyStream(iterator)).resolves.toEqual(expected.slice(0, limit));
      }
    });

    it('should emit exactly the first items when the stream is already sorted', async() => {
      const items = [ 1, 2, 3, 4, 5, 6, 7, 8 ];
      const iterator = new SortIterator(
        new ArrayIterator(items, { autoStart: false }),
        ascending,
        { limit: 3 },
      );
      await expect(arrayifyStream(iterator)).resolves.toEqual([ 1, 2, 3 ]);
    });

    it('should emit exactly the first items when the stream is reverse sorted', async() => {
      const items = [ 8, 7, 6, 5, 4, 3, 2, 1 ];
      const iterator = new SortIterator(
        new ArrayIterator(items, { autoStart: false }),
        ascending,
        { limit: 3 },
      );
      await expect(arrayifyStream(iterator)).resolves.toEqual([ 1, 2, 3 ]);
    });

    it('should be ignored when a window is set', async() => {
      const iterator = new SortIterator(
        new ArrayIterator([ 2, 3, 1 ], { autoStart: false }),
        ascending,
        { window: 1, limit: 1 },
      );
      await expect(arrayifyStream(iterator)).resolves.toEqual([ 2, 3, 1 ]);
    });
  });
});
