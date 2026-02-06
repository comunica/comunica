import { ChunkedIterator } from '@comunica/utils-iterator/lib/ChunkedIterator';
import { ArrayIterator } from 'asynciterator';

describe('ChunkedIterator', () => {
  let itr: ChunkedIterator<number>;
  describe('for blockSize 1', () => {
    it('should handle an empty iterator', async() => {
      itr = new ChunkedIterator<number>(new ArrayIterator<number>([], { autoStart: false }), 1);
      await expect(flattenIterator(itr)).resolves.toEqual([]);
    });

    it('should split up into blocks of 1', async() => {
      itr = new ChunkedIterator<number>(new ArrayIterator([ 0, 1, 2, 3 ], { autoStart: false }), 1);
      await expect(flattenIterator(itr)).resolves.toEqual([
        [ 0 ],
        [ 1 ],
        [ 2 ],
        [ 3 ],
      ]);
    });
  });

  describe('for blockSize 2', () => {
    it('should split up into blocks of 2', async() => {
      itr = new ChunkedIterator<number>(new ArrayIterator([ 0, 1, 2, 3 ], { autoStart: false }), 2);
      await expect(flattenIterator(itr)).resolves.toEqual([
        [ 0, 1 ],
        [ 2, 3 ],
      ]);
    });

    it('should split up into blocks of 2 with an uneven input count', async() => {
      itr = new ChunkedIterator<number>(new ArrayIterator([ 0, 1, 2, 3, 4 ], { autoStart: false }), 2);
      await expect(flattenIterator(itr)).resolves.toEqual([
        [ 0, 1 ],
        [ 2, 3 ],
        [ 4 ],
      ]);
    });
  });

  describe('for blockSize 3', () => {
    it('should split up into blocks of 3', async() => {
      itr = new ChunkedIterator<number>(new ArrayIterator([ 0, 1, 2, 3, 4 ], { autoStart: false }), 3);
      await expect(flattenIterator(itr)).resolves.toEqual([
        [ 0, 1, 2 ],
        [ 3, 4 ],
      ]);
    });
  });
});

async function flattenIterator(iterator: ChunkedIterator<number>): Promise<number[][]> {
  return await Promise.all(await iterator.map(subIt => subIt.toArray()).toArray());
}
