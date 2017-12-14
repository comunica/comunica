import {AsyncIterator, BufferedIterator, BufferedIteratorOptions} from "asynciterator";

/**
 * An iterator that takes elements from a given set of iterators in a round-robin manner.
 *
 * Based on LDF client's UnionIterator:
 * https://github.com/LinkedDataFragments/Client.js/blob/master/lib/sparql/UnionIterator.js
 */
export class RoundRobinUnionIterator<T> extends BufferedIterator<T> {

  protected readonly sources: AsyncIterator<T>[];
  protected currentSource: number = 0;

  constructor(sources: AsyncIterator<T>[], options?: BufferedIteratorOptions) {
    super(options);
    this.sources = sources;

    for (const source of this.sources) {
      source.on('readable', () => this._fillBuffer());
      source.on('end', () => this._fillBuffer());
      source.on('error', (error) => this.emit('error', error));
    }
  }

  public _read(count: number, done: () => void): void {
    let item: T = null;
    let attempts: number = this.sources.length;

    // Iterate over all sources once
    while (this.sources.length && item === null && attempts--) {
      const source = this.sources[this.currentSource];

      // Read from the current source
      item = source.read();

      // Remove the source if it has ended, otherwise, increment our stored position
      if (source.ended) {
        this.sources.splice(this.currentSource);
      } else {
        this.currentSource++;
      }

      this.currentSource = this.currentSource % this.sources.length;
    }

    // Push to the buffer if we have an item
    if (item !== null) {
      this._push(item);
    }
    // Otherwise close
    if (!this.sources.length) {
      this.close();
    }

    done();
  }

}
