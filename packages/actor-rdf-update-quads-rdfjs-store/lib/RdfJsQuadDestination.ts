import type { IQuadDestination } from '@comunica/bus-rdf-update-quads';
import type { AsyncIterator } from 'asynciterator';
import type * as RDF from 'rdf-js';

/**
 * A quad destination that wraps around an {@link RDF.Store}.
 */
export class RdfJsQuadDestination implements IQuadDestination {
  private readonly store: RDF.Store;

  public constructor(store: RDF.Store) {
    this.store = store;
  }

  public delete(quads: AsyncIterator<RDF.Quad>): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const eventEmitter = this.store.remove(quads);
      eventEmitter.on('end', resolve);
      eventEmitter.on('error', reject);
    });
  }

  public insert(quads: AsyncIterator<RDF.Quad>): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const eventEmitter = this.store.import(quads);
      eventEmitter.on('end', resolve);
      eventEmitter.on('error', reject);
    });
  }
}
