import type { AsyncIterator } from 'asynciterator';
import type * as RDF from 'rdf-js';

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
   * @param requireExistence If true, and the graph does not exist, an error must be emitted.
   *                         Should only be considered on destinations that record empty graphs.
   * @param dropGraphs If the graph itself should also be dropped.
   *                   Should not happen on the 'DEFAULT' graph.
   *                   Should only be considered on destinations that record empty graphs.
   */
  deleteGraphs: (
    graphs: RDF.DefaultGraph | 'NAMED' | 'ALL' | RDF.NamedNode,
    requireExistence: boolean,
    dropGraphs: boolean,
  ) => Promise<void>;
  /**
   * Create the given (empty) graph.
   * @param graph The graph name to create.
   * @param requireNonExistence If true, an error MUST be thrown when the graph already exists.
   *                            For destinations that do not record empty graphs,
   *                            this should only throw if at least one quad with the given quad already exists.
   */
  createGraph: (graph: RDF.NamedNode, requireNonExistence: boolean) => Promise<void>;
}
