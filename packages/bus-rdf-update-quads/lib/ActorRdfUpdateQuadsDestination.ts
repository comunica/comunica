import { deskolemizeQuad } from '@comunica/actor-context-preprocess-query-source-skolemize';
import { KeysQuerySourceIdentify, KeysRdfUpdateQuads } from '@comunica/context-entries';
import type { IActorTest } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import type { IActionRdfUpdateQuads, IActorRdfUpdateQuadsOutput } from './ActorRdfUpdateQuads';
import { ActorRdfUpdateQuads } from './ActorRdfUpdateQuads';
import type { IQuadDestination } from './IQuadDestination';

export function deskolemizeStream(stream: AsyncIterator<RDF.Quad> | undefined, id: string):
AsyncIterator<RDF.Quad> | undefined {
  return stream?.map(quad => deskolemizeQuad(quad, id));
}

export function deskolemize(action: IActionRdfUpdateQuads): IActionRdfUpdateQuads {
  const destination = action.context.get(KeysRdfUpdateQuads.destination);
  const id = action.context.get<Map<any, string>>(KeysQuerySourceIdentify.sourceIds)?.get(destination);
  if (!id) {
    return action;
  }
  return {
    ...action,
    quadStreamInsert: deskolemizeStream(action.quadStreamInsert, id),
    quadStreamDelete: deskolemizeStream(action.quadStreamDelete, id),
  };
}

/**
 * A base implementation for rdf-update-quads events
 * that wraps around an {@link IQuadDestination}.
 *
 * @see IQuadDestination
 */
export abstract class ActorRdfUpdateQuadsDestination extends ActorRdfUpdateQuads {
  public async test(_action: IActionRdfUpdateQuads): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionRdfUpdateQuads): Promise<IActorRdfUpdateQuadsOutput> {
    const destination = await this.getDestination(action.context);
    return await this.getOutput(destination, deskolemize(action));
  }

  /**
   * Get the output of the given action on a destination.
   * @param {IQuadDestination} destination A quad destination, possibly lazy.
   * @param {IActionRdfUpdateQuads} action The action.
   */
  protected async getOutput(
    destination: IQuadDestination,
    action: IActionRdfUpdateQuads,
  ): Promise<IActorRdfUpdateQuadsOutput> {
    const execute = async(): Promise<void> => {
      await (action.quadStreamDelete ? destination.delete(action.quadStreamDelete) : Promise.resolve());
      await (action.deleteGraphs ?
        destination.deleteGraphs(
          action.deleteGraphs.graphs,
          action.deleteGraphs.requireExistence,
          action.deleteGraphs.dropGraphs,
        ) :
        Promise.resolve());
      await (action.createGraphs ?
        destination.createGraphs(action.createGraphs.graphs, action.createGraphs.requireNonExistence) :
        Promise.resolve());
      await (action.quadStreamInsert ? destination.insert(action.quadStreamInsert) : Promise.resolve());
    };
    return { execute };
  }

  /**
   * Get a destination instance for the given context.
   * @param {ActionContext} context Optional context data.
   * @return {Promise<IQuadDestination>} A promise that resolves to a destination.
   */
  protected abstract getDestination(context: IActionContext): Promise<IQuadDestination>;
}
