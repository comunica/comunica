import type { ActionContext, IActorTest } from '@comunica/core';
import type { AsyncIterator } from 'asynciterator';
import type * as RDF from 'rdf-js';
import type { IActionRdfUpdateQuads, IActorRdfUpdateQuadsOutput } from './ActorRdfUpdateQuads';
import { ActorRdfUpdateQuads } from './ActorRdfUpdateQuads';

/**
 * A base implementation for rdf-update-quads events
 * that wraps around an {@link IQuadDestination}.
 *
 * @see IQuadDestination
 */
export abstract class ActorRdfUpdateQuadsDestination extends ActorRdfUpdateQuads {
  public async test(action: IActionRdfUpdateQuads): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionRdfUpdateQuads): Promise<IActorRdfUpdateQuadsOutput> {
    const destination = await this.getDestination(action.context);
    return await this.getOutput(destination, action, action.context);
  }

  /**
   * Get the output of the given action on a destination.
   * @param {IQuadDestination} destination A quad destination, possibly lazy.
   * @param {IActionRdfUpdateQuads} action The action.
   * @param {ActionContext} context Optional context data.
   */
  protected async getOutput(
    destination: IQuadDestination,
    action: IActionRdfUpdateQuads,
    context?: ActionContext,
  ): Promise<IActorRdfUpdateQuadsOutput> {
    const updateResult = Promise.all([
      action.quadStreamInsert ? destination.insert(action.quadStreamInsert) : Promise.resolve(),
      action.quadStreamDelete ? destination.delete(action.quadStreamDelete) : Promise.resolve(),
      action.deleteGraphs ?
        destination.deleteGraphs(
          action.deleteGraphs.graphs,
          action.deleteGraphs.requireExistence,
          action.deleteGraphs.dropGraphs,
        ) :
        Promise.resolve(),
      action.createGraph ?
        destination.createGraph(action.createGraph.graph, action.createGraph.requireNonExistence) :
        Promise.resolve(),
    ]).then(() => {
      // Return void
    });
    return { updateResult };
  }

  /**
   * Get a destination instance for the given context.
   * @param {ActionContext} context Optional context data.
   * @return {Promise<IQuadSource>} A promise that resolves to a destination.
   */
  protected abstract getDestination(context: ActionContext | undefined): Promise<IQuadDestination>;
}

/**
 * A lazy quad destination.
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
