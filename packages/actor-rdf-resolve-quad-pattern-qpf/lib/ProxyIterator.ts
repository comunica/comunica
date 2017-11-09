import {AsyncIterator, TransformIterator} from "asynciterator";

/**
 * A {@link TransformIterator} that allows the source to be set through a lazy Promise.
 *
 * Rejections of the promise will be emitted as error event.
 */
export class ProxyIterator<T> extends TransformIterator<T, T> {

  protected readonly sourceGetter: () => Promise<AsyncIterator<T>>;

  constructor(sourceGetter: () => Promise<AsyncIterator<T>>) {
    super();
    this.sourceGetter = sourceGetter;
  }

  protected _begin(done: () => void) {
    this.sourceGetter().then((source: AsyncIterator<T>) => {
      this.source = source;
      done();
    }).catch((error) => this.emit('error', error));
  }

}
