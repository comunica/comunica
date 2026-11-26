import { deskolemizeQuad } from '@comunica/actor-optimize-query-operation-query-source-skolemize';
import { KeysInitQuery, KeysQuerySourceIdentify, KeysRdfUpdateQuads } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type { ComunicaDataFactory, IActionContext } from '@comunica/types';
import { getDataDestinationValue, runInTransaction } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import type { IActionRdfUpdateQuads, IActorRdfUpdateQuadsOutput } from './ActorRdfUpdateQuads';
import { ActorRdfUpdateQuads } from './ActorRdfUpdateQuads';
import type { IQuadDestination, IQuadDestinationTransaction } from './IQuadDestination';

export function deskolemizeStream(
  dataFactory: ComunicaDataFactory,
  stream: AsyncIterator<RDF.Quad> | undefined,
  id: string,
):
AsyncIterator<RDF.Quad> | undefined {
  return stream?.map(quad => deskolemizeQuad(dataFactory, quad, id));
}

export function deskolemize(action: IActionRdfUpdateQuads): IActionRdfUpdateQuads {
  const dataFactory: ComunicaDataFactory = action.context.getSafe(KeysInitQuery.dataFactory);
  const destination = action.context.get(KeysRdfUpdateQuads.destination);
  if (!destination) {
    return action;
  }
  const id = action.context.get<Map<any, string>>(KeysQuerySourceIdentify.sourceIds)
    ?.get(getDataDestinationValue(destination));
  if (!id) {
    return action;
  }
  return {
    ...action,
    quadStreamInsert: deskolemizeStream(dataFactory, action.quadStreamInsert, id),
    quadStreamDelete: deskolemizeStream(dataFactory, action.quadStreamDelete, id),
  };
}

/**
 * A base implementation for rdf-update-quads events
 * that wraps around an {@link IQuadDestination}.
 *
 * @see IQuadDestination
 */
export abstract class ActorRdfUpdateQuadsDestination extends ActorRdfUpdateQuads {
  public async test(_action: IActionRdfUpdateQuads): Promise<TestResult<IActorTest>> {
    return passTestVoid();
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
    // The changes are made within the transaction of the update request, or a new one for this operation alone
    const execute = (): Promise<void> => runInTransaction(action.context, async(context) => {
      const target = ActorRdfUpdateQuadsDestination.getTarget(destination, context);
      await target.update({ insert: action.quadStreamInsert, delete: action.quadStreamDelete });
      await (action.deleteGraphs ?
        target.deleteGraphs(
          action.deleteGraphs.graphs,
          action.deleteGraphs.requireExistence,
          action.deleteGraphs.dropGraphs,
        ) :
        Promise.resolve());
      await (action.createGraphs ?
        target.createGraphs(action.createGraphs.graphs, action.createGraphs.requireNonExistence) :
        Promise.resolve());
    });
    return { execute };
  }

  /**
   * Determine what to change the given destination through: its transaction within the update request,
   * or the destination itself if it does not support transactions.
   * @param destination A quad destination.
   * @param context The context of the update, with its transaction.
   */
  public static getTarget(
    destination: IQuadDestination,
    context: IActionContext,
  ): Pick<IQuadDestination, 'update' | 'deleteGraphs' | 'createGraphs'> {
    const transaction = context.get(KeysRdfUpdateQuads.transaction);
    if (!destination.beginTransaction || !transaction) {
      return destination;
    }
    return transaction.get<IQuadDestinationTransaction>(
      destination.transactionKey ?? destination,
      () => destination.beginTransaction!(),
    );
  }

  /**
   * Get a destination instance for the given context.
   * @param {ActionContext} context Optional context data.
   * @return {Promise<IQuadDestination>} A promise that resolves to a destination.
   */
  protected abstract getDestination(context: IActionContext): Promise<IQuadDestination>;
}
