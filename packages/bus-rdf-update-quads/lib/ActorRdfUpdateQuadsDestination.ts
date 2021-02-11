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
    return await this.getOutput(destination, action.quadStreamInsert, action.quadStreamDelete, action.context);
  }

  /**
   * Get the output of the given action on a destination.
   * @param {IQuadDestination} destination A quad destination, possibly lazy.
   * @param {AsyncIterator<RDF.Quad>} quadStreamInsert The quads to insert.
   * @param {AsyncIterator<RDF.Quad>} quadStreamDelete The quads to delete.
   * @param {ActionContext} context Optional context data.
   */
  protected async getOutput(
    destination: IQuadDestination,
    quadStreamInsert?: AsyncIterator<RDF.Quad>,
    quadStreamDelete?: AsyncIterator<RDF.Quad>,
    context?: ActionContext,
  ): Promise<IActorRdfUpdateQuadsOutput> {
    const updateResult = Promise.all([
      quadStreamInsert ? destination.insert(quadStreamInsert) : Promise.resolve(),
      quadStreamDelete ? destination.delete(quadStreamDelete) : Promise.resolve(),
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
}
