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
import { Algebra, AlgebraFactory } from '@comunica/utils-algebra';
import { doesShapeAcceptOperation, getOperationSource } from '@comunica/utils-query-operation';
import type { IIndexNestedLoopLookup } from './IndexNestedLoopIterator';
import { IndexNestedLoopIterator } from './IndexNestedLoopIterator';

/**
 * A comunica Inner Multi Index Nested Loop RDF Join Actor.
 *
 * Joins the bindings of one entry with quad patterns, by looking up each pattern bound to each binding.
 * Unlike the bind join, the order of the lookups is determined once,
 * and the bound patterns are sent to their source directly, instead of being planned again for every binding.
 * This only pays off for sources that can look up bound patterns cheaply,
 * which is why it requires sources that can do so synchronously, such as indexed in-memory stores,
 * as indicated by the `synchronous` flag in their selector shape.
 */
export class ActorRdfJoinMultiIndexNestedLoop extends ActorRdfJoin<IActorRdfJoinMultiIndexNestedLoopTestSideData> {
  public readonly lookupCost: number;

  public constructor(args: IActorRdfJoinMultiIndexNestedLoopArgs) {
    super(args, {
      logicalType: 'inner',
      physicalName: 'index-nested-loop',
    });
    this.lookupCost = args.lookupCost;
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
      const pattern = <Algebra.Pattern> action.entries[index].operation;
      const sourceWrapper = <IQuerySourceWrapper> getOperationSource(pattern);
      return {
        pattern,
        source: sourceWrapper.source,
        context: sourceWrapper.context ? action.context.merge(sourceWrapper.context) : action.context,
      };
    });

    return {
      result: {
        type: 'bindings',
        bindingsStream: new IndexNestedLoopIterator(
          action.entries[first].output.bindingsStream,
          lookups,
          algebraFactory,
        ),
        metadata: async() => {
          const metadata = await this.constructResultMetadata(action.entries, sideData.metadatas, action.context);
          // The fanouts along the lookup order take the bound variables of every lookup into account.
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
   * Check if the given entry can be looked up, which requires a quad pattern over a source that can look it up
   * synchronously, as indicated by its selector shape.
   * @param entry A join entry.
   * @param context The action context.
   */
  public static async canLookUp(entry: IJoinEntry, context: IActionContext): Promise<boolean> {
    const sourceWrapper = getOperationSource(entry.operation);
    if (entry.operation.type !== Algebra.Types.PATTERN || Boolean(entry.operationModified) || !sourceWrapper) {
      return false;
    }
    const shape = await sourceWrapper.source.getSelectorShape(context);
    return doesShapeAcceptOperation(shape, entry.operation, { synchronous: true });
  }

  /**
   * Estimate how many results a lookup of the given entry produces when the given variables are bound.
   * A variable of which the number of distinct values is unknown is assumed to identify a single result.
   * An entry sharing no bound variables is joined as a cross product.
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
  ): { order: number[]; iterations: number; cardinality: number } {
    const bound = new Set(entries[first].metadata.variables.map(variable => variable.variable.value));
    const todo = entries.map((_, i) => i).filter(i => i !== first);
    const order: number[] = [];
    let rows = entries[first].metadata.cardinality.value;
    let iterations = rows;
    while (todo.length > 0) {
      let best = 0;
      let bestFanout = Number.POSITIVE_INFINITY;
      for (const [ i, index ] of todo.entries()) {
        const fanout = ActorRdfJoinMultiIndexNestedLoop.estimateFanout(entries[index], bound);
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
    return { order, iterations, cardinality: rows };
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
      return failTest(`Actor ${this.name} requires all entries but one to be quad patterns over sources that support synchronous lookups`);
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
   * The cost of looking up a single bound pattern, expressed in produced rows.
   * @range {double}
   * @default {1}
   */
  lookupCost: number;
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
