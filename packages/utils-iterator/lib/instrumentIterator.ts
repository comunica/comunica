import type { AsyncIterator } from 'asynciterator';

export type IteratorCounters = {
  /**
   * The total time spent within `_read` and `read`.
   */
  timeSelf: number;
  /**
   * The time between creation and ending.
   */
  timeLife: number;
  /**
   * The number of elements produced.
   */
  count: number;
};

/**
 * Profile an iterator by monkey-patching its `_read` and `read` methods.
 * @param iterator
 */
export function instrumentIterator(iterator: AsyncIterator<any>): Promise<IteratorCounters> {
  const counters: IteratorCounters = {
    count: 0,
    timeSelf: 0,
    timeLife: 0,
  };
  instrumentIteratorInner(iterator, counters, true);
  return new Promise((resolve) => {
    iterator.on('end', () => {
      resolve(counters);
    });
  });
}

function instrumentIteratorInner(
  iterator: AsyncIterator<any>,
  counter: { timeSelf: number; timeLife: number; count: number },
  top: boolean,
): void {
  if (!('_profileInstrumented' in iterator)) {
    // Only patch an iterator once.
    (<any>iterator)._profileInstrumented = true;

    // Patch _read
    if ('_read' in iterator) {
      const readOld: any = iterator._read;
      iterator._read = (count: number, done: () => void) => {
        const startTime = performance.now();
        readOld.call(iterator, count, () => {
          counter.timeSelf += performance.now() - startTime;
          done();
        });
      };
    }

    // Patch read
    // eslint-disable-next-line ts/unbound-method
    const readOld: any = iterator.read;
    iterator.read = () => {
      const startTime = performance.now();
      const ret = readOld.call(iterator);
      if (top && ret) {
        counter.count++;
      }
      counter.timeSelf += performance.now() - startTime;
      return ret;
    };

    // Measure total time
    if (top) {
      const startTime = performance.now();
      iterator.on('end', () => {
        counter.timeLife = performance.now() - startTime;
      });
    }

    // Also patch children
    if ('_source' in iterator) {
      instrumentIteratorInner(<any>iterator._source, counter, false);
    }
  }
}
