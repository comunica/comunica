import type { IQuadDestinationTransaction } from '@comunica/bus-rdf-update-quads';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import type { DeletedGraphs, ISynchronousStore, StoreChange } from './RdfJsStoreView';
import { RdfJsStoreView } from './RdfJsStoreView';

/**
 * The changes of an update request to an RDF/JS store, which are only applied to it on commit.
 *
 * Changes are recorded in the order in which they are made.
 * Later operations of the request read the store through a view with the changes so far,
 * which is only made once they read it.
 * On commit, all changes are applied in one synchronous step,
 * so that other queries never see only some of them,
 * and consecutive insertions are added together, which ordered stores of rdf-stores do as one batch.
 */
export class RdfJsStoreTransaction implements IQuadDestinationTransaction {
  private readonly store: ISynchronousStore;
  private changes: StoreChange[] = [];
  private view: RdfJsStoreView | undefined;
  private viewSource: RDF.Source | undefined;

  public constructor(store: ISynchronousStore) {
    this.store = store;
  }

  /**
   * The store with the changes so far, as a source, or undefined if there are no changes yet.
   * A new source is returned after every change, so that what was derived from an earlier one is not reused.
   */
  public get source(): RDF.Source | undefined {
    if (this.changes.length === 0) {
      return undefined;
    }
    if (!this.view) {
      this.view = new RdfJsStoreView(this.store);
      for (const change of this.changes) {
        this.view.apply(change);
      }
    }
    if (!this.viewSource) {
      const view = this.view;
      this.viewSource = <RDF.Source> <unknown> {
        match: view.match.bind(view),
        countQuads: view.countQuads.bind(view),
      };
    }
    return this.viewSource;
  }

  public async update(
    quadStreams: { insert?: AsyncIterator<RDF.Quad>; delete?: AsyncIterator<RDF.Quad> },
  ): Promise<void> {
    // As for the store itself, quads are deleted before they are inserted
    const deleted = quadStreams.delete ? await quadStreams.delete.toArray() : [];
    const inserted = quadStreams.insert ? await quadStreams.insert.toArray() : [];
    if (deleted.length > 0) {
      this.record({ type: 'delete', quads: deleted });
    }
    if (inserted.length > 0) {
      this.record({ type: 'insert', quads: inserted });
    }
  }

  public async deleteGraphs(
    graphs: DeletedGraphs,
    _requireExistence: boolean,
    _dropGraphs: boolean,
  ): Promise<void> {
    this.record({ type: 'deleteGraphs', graphs });
  }

  public async createGraphs(graphs: RDF.NamedNode[], requireNonExistence: boolean): Promise<void> {
    // Nothing has to be created, since RDF/JS stores don't record empty graphs.
    // The only check to do is whether a graph already exists, including the changes so far.
    if (requireNonExistence) {
      const source = <{ countQuads: ISynchronousStore['countQuads'] } | undefined> this.source;
      for (const graph of graphs) {
        if ((source ?? this.store).countQuads(undefined, undefined, undefined, graph) > 0) {
          throw new Error(`Unable to create graph ${graph.value} as it already exists`);
        }
      }
    }
  }

  public async commit(): Promise<void> {
    const changes = this.changes;
    this.discard();
    // Without awaiting anything in between, so that other queries see all changes or none
    for (let index = 0; index < changes.length; index++) {
      const change = changes[index];
      switch (change.type) {
        case 'insert': {
          const quads = [ ...change.quads ];
          while (changes[index + 1]?.type === 'insert') {
            index++;
            for (const quad of (<{ quads: RDF.Quad[] }> changes[index]).quads) {
              quads.push(quad);
            }
          }
          this.addQuads(quads);
          break;
        }
        case 'delete':
          for (const quad of change.quads) {
            this.store.removeQuad(quad);
          }
          break;
        default:
          for (const quad of this.getQuadsInGraphs(change.graphs)) {
            this.store.removeQuad(quad);
          }
      }
    }
  }

  public async rollback(): Promise<void> {
    this.discard();
  }

  protected record(change: StoreChange): void {
    this.changes.push(change);
    this.view?.apply(change);
    this.viewSource = undefined;
  }

  protected discard(): void {
    this.changes = [];
    this.view = undefined;
    this.viewSource = undefined;
  }

  protected addQuads(quads: RDF.Quad[]): void {
    if (this.store.addQuads) {
      this.store.addQuads(quads);
    } else {
      for (const quad of quads) {
        this.store.addQuad(quad);
      }
    }
  }

  /**
   * The quads of the store that are in the given graphs, collected before any of them is removed.
   */
  protected getQuadsInGraphs(graphs: DeletedGraphs): RDF.Quad[] {
    if (graphs === 'ALL') {
      return this.store.getQuads();
    }
    if (graphs === 'NAMED') {
      return this.store.getQuads().filter(quad => quad.graph.termType !== 'DefaultGraph');
    }
    return (Array.isArray(graphs) ? graphs : [ graphs ])
      .flatMap(graph => this.store.getQuads(undefined, undefined, undefined, graph));
  }
}
