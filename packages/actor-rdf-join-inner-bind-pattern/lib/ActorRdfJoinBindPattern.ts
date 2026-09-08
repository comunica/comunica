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
import type { BindingsStream, ComunicaDataFactory, IQuerySourceWrapper, MetadataBindings } from '@comunica/types';
import type { Algebra } from '@comunica/utils-algebra';
import { AlgebraFactory, Algebra as AlgebraTypes, inScopeVariables } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { getOperationSource } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';

/**
 * A comunica Bind Pattern RDF Join Actor.
 *
 * Joins by reading one entry and asking the source of the other entry for its pattern once per binding.
 * The other entry has to be a single pattern with a source, which is the only thing this asks of the source.
 */
export class ActorRdfJoinBindPattern extends ActorRdfJoin<IActorRdfJoinBindPatternTestSideData> {
  public readonly bindOrder: BindOrder;
  public readonly selectivityModifier: number;
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
    this.selectivityModifier = args.selectivityModifier;
    this.mediatorMergeBindingsContext = args.mediatorMergeBindingsContext;
  }

  /**
   * Determine whether the given entry is a pattern this actor can ask a source for on its own.
   * @param entry A join entry.
   * @param boundVariables The variables the other entry binds.
   */
  public static getBindableSource(
    entry: IActionRdfJoin['entries'][0],
    boundVariables: RDF.Variable[],
  ): IQuerySourceWrapper | undefined {
    if (entry.operation.type !== AlgebraTypes.Types.PATTERN || entry.operationModified) {
      return undefined;
    }
    if (!ActorRdfJoinMultiBind.canBindWithOperation(entry.operation, boundVariables)) {
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
    const boundVariables = inScopeVariables(action.entries[baseIndex].operation);
    const source = ActorRdfJoinBindPattern.getBindableSource(action.entries[patternIndex], boundVariables);
    if (!source) {
      return failTest(`Actor ${this.name} requires the largest entry to be a pattern with a source`);
    }

    const requestInitialTimes = ActorRdfJoin.getRequestInitialTimes(metadatas);
    const requestItemTimes = ActorRdfJoin.getRequestItemTimes(metadatas);
    const cardinalityBase = metadatas[baseIndex].cardinality.value;
    const joined = await this.estimateJoinCardinality(action, metadatas, baseIndex, patternIndex);

    return passTestWithSideData({
      // Every binding of the base entry is looked up in the source once, and every result row is produced once.
      iterations: cardinalityBase + joined,
      persistedItems: 0,
      blockingItems: 0,
      // Every binding costs a request of its own, so a source that answers in pages is asked once per binding
      // even when it returns a single row. That is what keeps this out of plans over such sources.
      requestTime: requestInitialTimes[baseIndex] +
        cardinalityBase * (
          requestItemTimes[baseIndex] +
          requestInitialTimes[patternIndex] +
          requestItemTimes[patternIndex]
        ) +
        joined * requestItemTimes[patternIndex],
    }, { ...sideData, baseIndex, patternIndex, source });
  }

  /**
   * Estimate how many rows the join produces, from the variables the entries share where possible.
   */
  protected async estimateJoinCardinality(
    action: IActionRdfJoin,
    metadatas: MetadataBindings[],
    baseIndex: number,
    patternIndex: number,
  ): Promise<number> {
    const shared = ActorRdfJoin.getSharedVariableJoinCardinality(metadatas);
    if (shared !== undefined) {
      return shared;
    }
    const { selectivity } = await this.mediatorJoinSelectivity.mediate({
      entries: action.entries,
      context: action.context,
    });
    return metadatas[baseIndex].cardinality.value * metadatas[patternIndex].cardinality.value *
      selectivity * this.selectivityModifier;
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
   * Multiplier for selectivity values, only used for entries that share no variable.
   * @range {double}
   * @default {0.0001}
   */
  selectivityModifier: number;
  /**
   * A mediator for creating binding context merge handlers
   */
  mediatorMergeBindingsContext: MediatorMergeBindingsContext;
}
