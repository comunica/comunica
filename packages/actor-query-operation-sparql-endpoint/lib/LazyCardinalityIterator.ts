import { AsyncIterator, LinkedList, DESTINATION } from 'asynciterator';

/**
  An iterator that maintains an internal buffer of items.
  This class serves as a base class for other iterators
  with a typically complex item generation process.
  @extends module:asynciterator.AsyncIterator
*/
export class LazyCardinalityIterator<T> extends AsyncIterator<T> {
  private _buffer?: LinkedList<T>;
  private _cardinality?: Promise<number>;
  private readonly _error: any;
  private _count = 0;
  private _buffering = true;

  public constructor(private readonly _source: AsyncIterator<T>) {
    super();
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    (<InternalSource<T>> _source)[DESTINATION] = this;
    _source.on('readable', destinationSetReadable);
    _source.on('end', destinationSetReadable);
    _source.on('error', destinationEmitError);
    this.readable = _source.readable;
  }

  public read(): T | null {
    if (this._buffer) {
      if (!this._buffer.empty) {
        return this._buffer.shift()!;
      }
      if (!this._buffering) {
        this.close();
      }

      this.readable = false;
      return null;
    }

    let item: T | null = null;
    // eslint-disable-next-line no-cond-assign
    if (this._source.readable && (item = this._source.read()) !== null) {
      this._count += 1;
    } else {
      this.readable = false;
      if (this._source.done) {
        this.close();
      }
    }

    return item;
  }

  public getCardinality(): Promise<number> {
    if (this._cardinality) {
      return this._cardinality;
    }

    if (this._error) {
      return Promise.reject(this._error);
    }

    if (this._source.done) {
      this.close();
    }

    if (this.done) {
      this._cardinality = Promise.resolve(this._count);
    } else {
      this._buffer = new LinkedList();
      this._cardinality = new Promise((resolve, reject) => {
        this._source.removeListener('readable', destinationSetReadable);
        this._source.removeListener('end', destinationSetReadable);

        const clean = (): void => {
          this._source.removeListener('data', onData);
          this._source.removeListener('end', onEnd);
          this._source.removeListener('error', onError);
        };

        const onData = (data: T): void => {
          this._buffer!.push(data);
          this._count += 1;
          this.readable = true;
        };
        const onEnd = (): void => {
          this._buffering = false;
          clean();
          resolve(this._count);
        };
        const onError = (err: any): void => {
          this._buffering = false;
          clean();
          reject(err);
        };

        this._source.on('data', onData);
        this._source.on('end', onEnd);
        this._source.on('error', onError);
      });
    }

    return this._cardinality;
  }

  public close(): void {
    this._source.removeListener('readable', destinationSetReadable);
    this._source.removeListener('end', destinationSetReadable);
    this._source.removeListener('error', destinationEmitError);
    delete (<any> this._source)[DESTINATION];
    this._source.destroy();
    super.close();
  }
}

type InternalSource<S> = AsyncIterator<S> & { [DESTINATION]: AsyncIterator<any> };

function destinationSetReadable<S>(this: InternalSource<S>): void {
  this[DESTINATION]!.readable = true;
}
function destinationEmitError<S>(this: InternalSource<S>, error: Error): void {
  (<any> this[DESTINATION]!)._error = error;
  this[DESTINATION]!.emit('error', error);
}
