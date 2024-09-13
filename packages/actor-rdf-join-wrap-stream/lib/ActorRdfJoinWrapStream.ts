import type { MediatorProcessIterator } from '@comunica/bus-process-iterator';
import type { IActionRdfJoin, IActorRdfJoinOutputInner, IActorRdfJoinArgs, MediatorRdfJoin, IActorRdfJoinInternalOptions } from '@comunica/bus-rdf-join';
import { ActorRdfJoin, KEY_CONTEXT_WRAPPED_RDF_JOIN } from '@comunica/bus-rdf-join';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type { IQueryOperationResultBindings, MetadataBindings } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';

/**
 * A comunica Wrap Stream RDF Join Actor.
 */
export class ActorRdfJoinWrapStream extends ActorRdfJoin {
  public readonly mediatorJoin: MediatorRdfJoin;
  public readonly mediatorProcessIterator: MediatorProcessIterator;

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
  /**
   * Override the test to ensure that wrappper is ran for every join
   * @param action 
   * @returns 
   */
  public override async test(action: IActionRdfJoin): Promise<IMediatorTypeJoinCoefficients> {
    console.log(`Testing, value of action context key: ${action.context.get(KEY_CONTEXT_WRAPPED_RDF_JOIN)}`)
    if (action.context.get(KEY_CONTEXT_WRAPPED_RDF_JOIN)) {
      throw new Error('Unable to wrap join operation multiple times');
    }

    const metadatas = await ActorRdfJoin.getMetadatas(action.entries);
    return this.getJoinCoefficients(action, metadatas);
  }

  public override async getOutput(action: IActionRdfJoin): Promise<IActorRdfJoinOutputInner> {
    // Prevent infinite recursion. In consequent query operation calls this key is set to false
    // To allow the operation to wrap ALL rdf-join runs
    action.context = ActorRdfJoin.setContextWrapped(action.context, true);
    console.log(`Wrap join, num entries: ${action.entries.length}`)
    const result: IQueryOperationResultBindings = await this.mediatorJoin.mediate(action);
    result.bindingsStream = <AsyncIterator<RDF.Bindings>>
    (await this.mediatorProcessIterator.mediate(
      { operation: action.type, stream: result.bindingsStream, context: action.context, metadata: {
        type: 'rdf-join',
        actor: '',
        ...await result.metadata(),
        ...result.context,
      }},
    )).stream;

    return { result };
  }

  public override async getJoinCoefficients(
    _action: IActionRdfJoin,
    _metadatas: MetadataBindings[],
  ): Promise<IMediatorTypeJoinCoefficients> {
    // By returning negative coefficients this actor always runs when test passes
    return {
      iterations: -1,
      persistedItems: -1,
      blockingItems: -1,
      requestTime: -1,
    };
  }
}

export interface IActorRdfJoinWrapStreamArgs extends IActorRdfJoinArgs {
  /**
   * Mediator that runs all transforms defined by user over the output stream of the query operation
   */
  mediatorProcessIterator: MediatorProcessIterator;
  /**
   * Mediator that calls next join to be wrapped
   */
  mediatorJoin: MediatorRdfJoin
}
