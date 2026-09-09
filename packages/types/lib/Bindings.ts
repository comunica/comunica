import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';

/**
 * An immutable solution mapping object.
 * This maps variables to a terms.
 */
export type Bindings = RDF.Bindings;

/**
 * A stream of bindings.
 * @see Bindings
 */
export type BindingsStream = AsyncIterator<RDF.Bindings> & RDF.ResultStream<Bindings>;

/**
 * A stream of bindings that can skip ahead to a binding, instead of being consumed one at a time.
 *
 * A merge join spends most of its time advancing whichever side is behind. When a source knows where a
 * key lives, for example because it is backed by a sorted array or an index it can descend, it can drop
 * everything before that key at once instead of handing them over to be compared and discarded.
 * @see BindingsStream
 */
export interface ISeekableBindingsStream extends BindingsStream {
  /**
   * Skip past every remaining binding that precedes `target` in this stream's declared order.
   *
   * Only meaningful on a stream that reports an `order` covering the terms `target` binds. After this
   * call the next read returns the first binding that does not precede `target`, or nothing if the
   * stream holds no such binding. Implementations may skip fewer bindings than they could, and one
   * sitting behind a buffer may still emit bindings from before the target, so a consumer must remain
   * tolerant of those. No implementation may skip a binding that does not precede `target`.
   * @param target The bindings to skip ahead to.
   */
  seek: (target: Bindings) => void;
}
