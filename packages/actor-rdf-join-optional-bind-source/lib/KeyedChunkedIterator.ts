import { ChunkedIterator } from '@comunica/utils-iterator';
import type { AsyncIterator, TransformIteratorOptions } from 'asynciterator';

/**
 * Splits an iterator into chunks with at most a given number of distinct keys, and at most a given number of items.
 */
export class KeyedChunkedIterator<T> extends ChunkedIterator<T> {
  protected readonly maxChunkSize: number;
  protected readonly getKey: (item: T) => string;
  protected readonly keys = new Set<string>();

  public constructor(
    source: AsyncIterator<T>,
    blockSize: number,
    maxChunkSize: number,
    getKey: (item: T) => string,
    options?: TransformIteratorOptions<T>,
  ) {
    super(source, blockSize, options);
    this.maxChunkSize = maxChunkSize;
    this.getKey = getKey;
  }

  protected override consumeChunkAsIterator(): AsyncIterator<T> {
    this.keys.clear();
    return super.consumeChunkAsIterator();
  }

  protected override _transform(item: T, done: () => void, push: (i: AsyncIterator<T>) => void): void {
    // A chunk is only completed by an item with a new key, so that items with the same key stay together
    const key = this.getKey(item);
    if (!this.keys.has(key) && this.keys.size >= this.blockSize) {
      push(this.consumeChunkAsIterator());
    }
    this.keys.add(key);
    this.chunk.push(item);
    if (this.chunk.length >= this.maxChunkSize) {
      push(this.consumeChunkAsIterator());
    }
    done();
  }
}
