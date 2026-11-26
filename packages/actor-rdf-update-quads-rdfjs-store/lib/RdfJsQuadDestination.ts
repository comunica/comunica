import type { IQuadDestination, IQuadDestinationTransaction } from '@comunica/bus-rdf-update-quads';
import type { ComunicaDataFactory } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { promisifyEventEmitter } from 'event-emitter-promisify';
import { stringToTerm, termToString } from 'rdf-string';
import { RdfJsStoreTransaction } from './RdfJsStoreTransaction';
import type { ISynchronousStore } from './RdfJsStoreView';

/**
 * A quad destination that wraps around an {@link RDF.Store}.
 */
export class RdfJsQuadDestination implements IQuadDestination {
  private readonly dataFactory: ComunicaDataFactory;
  private readonly store: RDF.Store;
  public readonly transactionKey: RDF.Store;
  public readonly beginTransaction?: () => IQuadDestinationTransaction;

  public constructor(
    dataFactory: ComunicaDataFactory,
    store: RDF.Store,
  ) {
    this.dataFactory = dataFactory;
    this.store = store;
    // The store also identifies it as a source, through which later operations of an update request read it
    this.transactionKey = store;
    if (RdfJsQuadDestination.isSynchronous(store)) {
      this.beginTransaction = () => new RdfJsStoreTransaction(store);
    }
  }

  /**
   * Check if the quads of a store can be counted, read, added and removed synchronously,
   * which transactions need to apply all their changes at once.
   * This is the case for stores of N3 and rdf-stores.
   * @param store An RDF/JS store.
   */
  public static isSynchronous(store: RDF.Store): store is ISynchronousStore {
    const candidate = <Partial<ISynchronousStore>> store;
    return typeof candidate.countQuads === 'function' && typeof candidate.getQuads === 'function' &&
      typeof candidate.addQuad === 'function' && typeof candidate.removeQuad === 'function';
  }

  public async update(
    quadStreams: { insert?: AsyncIterator<RDF.Quad>; delete?: AsyncIterator<RDF.Quad> },
  ): Promise<void> {
    if (quadStreams.delete) {
      await promisifyEventEmitter(this.store.remove(quadStreams.delete));
    }
    if (quadStreams.insert) {
      await promisifyEventEmitter(this.store.import(quadStreams.insert));
    }
  }

  public async deleteGraphs(
    graphs: RDF.DefaultGraph | 'NAMED' | 'ALL' | RDF.NamedNode[],
    _requireExistence: boolean,
    _dropGraphs: boolean,
  ): Promise<void> {
    switch (graphs) {
      case 'ALL':
        /* eslint-disable no-fallthrough */
        // Remove the default graph
        await promisifyEventEmitter(this.store.deleteGraph(this.dataFactory.defaultGraph()));
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
        await promisifyEventEmitter(allQuads);

        // Delete all named graphs
        await Promise.all(Object.keys(namedGraphs)
          .map(namedGraph => promisifyEventEmitter(this.store
            .deleteGraph(<RDF.NamedNode> stringToTerm(namedGraph, this.dataFactory)))));
        break;
      default:
        // Delete the default graph or a named graph
        for (const graph of Array.isArray(graphs) ? graphs : [ graphs ]) {
          await promisifyEventEmitter(this.store.deleteGraph(graph));
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
