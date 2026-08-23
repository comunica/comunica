import arrayifyStream from 'arrayify-stream';
import { ArrayIterator } from 'asynciterator';
import { SortIterator } from '../lib/SortIterator';

const ascending = (left: number, right: number): number => left - right;

describe('SortIterator', () => {
  describe('without a window', () => {
    it('should sort an empty stream', async() => {
      const source = new ArrayIterator<number>([], { autoStart: false });
      await expect(arrayifyStream(new SortIterator<number>(source, ascending))).resolves.toEqual([]);
    });

    it('should sort a stream', async() => {
      const source = new ArrayIterator([ 3, 1, 4, 1, 5, 9, 2, 6 ], { autoStart: false });
      await expect(arrayifyStream(new SortIterator<number>(source, ascending)))
        .resolves.toEqual([ 1, 1, 2, 3, 4, 5, 6, 9 ]);
    });

    it('should be stable, so that a previous sort is preserved for equal elements', async() => {
      // Sort on the first element only; the second element records the original stream order.
      const source = new ArrayIterator<[number, string]>(
        [[ 1, 'a' ], [ 0, 'b' ], [ 1, 'c' ], [ 0, 'd' ], [ 1, 'e' ]],
        { autoStart: false },
      );
      const iterator = new SortIterator<[number, string]>(source, (left, right) => left[0] - right[0]);
      await expect(arrayifyStream(iterator)).resolves.toEqual([
        [ 0, 'b' ],
        [ 0, 'd' ],
        [ 1, 'a' ],
        [ 1, 'c' ],
        [ 1, 'e' ],
      ]);
    });

    it('should ignore non-finite windows', async() => {
      const source = new ArrayIterator([ 3, 1, 2 ], { autoStart: false });
      await expect(arrayifyStream(new SortIterator<number>(source, ascending, { window: Number.POSITIVE_INFINITY })))
        .resolves.toEqual([ 1, 2, 3 ]);
    });

    it('should ignore non-positive windows', async() => {
      const source = new ArrayIterator([ 3, 1, 2 ], { autoStart: false });
      await expect(arrayifyStream(new SortIterator<number>(source, ascending, { window: 0 })))
        .resolves.toEqual([ 1, 2, 3 ]);
    });
  });

  describe('with a window', () => {
    it('should sort within the window', async() => {
      const source = new ArrayIterator([ 5, 4, 3, 2, 1 ], { autoStart: false });
      await expect(arrayifyStream(new SortIterator<number>(source, ascending, { window: 3 })))
        .resolves.toEqual([ 3, 2, 1, 4, 5 ]);
    });

    it('should handle equal elements within the window', async() => {
      const source = new ArrayIterator([ 2, 2, 1, 3, 2 ], { autoStart: false });
      await expect(arrayifyStream(new SortIterator<number>(source, ascending, { window: 4 })))
        .resolves.toEqual([ 1, 2, 2, 2, 3 ]);
    });

    it('should fully sort when the window exceeds the stream length', async() => {
      const source = new ArrayIterator([ 3, 1, 4, 1, 5 ], { autoStart: false });
      await expect(arrayifyStream(new SortIterator<number>(source, ascending, { window: 100 })))
        .resolves.toEqual([ 1, 1, 3, 4, 5 ]);
    });
  });
});
