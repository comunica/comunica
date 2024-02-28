// eslint-disable-next-line import/no-nodejs-modules
import type { EventEmitter } from 'node:events';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import type { MetadataBindings } from './IMetadata';

/**
 * A StreamingStore allows data lookup and insertion to happen in parallel.
 * Concretely, this means that `match()` calls happening before `import()` calls, will still consider those triples that
 * are inserted later, which is done by keeping the response streams of `match()` open.
 * Only when the `end()` method is invoked, all response streams will close, and the StreamingStore will be considered
 * immutable.
 *
 * WARNING: `end()` MUST be called at some point, otherwise all `match` streams will remain unended.
 */
export interface IAggregatedStore<Q extends RDF.BaseQuad = RDF.Quad>
  extends RDF.Source<Q>, RDF.Sink<RDF.Stream<Q>, EventEmitter> {
  /**
   * If this aggregated has started processing.
   */
  started: boolean;

  /**
   * The sources that are indexed in this store.
   */
  containedSources: Set<string>;

  /**
   * If iterators created during the `match` call are still running.
   */
  hasRunningIterators: () => boolean;

  /**
   * Mark this store as ended.
   *
   * This will make sure that all running and future `match` calls will end,
   * and all next `import` calls to this store will throw an error.
   */
  end: () => void;

  /**
   * Update the metadata of the base iterator, from which the aggregated store is being populated.
   * @param metadata The metadata object.
   * @param updateState If the metadata state of derived iterators should be immediately updated.
   */
  setBaseMetadata: (metadata: MetadataBindings, updateStates: boolean) => void;

  /**
   * Register a listener that will be invoked when a new iterator is returned from match().
   * @param listener A listener.
   */
  addIteratorCreatedListener: (listener: () => void) => void;
  /**
   * Remove the given iterator creation listener.
   * @param listener A listener.
   */
  removeIteratorCreatedListener: (listener: () => void) => void;

  match: (
    subject?: RDF.Term | null,
    predicate?: RDF.Term | null,
    object?: RDF.Term | null,
    graph?: RDF.Term | null,
  ) => AsyncIterator<Q>;
}
