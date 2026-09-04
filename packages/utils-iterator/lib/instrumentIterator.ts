import type { AsyncIterator } from 'asynciterator';

export type IteratorCounters = {
  /**
   * The time spent within this iterator's own `_read` and `read`.
   *
   * Time spent in iterators that this one reads from is not included,
   * as those are measured separately by whatever produced them.
   */
  timeSelf: number;
  /**
   * The time between instrumentation and ending.
   */
  timeLife: number;
  /**
   * The number of elements produced.
   */
  count: number;
  /**
   * How the iterator reached its final state.
   *
   * `ended` and `destroyed` mean that the counters are complete,
   * `unfinished` means that the iterator was still running when the measurement was stopped.
   */
  state: 'ended' | 'destroyed' | 'unfinished';
};

/**
 * An ongoing measurement of an iterator.
 */
export interface IInstrumentedIterator {
  /**
   * Resolves with the counters once the iterator has ended, has been destroyed,
   * or the measurement was stopped via {@link IInstrumentedIterator#finish}.
   */
  counters: Promise<IteratorCounters>;
  /**
   * Stop the measurement and resolve {@link IInstrumentedIterator#counters}
   * with whatever was collected so far.
   *
   * This is needed for iterators that are never consumed and never destroyed,
   * as those would otherwise never resolve.
   */
  finish: () => void;
}

/**
 * Profile an iterator by monkey-patching its `_read` and `read` methods.
 *
 * Only the given iterator is patched, never the iterators it reads from: those belong to whichever
 * operation produced them, and patching them from here both double-counts their time and disturbs
 * streams that are already flowing.
 *
 * An iterator may be instrumented more than once, which happens when operations pass a stream
 * through unchanged. Every measurement then observes the same reads, instead of only the first
 * one collecting anything.
 *
 * @param iterator The iterator to measure.
 */
export function instrumentIterator(iterator: AsyncIterator<any>): IInstrumentedIterator {
  const counters: IteratorCounters = {
    count: 0,
    timeSelf: 0,
    timeLife: 0,
    state: 'unfinished',
  };
  const startTime = performance.now();

  let resolveCounters: (counters: IteratorCounters) => void;
  const countersPromise = new Promise<IteratorCounters>((resolve) => {
    resolveCounters = resolve;
  });
  const finish = (state: IteratorCounters['state']): void => {
    if (counters.state === 'unfinished') {
      counters.state = state;
      counters.timeLife = performance.now() - startTime;
      resolveCounters(counters);
    }
  };

  instrumentIteratorInner(iterator, counters);

  if (iterator.done) {
    // The iterator will not emit anything anymore, so no event will arrive
    finish(iterator.destroyed ? 'destroyed' : 'ended');
  } else {
    iterator.on('end', () => finish('ended'));
    // Destroying an iterator does not emit an `end` event, so hook into it directly
    // eslint-disable-next-line ts/unbound-method
    const destroyOld: any = iterator.destroy;
    iterator.destroy = (cause?: Error) => {
      destroyOld.call(iterator, cause);
      finish('destroyed');
    };
  }

  return {
    counters: countersPromise,
    finish: () => finish(counters.state === 'unfinished' ? 'unfinished' : counters.state),
  };
}

function instrumentIteratorInner(iterator: AsyncIterator<any>, counters: IteratorCounters): void {
  const countersExisting: IteratorCounters[] | undefined = (<any>iterator)._profileCounters;
  if (countersExisting) {
    // Another measurement already patched this iterator, so share its patched methods
    countersExisting.push(counters);
    return;
  }

  const countersAll: IteratorCounters[] = [ counters ];
  (<any>iterator)._profileCounters = countersAll;

  // Patch _read
  if ('_read' in iterator) {
    const readOld: any = iterator._read;
    iterator._read = (count: number, done: () => void) => {
      const startTime = performance.now();
      readOld.call(iterator, count, () => {
        const elapsed = performance.now() - startTime;
        for (const countersEntry of countersAll) {
          countersEntry.timeSelf += elapsed;
        }
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
    const elapsed = performance.now() - startTime;
    for (const countersEntry of countersAll) {
      if (ret) {
        countersEntry.count++;
      }
      countersEntry.timeSelf += elapsed;
    }
    return ret;
  };
}
