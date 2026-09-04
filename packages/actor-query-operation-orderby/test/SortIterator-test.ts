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
      // ORDER BY with multiple expressions chains these iterators,
      // so the order of equal items must carry over from the previous pass.
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
});
