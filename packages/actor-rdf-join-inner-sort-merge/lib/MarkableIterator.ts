import type { AsyncIterator, TransformIteratorOptions } from 'asynciterator';
import { TransformIterator } from 'asynciterator';

/**
 * An iterator that allows a position to be marked and restored.
 */
export class MarkableIterator<T> extends TransformIterator<T, T> {
  protected markBuffer: { consume: boolean; buffer: T[]; bufferIndex: number } | undefined;

  public constructor(source: AsyncIterator<T>, options?: TransformIteratorOptions<T>) {
    super(source, options);
  }

  public isSourceEnded(): boolean {
    return this.source!.ended;
  }

  protected override _closeWhenDone(): void {
    if (!this.markBuffer || this.markBuffer.buffer.length === this.markBuffer.bufferIndex) {
      super._closeWhenDone();
    }
  }

  public override read(): T | null {
    if (this.markBuffer && this.markBuffer.consume) {
      const buffer = this.markBuffer.buffer;
      if (this.markBuffer.bufferIndex < buffer.length) {
        return buffer[this.markBuffer.bufferIndex++];
      }
      this.markBuffer.consume = false;
    }

    const read = super.read();

    if (read && this.markBuffer) {
      this.markBuffer.buffer.push(read);
    }

    return read;
  }

  public mark(): void {
    if (!this.markBuffer) {
      this.markBuffer = { consume: false, buffer: [], bufferIndex: 0 };
    }
  }

  public restoreMark(): void {
    if (this.markBuffer) {
      this.markBuffer.consume = true;
      this.markBuffer.bufferIndex = 0;
    }
    this.readable = true;
  }

  public clearMark(): void {
    if (this.markBuffer) {
      this.markBuffer = undefined;
    }

    if (this.source!.ended) {
      super._closeWhenDone();
    }
  }

  public hasMark(): boolean {
    return Boolean(this.markBuffer);
  }
}
