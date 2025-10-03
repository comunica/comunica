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
  seeds: ILink[];
  linkQueue: ILinkQueue;
  started: boolean;
  start: (rejectionHandler: (error: Error) => void) => void;
  stop: () => void;
  getQuerySourceAggregated: () => IQuerySource;
  getQuerySourcesNonAggregated: () => AsyncIterator<IQuerySource>;
  addEndListener: (cb: () => void) => void;
}
