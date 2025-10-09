import type { AsyncIterator } from 'asynciterator';
import type { ILink } from './ILink';
import type { ILinkQueue } from './ILinkQueue';
import type { IQuerySource } from './IQuerySource';

/**
 * A link traversal manager manages a link queue, and uses it to populate the aggregated query source and
 * non-aggregated query sources.
 * The aggregated source contains all documents that do not offer a proper query interface.
 * All sources with a proper query interface are captured in the nhe non-aggregated query sources.
 */
export interface ILinkTraversalManager {
  /**
   * The seed links used for populating the link queue.
   */
  seeds: ILink[];
  /**
   * The queue of links to be followed.
   */
  linkQueue: ILinkQueue;
  /**
   * If the traversal has been initiated.
   */
  started: boolean;
  /**
   * If the traversal has ended, either forcefully, or after draining the link queue completely.
   */
  stopped: boolean;
  /**
   * Start traversal over the link queue.
   * @param rejectionHandler A callback for error events.
   */
  start: (rejectionHandler: (error: Error) => void) => void;
  /**
   * Terminate traversal.
   */
  stop: () => void;
  /**
   * Get the query source containing all triples obtained from traversal.
   * This excludes sources that can not be aggregated, such as SPARQL endpoints.
   */
  getQuerySourceAggregated: () => IQuerySource;
  /**
   * Create a new iterator over all query sources that could not be aggregated in the main query source.
   * This iterator will only end once traversal stops.
   */
  getQuerySourcesNonAggregated: () => AsyncIterator<IQuerySource>;
  /**
   * Register a listener to listen to stop events.
   * @param cb Listener that will be invoked once the traversal stops.
   */
  addStopListener: (cb: () => void) => void;
}
