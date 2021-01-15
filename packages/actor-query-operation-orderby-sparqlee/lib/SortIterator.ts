import type { AsyncIterator } from 'asynciterator';
import { TransformIterator } from 'asynciterator';

// Based on https://github.com/LinkedDataFragments/Client.js/blob/master/lib/sparql/SortIterator.js
export class SortIterator<T> extends TransformIterator<T, T> {
  private readonly windowLength: number;
  private readonly sort: (left: T, right: T) => number;
  private readonly sorted: T[];

  public constructor(source: AsyncIterator<T>, sort: (left: T, right: T) => number, options?: any) {
    super(source, options);

    // The `window` parameter indicates the length of the sliding window to apply sorting
    const window: number = options && options.window;
    this.windowLength = Number.isFinite(window) && window > 0 ? window : Number.POSITIVE_INFINITY;
    this.sort = sort;
    this.sorted = [];
  }

  // Reads the smallest item in the current sorting window
  public _read(count: number, done: () => void): void {
    let item;
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
  public _flush(done: () => void): void {
    let { length } = this.sorted;
    while (length--) {
      this._push(this.sorted.pop()!);
    }
    done();
  }
}
