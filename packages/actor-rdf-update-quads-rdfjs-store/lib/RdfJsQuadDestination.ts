/* eslint-disable no-case-declarations */
import type { IQuadDestination } from '@comunica/bus-rdf-update-quads';
import type { AsyncIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import type * as RDF from 'rdf-js';
import { stringToTerm, termToString } from 'rdf-string';
import EventEmitter = NodeJS.EventEmitter;

const DF = new DataFactory();

/**
 * A quad destination that wraps around an {@link RDF.Store}.
 */
export class RdfJsQuadDestination implements IQuadDestination {
  private readonly store: RDF.Store;

  public constructor(store: RDF.Store) {
    this.store = store;
  }

  protected promisifyEventEmitter(eventEmitter: EventEmitter): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      eventEmitter.on('end', resolve);
      eventEmitter.on('error', reject);
    });
  }

  public delete(quads: AsyncIterator<RDF.Quad>): Promise<void> {
    return this.promisifyEventEmitter(this.store.remove(quads));
  }

  public insert(quads: AsyncIterator<RDF.Quad>): Promise<void> {
    return this.promisifyEventEmitter(this.store.import(quads));
  }

  public async deleteGraphs(
    graphs: RDF.DefaultGraph | 'NAMED' | 'ALL' | RDF.NamedNode,
    requireExistence: boolean,
    dropGraphs: boolean,
  ): Promise<void> {
    switch (graphs) {
      case 'ALL':
        // Remove the default graph
        await this.promisifyEventEmitter(this.store.deleteGraph(DF.defaultGraph()));
        // Drop through to remove all named graphs
      // eslint-disable-next-line no-fallthrough
      case 'NAMED':
        // Warning: this is sub-optimal!
        // Query ALL quads to determine all named graphs
        const allQuads = this.store.match();
        const namedGraphs: Record<string, boolean> = {};
        allQuads.on('data', (quad: RDF.Quad) => {
          if (quad.graph.termType !== 'DefaultGraph') {
            namedGraphs[termToString(quad.graph)] = true;
          }
        });
        await this.promisifyEventEmitter(allQuads);

        // Delete all named graphs
        await Promise.all(Object.keys(namedGraphs)
          .map(namedGraph => this.promisifyEventEmitter(this.store
            .deleteGraph(<RDF.NamedNode> stringToTerm(namedGraph)))));
        break;
      default:
        // Delete the default graph or a named graph
        return await this.promisifyEventEmitter(this.store.deleteGraph(graphs));
    }
  }
}
