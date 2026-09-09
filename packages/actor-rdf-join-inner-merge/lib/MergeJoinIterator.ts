import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import type { ITermComparator } from '@comunica/bus-term-comparator-factory';
import type { Bindings, TermsOrder } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { BufferedIterator } from 'asynciterator';

/**
 * Compares two bindings by the terms they bind to the given merge key.
 * Returns a negative number if `left` precedes `right` in the streams' order, 0 if they share the same key.
 * @param termComparator A comparator following the SPARQL order semantics.
 * @param mergeKey The (non-empty) order prefix that both streams are sorted on.
 */
export function createKeyComparator(
  termComparator: ITermComparator,
  mergeKey: TermsOrder<RDF.Variable>,
): (left: Bindings, right: Bindings) => number {
  return (left: Bindings, right: Bindings): number => {
    for (const { term, direction } of mergeKey) {
      const comparison = termComparator.orderTypes(left.get(term), right.get(term));
      if (comparison !== 0) {
        return direction === 'asc' ? comparison : -comparison;
      }
    }
    return 0;
  };
}

/**
 * Reads the next bindings from an iterator, waiting for them if they are not available yet.
 * Resolves to null once the iterator has ended.
 * The synchronous path avoids a promise for the common case of a buffered iterator.
 */
export function readOrWait(iterator: AsyncIterator<Bindings>): Bindings | null | Promise<Bindings | null> {
  const item = iterator.read();
  if (item !== null) {
    return item;
  }
  if (iterator.done) {
    return null;
  }
  return new Promise<Bindings | null>((resolve, reject) => {
    const cleanup = (): void => {
      iterator.removeListener('readable', onReadable);
      iterator.removeListener('end', onEnd);
      iterator.removeListener('error', onError);
    };
    const onReadable = (): void => {
      const next = iterator.read();
      if (next !== null) {
        cleanup();
        resolve(next);
      }
    };
    const onEnd = (): void => {
      cleanup();
      resolve(null);
    };
    const onError = (error: Error): void => {
      cleanup();
      reject(error);
    };
    iterator.on('readable', onReadable);
    iterator.on('end', onEnd);
    iterator.on('error', onError);
  });
}

/**
 * Merges two streams that are both sorted on the same join key.
 *
 * Both sides are read once, sequentially, always advancing the side that is behind.
 * Whenever both sides are at the same key, the full run of equal keys from `buffered` is materialized,
 * and the (streamed) run of equal keys from `streamed` is emitted against it as a cross product.
 * Bindings within a run that disagree on a non-key variable are dropped by the join.
 */
async function* mergeSorted(
  streamed: AsyncIterator<Bindings>,
  buffered: AsyncIterator<Bindings>,
  compareKeys: (left: Bindings, right: Bindings) => number,
): AsyncGenerator<Bindings> {
  let streamedItem = await readOrWait(streamed);
  let bufferedItem = await readOrWait(buffered);

  while (streamedItem !== null && bufferedItem !== null) {
    const comparison = compareKeys(streamedItem, bufferedItem);
    if (comparison < 0) {
      streamedItem = await readOrWait(streamed);
      continue;
    }
    if (comparison > 0) {
      bufferedItem = await readOrWait(buffered);
      continue;
    }

    // Materialize the run of equal keys on the buffered side.
    const run: Bindings[] = [ bufferedItem ];
    let nextBuffered = await readOrWait(buffered);
    while (nextBuffered !== null && compareKeys(bufferedItem, nextBuffered) === 0) {
      run.push(nextBuffered);
      nextBuffered = await readOrWait(buffered);
    }
    bufferedItem = nextBuffered;

    // Emit the run against every streamed binding sharing that key.
    while (streamedItem !== null && compareKeys(streamedItem, run[0]) === 0) {
      for (const runItem of run) {
        const joined = ActorRdfJoin.joinBindings(streamedItem, runItem);
        if (joined !== null) {
          yield joined;
        }
      }
      streamedItem = await readOrWait(streamed);
    }
  }
}

/**
 * An iterator that merge-joins two streams that are sorted on a common join key.
 */
export class MergeJoinIterator extends BufferedIterator<Bindings> {
  private readonly streamed: AsyncIterator<Bindings>;
  private readonly buffered: AsyncIterator<Bindings>;
  private readonly merged: AsyncGenerator<Bindings>;

  public constructor(
    streamed: AsyncIterator<Bindings>,
    buffered: AsyncIterator<Bindings>,
    compareKeys: (left: Bindings, right: Bindings) => number,
  ) {
    super({ autoStart: false });
    this.streamed = streamed;
    this.buffered = buffered;
    this.merged = mergeSorted(streamed, buffered, compareKeys);
  }

  protected override _read(count: number, done: () => void): void {
    this.pushNext(count).then(done, done);
  }

  private async pushNext(count: number): Promise<void> {
    try {
      for (let i = 0; i < count; i++) {
        const next = await this.merged.next();
        if (next.done === true) {
          this.close();
          break;
        }
        this._push(next.value);
      }
    } catch (error: unknown) {
      this.destroy(<Error> error);
    }
  }

  protected override _end(destroy?: boolean): void {
    super._end(destroy);
    this.streamed.destroy();
    this.buffered.destroy();
  }
}
