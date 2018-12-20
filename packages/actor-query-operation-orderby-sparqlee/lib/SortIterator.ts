
import {AsyncIterator, TransformIterator} from "asynciterator";

// based on https://github.com/LinkedDataFragments/Client.js/blob/master/lib/sparql/SortIterator.js
export class SortIterator<T> extends TransformIterator<T, T> {

  private windowLength: number;
  private sort: (left: T, right: T) => number;
  private sorted: T[];

  constructor(source: AsyncIterator<T>, sort: (left: T, right: T) => number, options?: any) {
    super(source, options);

    // The `window` parameter indicates the length of the sliding window to apply sorting
    const window: number = options && options.window;
    this.windowLength = isFinite(window) && window > 0 ? window : Infinity;
    this.sort = sort;
    this.sorted = [];
  }

  // Reads the smallest item in the current sorting window
  public _read(count: number, done: () => void) {
    let item;
    let length = this.sorted.length;
    // Try to read items until we reach the desired window length
    while (length !== this.windowLength) {
      item = this.source.read();
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
          left  = mid + 1;
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
      this._push(this.sorted.pop());
    }
    done();
  }

  // Flushes remaining data after the source has ended
  public _flush(done: () => void) {
    let length = this.sorted.length;
    while (length--) {
      this._push(this.sorted.pop());
    }
    done();
  }
}
