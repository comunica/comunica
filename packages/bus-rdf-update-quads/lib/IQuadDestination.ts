import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';

/**
 * A quad destination.
 */
export interface IQuadDestination {
  /**
   * Insert the given quad stream into the destination.
   * @param quads The quads to insert.
   * @return {AsyncIterator<RDF.Quad>} The inserted quad stream.
   */
  insert: (quads: AsyncIterator<RDF.Quad>) => Promise<void>;
  /**
   * Delete the given quad stream from the destination.
   * @param quads The quads to delete.
   * @return {AsyncIterator<RDF.Quad>} The deleted quad stream.
   */
  delete: (quads: AsyncIterator<RDF.Quad>) => Promise<void>;
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
}
