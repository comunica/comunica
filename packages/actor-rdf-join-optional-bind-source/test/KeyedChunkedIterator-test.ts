import { ArrayIterator } from 'asynciterator';
import { KeyedChunkedIterator } from '../lib/KeyedChunkedIterator';

async function getChunks(items: string[], blockSize: number, maxChunkSize: number): Promise<string[][]> {
  const chunks = new KeyedChunkedIterator(
    new ArrayIterator(items, { autoStart: false }),
    blockSize,
    maxChunkSize,
    item => item[0],
    { autoStart: false },
  );
  return Promise.all((await chunks.toArray()).map(chunk => chunk.toArray()));
}

describe('KeyedChunkedIterator', () => {
  it('returns no chunks for an empty iterator', async() => {
    await expect(getChunks([], 2, 10)).resolves.toEqual([]);
  });

  it('returns chunks with at most the block size of distinct keys', async() => {
    await expect(getChunks([ 'a1', 'a2', 'b1', 'c1', 'c2', 'b2', 'd1' ], 2, 10)).resolves.toEqual([
      [ 'a1', 'a2', 'b1' ],
      [ 'c1', 'c2', 'b2' ],
      [ 'd1' ],
    ]);
  });

  it('returns chunks with at most the maximum chunk size of items', async() => {
    await expect(getChunks([ 'a1', 'a2', 'a3', 'a4', 'b1' ], 2, 3)).resolves.toEqual([
      [ 'a1', 'a2', 'a3' ],
      [ 'a4', 'b1' ],
    ]);
  });
});
