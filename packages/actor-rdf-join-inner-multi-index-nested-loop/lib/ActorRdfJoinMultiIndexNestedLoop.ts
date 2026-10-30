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
import type { Algebra } from '@comunica/utils-algebra';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { doesShapeAcceptOperation, getOperationSource } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';
import type { IIndexNestedLoopLookup } from './IndexNestedLoopIterator';
import { getArbitraryLengthPathLookup, IndexNestedLoopIterator } from './IndexNestedLoopIterator';

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
      const sourceWrapper = <IQuerySourceWrapper> ActorRdfJoinMultiIndexNestedLoop.getLookupSource(operation);
      return {
        operation,
        source: sourceWrapper.source,
        context: sourceWrapper.context ? action.context.merge(sourceWrapper.context) : action.context,
        path: getArbitraryLengthPathLookup(operation),
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
   * Get the source in which the given operation is looked up.
   * For arbitrary length paths, this is the source of the followed predicate.
   * @param operation An operation.
   */
  public static getLookupSource(operation: Algebra.Operation): IQuerySourceWrapper | undefined {
    const path = getArbitraryLengthPathLookup(operation);
    return getOperationSource(path ? path.link : operation);
  }

  /**
   * Check if the given entry can be looked up synchronously in its source.
   * Arbitrary length paths can be looked up if their predicate can be looked up.
   * @param entry A join entry.
   * @param context The action context.
   */
  public static async canLookUp(entry: IJoinEntry, context: IActionContext): Promise<boolean> {
    const sourceWrapper = ActorRdfJoinMultiIndexNestedLoop.getLookupSource(entry.operation);
    if (Boolean(entry.operationModified) || !sourceWrapper) {
      return false;
    }
    const shape = await sourceWrapper.source.getSelectorShape(context);
    const path = getArbitraryLengthPathLookup(entry.operation);
    if (path) {
      const dataFactory: ComunicaDataFactory = context.getSafe(KeysInitQuery.dataFactory);
      const algebraFactory = new AlgebraFactory(dataFactory);
      const step = algebraFactory.createPattern(
        dataFactory.variable('s'),
        path.predicate,
        dataFactory.variable('o'),
        (<Algebra.Path> entry.operation).graph,
      );
      return doesShapeAcceptOperation(shape, step, { synchronous: true });
    }
    return doesShapeAcceptOperation(shape, entry.operation, { synchronous: true });
  }

  /**
   * Estimate how many results a lookup of the given entry produces when the given variables are bound.
   * @param entry A join entry.
   * @param bound The names of the bound variables.
   */
  public static estimateFanout(entry: IJoinEntryWithMetadata, bound: Set<string>): number {
    // Paths can only be looked up from a bound subject or object.
    if (getArbitraryLengthPathLookup(entry.operation)) {
      const path = <Algebra.Path> entry.operation;
      const isBound = (term: RDF.Term): boolean => term.termType !== 'Variable' || bound.has(term.value);
      if (!isBound(path.subject) && !isBound(path.object)) {
        return Number.POSITIVE_INFINITY;
      }
    }
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
      return failTest(`Actor ${this.name} requires all entries but one to be operations over sources that support synchronous lookups`);
    }

    // Pick the first entry that leads to the cheapest order.
    let best: { first: number; order: number[]; iterations: number; cardinality: number } | undefined;
    for (const first of firstCandidates) {
      const lookupOrder = ActorRdfJoinMultiIndexNestedLoop.getLookupOrder(entries, first, this.lookupCost);
      if (Number.isFinite(lookupOrder.iterations) && (!best || lookupOrder.iterations < best.iterations)) {
        best = { first, ...lookupOrder };
      }
    }
    if (!best) {
      return failTest(`Actor ${this.name} requires an order in which every path is looked up from a bound term`);
    }

    // Only the first entry is requested, as lookups are synchronous.
    const requestTime = ActorRdfJoin.getRequestInitialTimes(metadatas)[best.first] +
      metadatas[best.first].cardinality.value * ActorRdfJoin.getRequestItemTimes(metadatas)[best.first];
    return passTestWithSideData({
      iterations: best.iterations,
      persistedItems: 0,
      blockingItems: 0,
      requestTime,
    }, { ...sideData, first: best.first, order: best.order, cardinality: best.cardinality });
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
