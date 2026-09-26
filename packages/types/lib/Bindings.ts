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
 * This is for example useful for merge joins that want to skip ahead.
 * @see BindingsStream
 */
export interface ISeekableBindingsStream extends BindingsStream {
  /**
   * Skip past every remaining binding that precedes `target` in this stream's declared term order.
   *
   * After this call the next read returns the first binding that does not precede `target`, or nothing if the
   * stream holds no such binding. Implementations may skip fewer bindings than they could.
   * No implementation may skip a binding that does not precede `target`.
   * @param target The bindings to skip ahead to.
   */
  seek: (target: Bindings) => void;
}
