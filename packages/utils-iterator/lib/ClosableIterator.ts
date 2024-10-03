import { AsyncIterator, DESTINATION } from 'asynciterator';

type InternalSource<T> =
  AsyncIterator<T> & { [DESTINATION]?: AsyncIterator<any> };

/**
 * An AsyncIterator with a callback for when this iterator is closed in any way.
 * In contrast to ClosableTransformIterator, this does not add the overhead of a TransformIterator.
 */
export class ClosableIterator<S> extends AsyncIterator<S> {
  protected readonly _source: InternalSource<S>;
  private readonly onClose: () => void;

  public constructor(source: AsyncIterator<S>, options: { onClose: () => void }) {
    super();
    this.onClose = options.onClose;
    this._source = <InternalSource<S>> source;

    // Wire up the source for reading
    this._source[DESTINATION] = this;
    this._source.on('end', destinationClose);
    this._source.on('error', destinationEmitError);
    this._source.on('readable', destinationSetReadable);
    this.readable = this._source.readable;
  }

  public override read(): S | null {
    const ret = this._source.read();
    if (!ret) {
      // Mark as non-readable if ret was null
      this.readable = false;

      // Close this iterator if the source is empty
      if (this._source.done) {
        this.close();
      }
    }
    return ret;
  }

  protected override _end(destroy: boolean): void {
    this.onClose();

    this._source.removeListener('end', destinationClose);
    this._source.removeListener('error', destinationEmitError);
    this._source.removeListener('readable', destinationSetReadable);
    delete this._source[DESTINATION];
    this._source.destroy();
    super._end(destroy);
  }
}

// Helpers below are copied from AsyncIterator, as they are not exported from there.

function destinationSetReadable<S>(this: InternalSource<S>): void {
  this[DESTINATION]!.readable = true;
}
function destinationEmitError<S>(this: InternalSource<S>, error: Error): void {
  this[DESTINATION]!.emit('error', error);
}
function destinationClose<S>(this: InternalSource<S>): void {
  this[DESTINATION]!.close();
}
