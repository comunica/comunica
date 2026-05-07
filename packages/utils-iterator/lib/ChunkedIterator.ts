import type { AsyncIterator, TransformIteratorOptions } from 'asynciterator';
import { ArrayIterator, TransformIterator } from 'asynciterator';

/**
 * Splits an iterator into chunks based on a given block size.
 */
export class ChunkedIterator<T> extends TransformIterator<T, AsyncIterator<T>> {
  protected readonly blockSize: number;
  protected chunk: T[] = [];

  /**
   * Creates a new chunked iterator that groups items into blocks of a given size.
   * @param source The source iterator to split into chunks.
   * @param blockSize The maximum number of items per chunk.
   * @param options Optional transform iterator options.
   */
  public constructor(source: AsyncIterator<T>, blockSize: number, options?: TransformIteratorOptions<T>) {
    super(source, options);
    this.blockSize = blockSize;
  }

  /**
   * Wraps the current chunk buffer into an iterator and resets the buffer.
   * @return An iterator over the items in the current chunk.
   */
  protected consumeChunkAsIterator(): AsyncIterator<T> {
    const it = new ArrayIterator(this.chunk, { autoStart: false });
    this.chunk = [];
    return it;
  }

  /**
   * Transforms each incoming item by buffering it and pushing a chunk when the block size is reached.
   * @param item The incoming item from the source iterator.
   * @param done Callback to signal that transformation of this item is complete.
   * @param push Callback to push a chunk iterator to the output.
   */
  protected override _transform(item: T, done: () => void, push: (i: AsyncIterator<T>) => void): void {
    this.chunk.push(item);
    if (this.chunk.length >= this.blockSize) {
      push(this.consumeChunkAsIterator());
    }
    done();
  }

  /**
   * Flushes any remaining buffered items as a final chunk when the source ends.
   * @param done Callback to signal that flushing is complete.
   */
  protected override _flush(done: () => void): void {
    if (this.chunk.length > 0) {
      this._push(this.consumeChunkAsIterator());
    }
    super._flush(done);
  }
}
