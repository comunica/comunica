import type { MediatorIteratorTransform } from '@comunica/bus-iterator-transform';
import type {
  IActionRdfJoin,
  IActorRdfJoinOutputInner,
  IActorRdfJoinArgs,
  MediatorRdfJoin,
  IActorRdfJoinTestSideData }
  from '@comunica/bus-rdf-join';
import { ActorRdfJoin, KEY_CONTEXT_WRAPPED_RDF_JOIN } from '@comunica/bus-rdf-join';
import type { TestResult } from '@comunica/core';
import { failTest, passTestWithSideData } from '@comunica/core';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type { IQueryOperationResultBindings, MetadataBindings } from '@comunica/types';
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
