import type { IDestinationTransaction } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';

/**
 * A quad destination.
 */
export interface IQuadDestination {
  /**
   * Updates destination with quad stream to insert and quad stream to delete.
   * @param quadStreams The quads to insert and delete.
   */
  update: (quadStreams: { insert?: AsyncIterator<RDF.Quad>; delete?: AsyncIterator<RDF.Quad> }) => Promise<void>;
  /**
   * Graphs that should be deleted.
   * @param graphs The graph(s) in which all triples must be removed.
   * @param requireExistence If true, and any of the graphs does not exist, an error must be emitted.
   *                         Should only be considered on destinations that record empty graphs.
   * @param dropGraphs If the graphs themselves should also be dropped.
   *                   Should not happen on the 'DEFAULT' graph.
   *                   Should only be considered on destinations that record empty graphs.
   */
  deleteGraphs: (
    graphs: RDF.DefaultGraph | 'NAMED' | 'ALL' | RDF.NamedNode[],
    requireExistence: boolean,
    dropGraphs: boolean,
  ) => Promise<void>;
  /**
   * Create the given (empty) graphs.
   * @param graphs The graph names to create.
   * @param requireNonExistence If true, an error MUST be thrown when any of the graph already exists.
   *                            For destinations that do not record empty graphs,
   *                            this should only throw if at least one quad with the given quad already exists.
   */
  createGraphs: (graphs: RDF.NamedNode[], requireNonExistence: boolean) => Promise<void>;
  /**
   * Begin a transaction of changes to this destination, if it supports transactions.
   * Update requests change their destinations through transactions,
   * so that their changes only take effect once all operations of the request succeed.
   */
  beginTransaction?: () => IQuadDestinationTransaction;
  /**
   * What identifies the data that this destination changes, such as an RDF/JS store,
   * so that all operations of an update request change it through the same transaction.
   * Defaults to the destination itself.
   */
  transactionKey?: unknown;
}

/**
 * Changes to a quad destination, which only take effect once they are committed.
 */
export interface IQuadDestinationTransaction extends
  Pick<IQuadDestination, 'update' | 'deleteGraphs' | 'createGraphs'>, IDestinationTransaction {}
