import type { AsyncIterator, TransformIteratorOptions } from 'asynciterator';
import { TransformIterator } from 'asynciterator';

declare type MaybePromise<T> = T | Promise<T>;
declare type SourceExpression<T> = MaybePromise<AsyncIterator<T>> | (() => MaybePromise<AsyncIterator<T>>);

/**
 * A TransformIterator with a callback for when this iterator is closed in any way.
 */
export class ClosableTransformIterator<S, D = S> extends TransformIterator<S, D> {
  private readonly onClose: () => void;

  /**
   * Creates a new closable transform iterator wrapping the given source.
   * @param source The source iterator or a promise/factory resolving to one.
   * @param options Transform iterator options including the close callback.
   */
  public constructor(source: SourceExpression<S>, options: TransformIteratorOptions<S> & { onClose: () => void }) {
    super(source, options);
    this.onClose = options.onClose;
  }

  /**
   * Ends this iterator by invoking the close callback before delegating to the parent.
   * @param destroy Whether the iterator is being destroyed.
   */
  protected override _end(destroy: boolean): void {
    this.onClose();
    super._end(destroy);
  }
}
