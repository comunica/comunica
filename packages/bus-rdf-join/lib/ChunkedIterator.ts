import type { AsyncIterator, TransformIteratorOptions } from 'asynciterator';
import { ArrayIterator, TransformIterator } from 'asynciterator';

/**
 * Splits an iterator into chunks based on a given block size.
 */
export class ChunkedIterator<T> extends TransformIterator<T, AsyncIterator<T>> {
  protected readonly blockSize: number;
  protected chunk: T[] = [];

  public constructor(source: AsyncIterator<T>, blockSize: number, options?: TransformIteratorOptions<T>) {
    super(source, options);
    this.blockSize = blockSize;
  }

  protected consumeChunkAsIterator(): AsyncIterator<T> {
    const it = new ArrayIterator(this.chunk, { autoStart: false });
    this.chunk = [];
    return it;
  }

  protected override _transform(item: T, done: () => void, push: (i: AsyncIterator<T>) => void): void {
    this.chunk.push(item);
    if (this.chunk.length >= this.blockSize) {
      push(this.consumeChunkAsIterator());
    }
    done();
  }

  protected override _flush(done: () => void): void {
    if (this.chunk.length > 0) {
      this._push(this.consumeChunkAsIterator());
    }
    super._flush(done);
  }
}
