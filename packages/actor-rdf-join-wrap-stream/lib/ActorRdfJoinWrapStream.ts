import type { MediatorIteratorTransform } from '@comunica/bus-iterator-transform';
import type {
  IActionRdfJoin,
  IActorRdfJoinOutputInner,
  IActorRdfJoinArgs,
  MediatorRdfJoin,
  IActorRdfJoinTestSideData }
  from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import type { TestResult } from '@comunica/core';
import { ActionContextKey, failTest, passTestWithSideData } from '@comunica/core';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type { IActionContext, IJoinEntry, IQueryOperationResultBindings, MetadataBindings } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';

/**
 * A comunica Wrap Stream RDF Join Actor.
 */
export class ActorRdfJoinWrapStream extends ActorRdfJoin {
  public readonly mediatorJoin: MediatorRdfJoin;
  public readonly mediatorIteratorTransform: MediatorIteratorTransform;

  public constructor(args: IActorRdfJoinWrapStreamArgs) {
    super(args, {
      logicalType: 'inner',
      physicalName: 'wrap-stream',
      limitEntries: 0,
      limitEntriesMin: true,
      canHandleUndefs: true,
      isLeaf: false,
    });
    this.mediatorJoin = args.mediatorJoin;
    this.mediatorIteratorTransform = args.mediatorIteratorTransform;
  }

  public override async test(action: IActionRdfJoin):
  Promise<TestResult<IMediatorTypeJoinCoefficients, IActorRdfJoinTestSideData>> {
    if (action.context.get(KEY_CONTEXT_WRAPPED_RDF_JOIN) === action.entries) {
      return failTest('Unable to wrap join operation multiple times');
    }

    const metadatas = await ActorRdfJoin.getMetadatas(action.entries);
    return await this.getJoinCoefficients(action, { metadatas });
  }

  public override async getOutput(action: IActionRdfJoin): Promise<IActorRdfJoinOutputInner> {
    // Prevent infinite recursion. In consequent query operation calls this key is set to false
    // To allow the operation to wrap ALL rdf-join runs
    action.context = this.setContextWrapped(action, action.context);
    const result: IQueryOperationResultBindings = await this.mediatorJoin.mediate(action);

    const { stream, metadata } = (await this.mediatorIteratorTransform.mediate(
      {
        type: result.type,
        operation: action.type,
        stream: result.bindingsStream,
        metadata: result.metadata,
        context: action.context,
        originalAction: action,
      },
    ));

    result.bindingsStream = <AsyncIterator<RDF.Bindings>> stream;
    result.metadata = <() => Promise<MetadataBindings>> metadata;

    return { result };
  }

  protected async getJoinCoefficients(
    _action: IActionRdfJoin,
    sideData: IActorRdfJoinTestSideData,
  ): Promise<TestResult<IMediatorTypeJoinCoefficients, IActorRdfJoinTestSideData>> {
    return passTestWithSideData({
      iterations: -1,
      persistedItems: -1,
      blockingItems: -1,
      requestTime: -1,
    }, sideData);
  }

  /**
   * Sets KEY_CONTEXT_WRAPPED_RDF_JOIN key in the context to the entries being joined.
   * @param action The join action being executed
   * @param context The ActionContext
   * @returns The updated ActionContext
   */
  public setContextWrapped(action: IActionRdfJoin, context: IActionContext): IActionContext {
    return context.set(KEY_CONTEXT_WRAPPED_RDF_JOIN, action.entries);
  }
}

export interface IActorRdfJoinWrapStreamArgs extends IActorRdfJoinArgs {
  /**
   * Mediator that runs all transforms defined by user over the output stream of the query operation
   */
  mediatorIteratorTransform: MediatorIteratorTransform;
  /**
   * Mediator that calls next join to be wrapped
   */
  mediatorJoin: MediatorRdfJoin;
}

/**
 * Key that shows if the query operation has already been wrapped by a process iterator call
 */
export const KEY_CONTEXT_WRAPPED_RDF_JOIN = new ActionContextKey<IJoinEntry[]>(
  '@comunica/actor-rdf-join:wrapped',
);
