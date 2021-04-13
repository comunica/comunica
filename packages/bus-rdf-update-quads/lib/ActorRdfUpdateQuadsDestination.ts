import type { ActionContext, IActorTest } from '@comunica/core';
import type { IActionRdfUpdateQuads, IActorRdfUpdateQuadsOutput } from './ActorRdfUpdateQuads';
import { ActorRdfUpdateQuads } from './ActorRdfUpdateQuads';
import type { IQuadDestination } from './IQuadDestination';

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
      action.createGraphs ?
        destination.createGraphs(action.createGraphs.graphs, action.createGraphs.requireNonExistence) :
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
