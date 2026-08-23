import type { AsyncIterator } from 'asynciterator';
import { TransformIterator } from 'asynciterator';

// Based on https://github.com/LinkedDataFragments/Client.js/blob/master/lib/sparql/SortIterator.js
export class SortIterator<T> extends TransformIterator<T, T> {
  private readonly windowLength: number;
  private readonly sort: (left: T, right: T) => number;
  private readonly sorted: T[];
  /**
   * True if the whole stream is buffered before sorting (no sliding window is applied).
   * In that case a single O(n log n) sort in `_flush` is used instead of
   * an O(n²) binary insertion sort in `_read`.
   */
  private readonly unbounded: boolean;

  public constructor(source: AsyncIterator<T>, sort: (left: T, right: T) => number, options?: any) {
    super(source, options);

    // The `window` parameter indicates the length of the sliding window to apply sorting
    const window: number = options && options.window;
    this.windowLength = Number.isFinite(window) && window > 0 ? window : Number.POSITIVE_INFINITY;
    this.unbounded = this.windowLength === Number.POSITIVE_INFINITY;
    this.sort = sort;
    this.sorted = [];
  }

  // Reads the smallest item in the current sorting window
  public override _read(count: number, done: () => void): void {
    let item;
    // Without a sliding window, no item can be emitted before the source ends anyway,
    // so we just buffer everything here and sort once in `_flush`.
    if (this.unbounded) {
      item = this.source!.read();
      while (item !== null) {
        this.sorted.push(item);
        item = this.source!.read();
      }
      done();
      return;
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
    if (this.unbounded) {
      this.sorted.sort(this.sort);
      for (const item of this.sorted) {
        this._push(item);
      }
      this.sorted.length = 0;
      done();
      return;
    }

    let { length } = this.sorted;
    while (length--) {
      this._push(this.sorted.pop()!);
    }
    done();
  }
}
