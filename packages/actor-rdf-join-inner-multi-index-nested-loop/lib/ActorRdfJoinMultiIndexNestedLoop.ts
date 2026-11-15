import type { MediatorMergeBindingsContext } from '@comunica/bus-merge-bindings-context';
import type {
  IActionRdfJoin,
  IActorRdfJoinArgs,
  IActorRdfJoinOutputInner,
  IActorRdfJoinTestSideData,
} from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import { KeysInitQuery } from '@comunica/context-entries';
import type { TestResult } from '@comunica/core';
import { failTest, passTestWithSideData } from '@comunica/core';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type {
  ComunicaDataFactory,
  IActionContext,
  IJoinEntry,
  IJoinEntryWithMetadata,
  IQuerySourceWrapper,
} from '@comunica/types';
import { AlgebraFactory } from '@comunica/utils-algebra';
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
   *
   * The entries of a join often each cover a part of the same set of values of a variable,
   * such as different properties of entities of the same type, of which the largest part approximates the set.
   * Assuming that each entry covers a uniform and independent part of it, a bound value occurs in the entry with
   * probability V / U, where V is the number of distinct values of the variable in the entry and U in the set,
   * and then gives cardinality / V results, so a lookup gives cardinality / U results on average.
   * If V is unknown, each result of the entry is assumed to have a different value.
   * Only the most selective bound variable is taken into account.
   *
   * @param entry A join entry.
   * @param bound The names of the bound variables.
   * @param universes Per variable, the largest number of distinct values it is known to take in an entry of the join.
   */
  public static estimateFanout(
    entry: IJoinEntryWithMetadata,
    bound: Set<string>,
    universes: Map<string, number>,
  ): number {
    const cardinality = entry.metadata.cardinality.value;
    let fanout = cardinality;
    for (const variable of entry.metadata.variables) {
      const name = variable.variable.value;
      if (bound.has(name)) {
        const values = Math.max(1, variable.distinctValues ?? cardinality, universes.get(name) ?? 0);
        fanout = Math.min(fanout, cardinality / values);
      }
    }
    return fanout;
  }

  /**
   * Determine the largest number of distinct values that each variable is known to take in an entry.
   * @param entries The join entries.
   */
  public static getUniverses(entries: IJoinEntryWithMetadata[]): Map<string, number> {
    const universes = new Map<string, number>();
    for (const entry of entries) {
      for (const { variable, distinctValues } of entry.metadata.variables) {
        if (distinctValues !== undefined) {
          universes.set(variable.value, Math.max(distinctValues, universes.get(variable.value) ?? 0));
        }
      }
    }
    return universes;
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
  ): { order: number[]; iterations: number; cardinality: number } {
    const universes = ActorRdfJoinMultiIndexNestedLoop.getUniverses(entries);
    const bound = new Set(entries[first].metadata.variables.map(variable => variable.variable.value));
    const todo = entries.map((_, i) => i).filter(i => i !== first);
    const order: number[] = [];
    let rows = entries[first].metadata.cardinality.value;
    let iterations = rows;
    while (todo.length > 0) {
      let best = 0;
      let bestFanout = Number.POSITIVE_INFINITY;
      for (const [ i, index ] of todo.entries()) {
        const fanout = ActorRdfJoinMultiIndexNestedLoop.estimateFanout(entries[index], bound, universes);
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
    }
    // The results themselves are produced by any join, so they are left out of its cost
    return { order, iterations: iterations - rows, cardinality: rows };
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

    // Pick the first entry that leads to the cheapest order.
    let best: { first: number; order: number[]; iterations: number; cardinality: number } | undefined;
    for (const first of firstCandidates) {
      const lookupOrder = ActorRdfJoinMultiIndexNestedLoop.getLookupOrder(entries, first, this.lookupCost);
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
   * The cost of looking up a single bound operation, relative to producing a row or reading a binding from a stream.
   * @range {double}
   * @default {2}
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
