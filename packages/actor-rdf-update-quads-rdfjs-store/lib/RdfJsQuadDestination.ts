import type { IQuadDestination } from '@comunica/bus-rdf-update-quads';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
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
    graphs: RDF.DefaultGraph | 'NAMED' | 'ALL' | RDF.NamedNode[],
    requireExistence: boolean,
    dropGraphs: boolean,
  ): Promise<void> {
    switch (graphs) {
      case 'ALL':
        /* eslint-disable no-fallthrough */
        // Remove the default graph
        await this.promisifyEventEmitter(this.store.deleteGraph(DF.defaultGraph()));
        // Drop through to remove all named graphs
      case 'NAMED':
        /* eslint-enable no-fallthrough */
        // Warning: this is sub-optimal!
        // Query ALL quads to determine all named graphs
        // eslint-disable-next-line no-case-declarations
        const allQuads = this.store.match();
        // eslint-disable-next-line no-case-declarations
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
        for (const graph of Array.isArray(graphs) ? graphs : [ graphs ]) {
          await this.promisifyEventEmitter(this.store.deleteGraph(graph));
        }
    }
  }

  public async createGraphs(graphs: RDF.NamedNode[], requireNonExistence: boolean): Promise<void> {
    // We don't have to create anything, since RDF/JS stores don't record empty graphs.

    // The only check we have to do is error on existence
    if (requireNonExistence) {
      for (const graph of graphs) {
        const eventEmitter = this.store.match(undefined, undefined, undefined, graph);
        await new Promise<void>((resolve, reject) => {
          eventEmitter.once('data', () => {
            reject(new Error(`Unable to create graph ${graph.value} as it already exists`));
          });
          eventEmitter.on('end', resolve);
          eventEmitter.on('error', reject);
        });
      }
    }
  }
}
