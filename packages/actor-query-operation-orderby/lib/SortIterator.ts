import type { AsyncIterator } from 'asynciterator';
import { TransformIterator } from 'asynciterator';

// Based on https://github.com/LinkedDataFragments/Client.js/blob/master/lib/sparql/SortIterator.js
export class SortIterator<T> extends TransformIterator<T, T> {
  private readonly windowLength: number;
  private readonly limit: number;
  private readonly sort: (left: T, right: T) => number;
  private readonly sorted: T[];
  private heapified = false;

  public constructor(source: AsyncIterator<T>, sort: (left: T, right: T) => number, options?: any) {
    super(source, options);

    // The `window` parameter indicates the length of the sliding window to apply sorting
    const window: number = options && options.window;
    this.windowLength = Number.isFinite(window) && window > 0 ? window : Number.POSITIVE_INFINITY;
    // The `limit` parameter indicates how many of the smallest items are actually needed.
    // Items that compare equal are interchangeable for that selection, so a limit only yields
    // exactly the first `limit` items of the fully sorted stream if `sort` is a total order.
    const limit: number = options && options.limit;
    this.limit = Number.isFinite(limit) && limit >= 0 ? limit : Number.POSITIVE_INFINITY;
    this.sort = sort;
    this.sorted = [];
  }

  // Reads the smallest item in the current sorting window
  public override _read(count: number, done: () => void): void {
    let item;

    // Without a window, all items must be buffered before anything can be emitted anyway.
    // Buffer them unsorted here and sort once in _flush, which is O(n log n).
    // Maintaining the sorted array incrementally (below) would cost an O(n) splice per item.
    if (this.windowLength === Number.POSITIVE_INFINITY) {
      item = this.source!.read();
      while (item !== null) {
        this.offer(item);
        item = this.source!.read();
      }
      return done();
    }

    let { length } = this.sorted;
    // Try to read items until we reach the desired window length
    while (length !== this.windowLength) {
      item = this.source!.read();
      if (item === null) {
        break;
      }
      // Insert the item in the sorted window (smallest last)
      let left = 0;
      let right = length - 1;
      let mid;
      let order;
      while (left <= right) {
        mid = Math.trunc((left + right) / 2);
        order = this.sort(item, this.sorted[mid]);
        if (order < 0) {
          left = mid + 1;
        } else if (order > 0) {
          right = mid - 1;
        } else {
          left = mid;
          right = -1;
        }
      }
      this.sorted.splice(left, 0, item);
      length++;
    }
    // Push the smallest item in the window
    if (length === this.windowLength) {
      this._push(this.sorted.pop()!);
    }
    done();
  }

  // Flushes remaining data after the source has ended
  public override _flush(done: () => void): void {
    if (this.windowLength === Number.POSITIVE_INFINITY) {
      // Array.prototype.sort is stable, so sorting ascending and reversing keeps equal items
      // in their original order once they are popped off the end below.
      this.sorted.sort((left, right) => this.sort(left, right));
      this.sorted.reverse();
    }
    let { length } = this.sorted;
    while (length--) {
      this._push(this.sorted.pop()!);
    }
    done();
  }

  /**
   * Buffers an item, keeping at most `limit` of the smallest items seen so far.
   * Without a limit this is a plain push, and everything is sorted in `_flush`.
   */
  private offer(item: T): void {
    if (this.sorted.length < this.limit) {
      this.sorted.push(item);
      return;
    }
    if (this.limit === 0) {
      return;
    }
    if (!this.heapified) {
      // The buffer is full, so from here on it is kept as a max-heap: its largest item is the
      // first one that a smaller item can evict. Heapifying once costs O(limit).
      for (let i = (this.sorted.length >> 1) - 1; i >= 0; i--) {
        this.siftDown(i);
      }
      this.heapified = true;
    }
    // Anything not smaller than the largest buffered item can never make the cut
    if (this.sort(item, this.sorted[0]) < 0) {
      this.sorted[0] = item;
      this.siftDown(0);
    }
  }

  /**
   * Restores the max-heap property at the given index by moving its item down.
   */
  private siftDown(index: number): void {
    const { sorted } = this;
    const { length } = sorted;
    for (;;) {
      const left = 2 * index + 1;
      const right = left + 1;
      let largest = index;
      if (left < length && this.sort(sorted[left], sorted[largest]) > 0) {
        largest = left;
      }
      if (right < length && this.sort(sorted[right], sorted[largest]) > 0) {
        largest = right;
      }
      if (largest === index) {
        return;
      }
      [ sorted[index], sorted[largest] ] = [ sorted[largest], sorted[index] ];
      index = largest;
    }
  }
}
