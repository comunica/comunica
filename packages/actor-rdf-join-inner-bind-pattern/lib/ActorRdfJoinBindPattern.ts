import type { BindOrder } from '@comunica/actor-rdf-join-inner-multi-bind';
import { ActorRdfJoinMultiBind } from '@comunica/actor-rdf-join-inner-multi-bind';
import type { MediatorMergeBindingsContext } from '@comunica/bus-merge-bindings-context';
import type {
  IActionRdfJoin,
  IActorRdfJoinOutputInner,
  IActorRdfJoinArgs,
  IActorRdfJoinTestSideData,
} from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import { KeysInitQuery } from '@comunica/context-entries';
import type { TestResult } from '@comunica/core';
import { passTestWithSideData, failTest } from '@comunica/core';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type { BindingsStream, ComunicaDataFactory, IQuerySourceWrapper } from '@comunica/types';
import type { Algebra } from '@comunica/utils-algebra';
import { AlgebraFactory, Algebra as AlgebraTypes } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { getOperationSource } from '@comunica/utils-query-operation';

/**
 * A comunica Bind Pattern RDF Join Actor.
 *
 * Joins by reading one entry and asking the source of the other entry for its pattern once per binding.
 * The other entry has to be a single pattern with a source, which is the only thing this asks of the source.
 */
export class ActorRdfJoinBindPattern extends ActorRdfJoin<IActorRdfJoinBindPatternTestSideData> {
  public readonly bindOrder: BindOrder;
  public readonly mediatorMergeBindingsContext: MediatorMergeBindingsContext;

  public constructor(args: IActorRdfJoinBindPatternArgs) {
    super(args, {
      logicalType: 'inner',
      physicalName: 'bind-pattern',
      limitEntries: 2,
      canHandleUndefs: false,
      requiresVariableOverlap: true,
      isLeaf: false,
    });
    this.bindOrder = args.bindOrder;
    this.mediatorMergeBindingsContext = args.mediatorMergeBindingsContext;
  }

  /**
   * The source to ask for the given entry, if it is a pattern this actor can bind into.
   * A pattern never carries the operations that binding cannot be pushed through, so nothing else is checked.
   * @param entry A join entry.
   */
  public static getBindableSource(entry: IActionRdfJoin['entries'][0]): IQuerySourceWrapper | undefined {
    if (entry.operation.type !== AlgebraTypes.Types.PATTERN || entry.operationModified) {
      return undefined;
    }
    return getOperationSource(entry.operation);
  }

  public async getOutput(
    action: IActionRdfJoin,
    sideData: IActorRdfJoinBindPatternTestSideData,
  ): Promise<IActorRdfJoinOutputInner> {
    const dataFactory: ComunicaDataFactory = action.context.getSafe(KeysInitQuery.dataFactory);
    const algebraFactory = new AlgebraFactory(dataFactory);
    const bindingsFactory = await BindingsFactory.create(
      this.mediatorMergeBindingsContext,
      action.context,
      dataFactory,
    );

    const { baseIndex, patternIndex, source } = sideData;
    const base = action.entries[baseIndex];
    const pattern = action.entries[patternIndex];

    // The pattern is asked for once per binding, so its own stream is never read.
    pattern.output.bindingsStream.destroy();

    const context = source.context ? action.context.merge(source.context) : action.context;
    const bindingsStream: BindingsStream = ActorRdfJoinMultiBind.createBindStream(
      this.bindOrder,
      base.output.bindingsStream,
      [ pattern.operation ],
      async(operations: Algebra.Operation[]) => source.source.queryBindings(operations[0], context),
      false,
      algebraFactory,
      bindingsFactory,
    );

    return {
      result: {
        type: 'bindings',
        bindingsStream,
        metadata: async() => await this.constructResultMetadata(
          action.entries,
          await ActorRdfJoin.getMetadatas(action.entries),
          action.context,
        ),
      },
    };
  }

  public async getJoinCoefficients(
    action: IActionRdfJoin,
    sideData: IActorRdfJoinTestSideData,
  ): Promise<TestResult<IMediatorTypeJoinCoefficients, IActorRdfJoinBindPatternTestSideData>> {
    const { metadatas } = sideData;

    // Read the entry with the fewest results, and ask the source of the other one for its pattern per binding
    const baseIndex = metadatas[0].cardinality.value <= metadatas[1].cardinality.value ? 0 : 1;
    const patternIndex = baseIndex === 0 ? 1 : 0;
    const source = ActorRdfJoinBindPattern.getBindableSource(action.entries[patternIndex]);
    if (!source) {
      return failTest(`Actor ${this.name} requires the largest entry to be a pattern with a source`);
    }

    const requestInitialTimes = ActorRdfJoin.getRequestInitialTimes(metadatas);
    const requestItemTimes = ActorRdfJoin.getRequestItemTimes(metadatas);
    const cardinalityBase = metadatas[baseIndex].cardinality.value;
    // The entries always share a variable, since this actor requires that, so this is always defined.
    const joined = ActorRdfJoin.getSharedVariableJoinCardinality(metadatas)!;

    return passTestWithSideData({
      // Every binding of the base entry is looked up in the source once, and every result row is produced once.
      iterations: cardinalityBase + joined,
      persistedItems: 0,
      blockingItems: 0,
      // Every binding costs a whole request of its own, whether or not the source answers in pages, so this
      // only pays off against reading the pattern when the bound entry is smaller than that pattern's pages.
      requestTime: requestInitialTimes[baseIndex] +
        cardinalityBase * (requestItemTimes[baseIndex] + (metadatas[patternIndex].requestTime ?? 0)) +
        joined * requestItemTimes[patternIndex],
    }, { ...sideData, baseIndex, patternIndex, source });
  }
}

export interface IActorRdfJoinBindPatternTestSideData extends IActorRdfJoinTestSideData {
  baseIndex: number;
  patternIndex: number;
  source: IQuerySourceWrapper;
}

export interface IActorRdfJoinBindPatternArgs extends IActorRdfJoinArgs<IActorRdfJoinBindPatternTestSideData> {
  /**
   * The order in which elements should be bound.
   * @default {depth-first}
   */
  bindOrder: BindOrder;
  /**
   * A mediator for creating binding context merge handlers
   */
  mediatorMergeBindingsContext: MediatorMergeBindingsContext;
}
