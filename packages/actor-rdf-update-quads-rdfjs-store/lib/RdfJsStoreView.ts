import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { wrap } from 'asynciterator';
import { RdfStore } from 'rdf-stores';
import { termToString } from 'rdf-string';

/**
 * An RDF/JS store of which quads can be counted, read, added and removed synchronously,
 * as stores of N3 and rdf-stores can.
 */
export interface ISynchronousStore extends RDF.Store {
  countQuads: (subject?: RDF.Term | null, predicate?: RDF.Term | null, object?: RDF.Term | null,
    graph?: RDF.Term | null) => number;
  getQuads: (subject?: RDF.Term | null, predicate?: RDF.Term | null, object?: RDF.Term | null,
    graph?: RDF.Term | null) => RDF.Quad[];
  readQuads?: (subject?: RDF.Term | null, predicate?: RDF.Term | null, object?: RDF.Term | null,
    graph?: RDF.Term | null) => Iterable<RDF.Quad>;
  addQuad: (quad: RDF.Quad) => unknown;
  addQuads?: (quads: RDF.Quad[]) => unknown;
  removeQuad: (quad: RDF.Quad) => unknown;
}

/**
 * The graphs of which all quads are deleted, as in the destination interface.
 */
export type DeletedGraphs = RDF.DefaultGraph | 'NAMED' | 'ALL' | RDF.NamedNode[];

/**
 * Changes to a store that are not applied to it yet.
 */
export type StoreChange =
  { type: 'delete'; quads: RDF.Quad[] } |
  { type: 'insert'; quads: RDF.Quad[] } |
  { type: 'deleteGraphs'; graphs: DeletedGraphs };

/**
 * The quads of a store with changes that are not applied to it yet, as an RDF/JS source.
 * Quads of the store are hidden if their graph was cleared or if they were removed,
 * and the added quads are only those that the store does not show yet.
 */
export class RdfJsStoreView {
  private readonly store: ISynchronousStore;
  private added = RdfStore.createDefault();
  private removed = RdfStore.createDefault();
  private allCleared = false;
  private readonly clearedGraphs = new Map<string, RDF.Term>();

  public constructor(store: ISynchronousStore) {
    this.store = store;
  }

  /**
   * Apply a change to this view, but not to the store.
   * @param change A change.
   */
  public apply(change: StoreChange): void {
    switch (change.type) {
      case 'delete':
        for (const quad of change.quads) {
          // Quads that were added before are only in this view
          if (!this.added.removeQuad(quad) && this.isInStore(quad)) {
            this.removed.addQuad(quad);
          }
        }
        break;
      case 'insert':
        for (const quad of change.quads) {
          // Quads that were removed before are in the store
          if (!this.removed.removeQuad(quad) && !this.isInStore(quad)) {
            this.added.addQuad(quad);
          }
        }
        break;
      default:
        this.deleteGraphs(change.graphs);
    }
  }

  /**
   * Count the quads that match a pattern, exactly, as planners may take a count of zero to mean no results.
   */
  public countQuads(
    subject?: RDF.Term | null,
    predicate?: RDF.Term | null,
    object?: RDF.Term | null,
    graph?: RDF.Term | null,
  ): number {
    [ subject, predicate, object, graph ] = RdfJsStoreView.wildcards(subject, predicate, object, graph);
    let count = this.added.countQuads(subject, predicate, object, graph) -
      this.removed.countQuads(subject, predicate, object, graph);
    if (!this.allCleared) {
      if (graph) {
        if (!this.clearedGraphs.has(termToString(graph))) {
          count += this.store.countQuads(subject, predicate, object, graph);
        }
      } else {
        count += this.store.countQuads(subject, predicate, object);
        for (const cleared of this.clearedGraphs.values()) {
          count -= this.store.countQuads(subject, predicate, object, cleared);
        }
      }
    }
    return count;
  }

  /**
   * Produce the quads that match a pattern.
   */
  public match(
    subject?: RDF.Term | null,
    predicate?: RDF.Term | null,
    object?: RDF.Term | null,
    graph?: RDF.Term | null,
  ): AsyncIterator<RDF.Quad> {
    return wrap(this.readQuads(...RdfJsStoreView.wildcards(subject, predicate, object, graph)), { autoStart: false });
  }

  protected* readQuads(subject?: RDF.Term, predicate?: RDF.Term, object?: RDF.Term, graph?: RDF.Term):
  Generator<RDF.Quad> {
    if (!this.allCleared) {
      const quads = this.store.readQuads ?
        this.store.readQuads(subject, predicate, object, graph) :
        this.store.getQuads(subject, predicate, object, graph);
      if (this.removed.size === 0 && this.clearedGraphs.size === 0) {
        // Without deletions, the view shows all quads of the store
        yield* quads;
      } else {
        for (const quad of quads) {
          if (this.isShownInStore(quad)) {
            yield quad;
          }
        }
      }
    }
    yield* this.added.readQuads(subject, predicate, object, graph);
  }

  /**
   * Check if this view shows a quad of the store, as it is in a graph that was not cleared and was not removed.
   */
  protected isShownInStore(quad: RDF.Quad): boolean {
    return !this.clearedGraphs.has(termToString(quad.graph)) &&
      this.removed.countQuads(quad.subject, quad.predicate, quad.object, quad.graph) === 0;
  }

  /**
   * Check if this view shows the given quad from the store.
   */
  protected isInStore(quad: RDF.Quad): boolean {
    return !this.allCleared && this.store.countQuads(quad.subject, quad.predicate, quad.object, quad.graph) > 0 &&
      this.isShownInStore(quad);
  }

  protected deleteGraphs(graphs: DeletedGraphs): void {
    if (graphs === 'ALL') {
      this.allCleared = true;
      this.clearedGraphs.clear();
      this.added = RdfStore.createDefault();
      this.removed = RdfStore.createDefault();
      return;
    }
    let cleared: RDF.Term[];
    if (graphs === 'NAMED') {
      // The named graphs that this view shows
      const named = new Map<string, RDF.Term>();
      for (const quad of this.readQuads()) {
        if (quad.graph.termType !== 'DefaultGraph') {
          named.set(termToString(quad.graph), quad.graph);
        }
      }
      cleared = [ ...named.values() ];
    } else {
      cleared = Array.isArray(graphs) ? graphs : [ graphs ];
    }
    for (const graph of cleared) {
      if (!this.allCleared) {
        this.clearedGraphs.set(termToString(graph), graph);
      }
      for (const quad of this.added.getQuads(undefined, undefined, undefined, graph)) {
        this.added.removeQuad(quad);
      }
      for (const quad of this.removed.getQuads(undefined, undefined, undefined, graph)) {
        this.removed.removeQuad(quad);
      }
    }
  }

  /**
   * Replace variables and missing terms in a pattern by undefined, which stores take as wildcards.
   */
  protected static wildcards(...terms: (RDF.Term | null | undefined)[]): (RDF.Term | undefined)[] {
    return terms.map(term => term && term.termType !== 'Variable' ? term : undefined);
  }
}
