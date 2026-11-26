import type * as RDF from '@rdfjs/types';

/**
 * Changes to one destination by an update request, which only take effect once they are committed.
 */
export interface IDestinationTransaction {
  /**
   * Apply all changes to the destination.
   */
  commit: () => Promise<void>;
  /**
   * Discard all changes.
   */
  rollback: () => Promise<void>;
  /**
   * The data of the destination with the changes so far, as an RDF/JS source,
   * through which later operations of the update request read the destination if it is also one of its sources.
   * Undefined if there are no changes yet, or if the destination can not be read like that.
   * Sources that read through it are identified by the same key as the transaction.
   */
  readonly source?: RDF.Source;
}

/**
 * The transactions of the destinations that an update request changes.
 * They are committed once all operations of the request succeed, and rolled back if one of them fails,
 * so that a request has either all or none of its effects, as SPARQL 1.1 Update prescribes in section 2.2.
 */
export interface IUpdateTransaction {
  /**
   * Get the transaction of a destination in this request, which is begun if the request has none for it yet.
   * @param key What identifies the data of the destination, such as the RDF/JS store that it changes.
   * @param begin Begins a transaction of the destination.
   */
  get: <T extends IDestinationTransaction>(key: unknown, begin: () => T) => T;
  /**
   * Find the transaction of a destination in this request, if one was begun.
   * @param key What identifies the data of the destination.
   */
  find: (key: unknown) => IDestinationTransaction | undefined;
}
