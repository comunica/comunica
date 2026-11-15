import type { MediatorMergeBindingsContext } from '@comunica/bus-merge-bindings-context';
import type {
  IActionRdfJoin,
  IActorRdfJoinArgs,
  IActorRdfJoinOutputInner,
  IActorRdfJoinTestSideData,
} from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import type { TestResult } from '@comunica/core';
import { failTest, passTestWithSideData } from '@comunica/core';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type {
  Bindings,
  ComunicaDataFactory,
  IActionContext,
  IJoinEntry,
  IJoinEntryWithMetadata,
  IJoinFilter,
  IQuerySourceWrapper,
  MetadataBindings,
} from '@comunica/types';
import { Algebra, AlgebraFactory, isKnownOperation } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { doesShapeAcceptOperation, getOperationSource, getSourceSelectorShape } from '@comunica/utils-query-operation';
import type { IIndexNestedLoopLookup } from './IndexNestedLoopIterator';
import { IndexNestedLoopIterator } from './IndexNestedLoopIterator';

/**
 * A comunica Inner Multi Index Nested Loop RDF Join Actor.
 *
 * In contrast to most other multi join actors, this actor here does not
 * delegate back to the join bus, but instead takes care of the full join
 * internally.
 */
export class ActorRdfJoinMultiIndexNestedLoop extends ActorRdfJoin<IActorRdfJoinMultiIndexNestedLoopTestSideData> {
  /**
   * The share of bindings that is assumed to pass a filter.
   */
  public static readonly FILTER_SELECTIVITY = 1 / 3;
  public readonly lookupCost: number;
  public readonly mediatorMergeBindingsContext: MediatorMergeBindingsContext;

  public constructor(args: IActorRdfJoinMultiIndexNestedLoopArgs) {
    super(args, {
      logicalType: 'inner',
      physicalName: 'index-nested-loop',
    });
    this.lookupCost = args.lookupCost;
    this.mediatorMergeBindingsContext = args.mediatorMergeBindingsContext;
  }

  protected async getOutput(
    action: IActionRdfJoin,
    sideData: IActorRdfJoinMultiIndexNestedLoopTestSideData,
  ): Promise<IActorRdfJoinOutputInner> {
    const dataFactory: ComunicaDataFactory = action.context.getSafe(KeysInitQuery.dataFactory);
    const algebraFactory = new AlgebraFactory(dataFactory);
    const { first, order } = sideData;

    // Only the first entry is consumed, the others are looked up.
    for (const [ i, entry ] of action.entries.entries()) {
      if (i !== first) {
        entry.output.bindingsStream.destroy();
      }
    }

    const lookups = order.map((index): IIndexNestedLoopLookup => {
      const operation = action.entries[index].operation;
      const sourceWrapper = <IQuerySourceWrapper> getOperationSource(operation);
      return {
        operation,
        source: sourceWrapper.source,
        context: sourceWrapper.context ? action.context.merge(sourceWrapper.context) : action.context,
      };
    });

    // Only create BF when absolutely required.
    const bindingsFactory = IndexNestedLoopIterator.needsBindingsFactory(lookups) ?
      await BindingsFactory.create(this.mediatorMergeBindingsContext, action.context, dataFactory) :
      undefined;

    return {
      result: {
        type: 'bindings',
        bindingsStream: new IndexNestedLoopIterator(
          action.entries[first].output.bindingsStream,
          lookups,
          algebraFactory,
          bindingsFactory,
          ActorRdfJoinMultiIndexNestedLoop.getLookupFilters(action, sideData.metadatas, [ first, ...order ]),
        ),
        metadata: async() => {
          const metadata = await this.constructResultMetadata(action.entries, sideData.metadatas, action.context, {
            termOrder: sideData.metadatas[first].termOrder,
          });
          if (sideData.cardinality < metadata.cardinality.value) {
            metadata.cardinality = { type: 'estimate', value: sideData.cardinality };
          }
          return metadata;
        },
      },
      physicalPlanMetadata: {
        bindIndex: first,
        lookupOrder: order,
      },
    };
  }

  /**
   * Determine the filters in the context that apply to the results of this join, and the depth of lookups at which
   * they can already be applied, which is the first at which all of their variables are certainly bound.
   * Filters that need all entries are left to the filter afterwards.
   * @param action The join action.
   * @param metadatas The metadata of the join entries.
   * @param steps The indexes of the first entry and of the entries that are looked up, in order.
   * @return Per depth, the filters to apply to bindings before the lookup at that depth.
   */
  public static getLookupFilters(
    action: IActionRdfJoin,
    metadatas: MetadataBindings[],
    steps: number[],
  ): ((bindings: Bindings) => boolean)[][] {
    let pending = ActorRdfJoinMultiIndexNestedLoop.getJoinFilters(action);
    const depths: ((bindings: Bindings) => boolean)[][] = [];
    const certain = new Set<string>();
    for (const [ depth, index ] of steps.slice(0, -1).entries()) {
      const remaining = ActorRdfJoinMultiIndexNestedLoop.bindCertainly(certain, metadatas[index], pending);
      if (remaining.length < pending.length) {
        depths[depth] = pending.filter(filter => !remaining.includes(filter)).map(filter => filter.test);
        pending = remaining;
      }
    }
    return depths;
  }

  /**
   * Check if the given entry can be looked up synchronously in its source.
   * @param entry A join entry.
   * @param context The action context.
   */
  public static async canLookUp(entry: IJoinEntry, context: IActionContext): Promise<boolean> {
    const sourceWrapper = getOperationSource(entry.operation);
    if (Boolean(entry.operationModified) || !sourceWrapper) {
      return false;
    }
    const shape = await getSourceSelectorShape(sourceWrapper, context);
    return doesShapeAcceptOperation(shape, entry.operation, { synchronous: true });
  }

  /**
   * Estimate how many results a lookup of the given entry produces when the given variables are bound.
   * @param entry A join entry.
   * @param bound The names of the bound variables.
   */
  public static estimateFanout(entry: IJoinEntryWithMetadata, bound: Set<string>): number {
    const cardinality = entry.metadata.cardinality.value;
    let fanout = cardinality;
    for (const variable of entry.metadata.variables) {
      if (bound.has(variable.variable.value)) {
        fanout = Math.min(fanout, cardinality / Math.max(1, variable.distinctValues ?? cardinality));
      }
    }
    return fanout;
  }

  /**
   * Determine the order in which the remaining entries are looked up, starting from the given first entry,
   * by greedily picking the entry with the lowest fanout next.
   * @param entries The join entries.
   * @param first The index of the first entry.
   * @param lookupCost The cost of a single lookup.
   * @return The order, the cost of evaluating the join in that order, and the number of results.
   */
  public static getLookupOrder(
    entries: IJoinEntryWithMetadata[],
    first: number,
    lookupCost: number,
    filters: IJoinFilter[] = [],
  ): { order: number[]; iterations: number; cardinality: number } {
    const bound = new Set(entries[first].metadata.variables.map(variable => variable.variable.value));
    const certain = new Set<string>();
    let pending = ActorRdfJoinMultiIndexNestedLoop.bindCertainly(certain, entries[first].metadata, filters);
    const todo = entries.map((_, i) => i).filter(i => i !== first);
    const order: number[] = [];
    let rows = entries[first].metadata.cardinality.value *
      (ActorRdfJoinMultiIndexNestedLoop.FILTER_SELECTIVITY ** (filters.length - pending.length));
    let iterations = rows;
    while (todo.length > 0) {
      let best = 0;
      let bestFanout = Number.POSITIVE_INFINITY;
      for (const [ i, index ] of todo.entries()) {
        // Filters that become applicable after a lookup reduce its results
        const applicable = pending.filter(filter => filter.variables.every(variable => certain.has(variable.value) ||
          entries[index].metadata.variables.some(v => !v.canBeUndef && v.variable.equals(variable)))).length;
        const fanout = ActorRdfJoinMultiIndexNestedLoop.estimateFanout(entries[index], bound) *
          (ActorRdfJoinMultiIndexNestedLoop.FILTER_SELECTIVITY ** applicable);
        if (fanout < bestFanout) {
          best = i;
          bestFanout = fanout;
        }
      }
      const [ index ] = todo.splice(best, 1);
      order.push(index);
      iterations += rows * (lookupCost + bestFanout);
      rows *= bestFanout;
      for (const variable of entries[index].metadata.variables) {
        bound.add(variable.variable.value);
      }
      pending = ActorRdfJoinMultiIndexNestedLoop.bindCertainly(certain, entries[index].metadata, pending);
    }
    return { order, iterations, cardinality: rows };
  }

  /**
   * Register the variables that an entry certainly binds, and determine the filters that still need others.
   * @param certain The variables that are certainly bound so far.
   * @param metadata The metadata of the entry.
   * @param filters The filters that still need other variables.
   */
  public static bindCertainly(certain: Set<string>, metadata: MetadataBindings, filters: IJoinFilter[]): IJoinFilter[] {
    for (const variable of metadata.variables) {
      if (!variable.canBeUndef) {
        certain.add(variable.variable.value);
      }
    }
    return filters.filter(filter => !filter.variables.every(variable => certain.has(variable.value)));
  }

  /**
   * Determine the filters in the context that apply to the results of the given join.
   * @param action The join action.
   */
  public static getJoinFilters(action: IActionRdfJoin): IJoinFilter[] {
    return (action.context.get(KeysQueryOperation.joinFilters) ?? [])
      .filter(({ join }) => isKnownOperation(join, Algebra.Types.JOIN) &&
        join.input.length === action.entries.length &&
        action.entries.every(entry => join.input.includes(entry.operation)));
  }

  protected async getJoinCoefficients(
    action: IActionRdfJoin,
    sideData: IActorRdfJoinTestSideData,
  ): Promise<TestResult<IMediatorTypeJoinCoefficients, IActorRdfJoinMultiIndexNestedLoopTestSideData>> {
    const { metadatas } = sideData;
    const entries = action.entries.map((entry, i) => ({ ...entry, metadata: metadatas[i] }));

    // Any entry that can be looked up synchronously can be looked up, and any other one can be first.
    const lookupable = await Promise.all(entries
      .map(entry => ActorRdfJoinMultiIndexNestedLoop.canLookUp(entry, action.context)));
    const firstCandidates = entries.map((entry, i) => i)
      .filter(i => !ActorRdfJoin.isOperationRequired(entries[i], metadatas[i]) &&
        lookupable.every((canLookup, j) => canLookup || j === i));
    if (firstCandidates.length === 0) {
      return failTest(`Actor ${this.name} requires all entries but one to be operations over sources that support synchronous lookups`);
    }

    // Pick the first entry that leads to the cheapest order, preferring lookups after which filters apply.
    const filters = ActorRdfJoinMultiIndexNestedLoop.getJoinFilters(action);
    let best: { first: number; order: number[]; iterations: number; cardinality: number } | undefined;
    for (const first of firstCandidates) {
      const lookupOrder = ActorRdfJoinMultiIndexNestedLoop.getLookupOrder(entries, first, this.lookupCost, filters);
      if (!best || lookupOrder.iterations < best.iterations) {
        best = { first, ...lookupOrder };
      }
    }

    // Only the first entry is requested, as lookups are synchronous.
    const requestTime = ActorRdfJoin.getRequestInitialTimes(metadatas)[best!.first] +
      metadatas[best!.first].cardinality.value * ActorRdfJoin.getRequestItemTimes(metadatas)[best!.first];
    return passTestWithSideData({
      iterations: best!.iterations,
      persistedItems: 0,
      blockingItems: 0,
      requestTime,
    }, { ...sideData, first: best!.first, order: best!.order, cardinality: best!.cardinality });
  }
}

export interface IActorRdfJoinMultiIndexNestedLoopArgs
  extends IActorRdfJoinArgs<IActorRdfJoinMultiIndexNestedLoopTestSideData> {
  /**
   * The cost of looking up a single bound operation, expressed in produced rows.
   * @range {double}
   * @default {1}
   */
  lookupCost: number;
  /**
   * A mediator for creating binding context merge handlers
   */
  mediatorMergeBindingsContext: MediatorMergeBindingsContext;
}

export interface IActorRdfJoinMultiIndexNestedLoopTestSideData extends IActorRdfJoinTestSideData {
  /**
   * The index of the entry whose bindings are joined with the others.
   */
  first: number;
  /**
   * The indexes of the other entries, in the order they are looked up.
   */
  order: number[];
  /**
   * The estimated number of results.
   */
  cardinality: number;
}
