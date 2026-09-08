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
import type {
  BindingsStream,
  ComunicaDataFactory,
  IQuerySourceWrapper,
  MetadataBindings,
} from '@comunica/types';
import type { Algebra } from '@comunica/utils-algebra';
import { AlgebraFactory, Algebra as AlgebraTypes } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { getOperationSource } from '@comunica/utils-query-operation';

/**
 * A comunica Bind Pattern RDF Join Actor.
 *
 * Joins by reading the smallest entry and asking the sources of the other entries for their patterns once per
 * binding, one pattern after the other. The other entries have to be single patterns with a source, which is
 * the only thing this asks of a source. The order in which the patterns are bound is decided once, up front,
 * and the join is only claimed when binding pays off at every pattern.
 */
export class ActorRdfJoinBindPattern extends ActorRdfJoin<IActorRdfJoinBindPatternTestSideData> {
  public readonly bindOrder: BindOrder;
  public readonly probeCost: number;
  public readonly mediatorMergeBindingsContext: MediatorMergeBindingsContext;

  public constructor(args: IActorRdfJoinBindPatternArgs) {
    super(args, {
      logicalType: 'inner',
      physicalName: 'bind-pattern',
      canHandleUndefs: false,
      // A chain only needs every pattern to connect to what is bound before it, not one variable in every entry
      requiresVariableOverlap: false,
      isLeaf: false,
    });
    this.bindOrder = args.bindOrder;
    this.probeCost = args.probeCost ?? 10;
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

  /**
   * Decide the order in which the patterns are bound, given the variables the base entry binds.
   *
   * Every step takes a pattern that shares a variable with what is bound so far, so that it is a lookup rather
   * than a scan. Among those, the pattern that is left with the fewest unbound variables is the most selective,
   * one whose subject is bound comes before one that is only bound in its object, and cardinality breaks the
   * remaining tie. Returns undefined when some pattern never connects.
   * @param boundVariables The variables bound by the base entry.
   * @param patterns The patterns with their metadata, in entry order.
   * @return The indexes into patterns in binding order.
   */
  public static orderPatterns(boundVariables: string[], patterns: IBindablePattern[]): number[] | undefined {
    const bound = new Set(boundVariables);
    const remaining = patterns.map((pattern, index) => ({ index, ...pattern }));
    const order: number[] = [];
    while (remaining.length > 0) {
      let best = -1;
      let bestRank: number[] = [];
      for (const [ i, candidate ] of remaining.entries()) {
        if (!candidate.variables.some(variable => bound.has(variable))) {
          continue;
        }
        const rank = [
          candidate.variables.filter(variable => !bound.has(variable)).length,
          ActorRdfJoinBindPattern.isSubjectBound(candidate, bound) ? 0 : 1,
          candidate.cardinality,
        ];
        if (best < 0 || rank.some((value, j) => value !== bestRank[j] && value < bestRank[j] &&
          rank.slice(0, j).every((earlier, k) => earlier === bestRank[k]))) {
          best = i;
          bestRank = rank;
        }
      }
      if (best < 0) {
        return undefined;
      }
      const [ chosen ] = remaining.splice(best, 1);
      for (const variable of chosen.variables) {
        bound.add(variable);
      }
      order.push(chosen.index);
    }
    return order;
  }

  /**
   * Whether the subject of the given pattern is a constant or a bound variable.
   */
  public static isSubjectBound(pattern: IBindablePattern, bound: Set<string>): boolean {
    return pattern.subjectVariable === undefined || bound.has(pattern.subjectVariable);
  }

  /**
   * The rows a pattern yields for one binding of the entries bound before it.
   *
   * A pattern whose subject is bound is a lookup that tends to yield a single row, so the join is capped by the
   * shared variables. A pattern that is only bound in its object can fan out to many rows, like a type or a
   * country would, which the cap does not see. Without statistics on the values, its rows are spread evenly over
   * the bindings, so every probe is expected to yield the pattern's cardinality divided by the bindings entering.
   * @param entering The metadata of what is bound before this pattern, with the number of entering bindings.
   * @param pattern The pattern and its metadata.
   * @param bound The variables bound so far.
   */
  public static estimateJoined(entering: MetadataBindings, pattern: IBindablePattern, bound: Set<string>): number {
    // The order guarantees that the pattern shares a variable with what is bound, so this is always defined.
    const capped = ActorRdfJoin.getSharedVariableJoinCardinality([ entering, pattern.metadata ])!;
    if (ActorRdfJoinBindPattern.isSubjectBound(pattern, bound)) {
      return capped;
    }
    return Math.max(capped, Math.min(pattern.cardinality, entering.cardinality.value *
      Math.max(1, pattern.cardinality / Math.max(1, entering.cardinality.value))));
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

    const { baseIndex, patternIndexes, sources } = sideData;

    // The patterns are asked for once per binding, so their own streams are never read.
    for (const index of patternIndexes) {
      action.entries[index].output.bindingsStream.destroy();
    }

    // Bind the patterns one after the other, each level asking its source for its pattern per binding of the
    // level before it.
    let bindingsStream: BindingsStream = action.entries[baseIndex].output.bindingsStream;
    for (const [ level, index ] of patternIndexes.entries()) {
      const source = sources[level];
      const context = source.context ? action.context.merge(source.context) : action.context;
      bindingsStream = ActorRdfJoinMultiBind.createBindStream(
        this.bindOrder,
        bindingsStream,
        [ action.entries[index].operation ],
        async(operations: Algebra.Operation[]) => source.source.queryBindings(operations[0], context),
        false,
        algebraFactory,
        bindingsFactory,
      );
    }

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

    // Read the entry with the fewest results, and ask the sources of the others for their patterns per binding
    let baseIndex = 0;
    for (const [ index, metadata ] of metadatas.entries()) {
      if (metadata.cardinality.value < metadatas[baseIndex].cardinality.value) {
        baseIndex = index;
      }
    }
    const candidates = action.entries
      .map((entry, index) => ({ index, source: ActorRdfJoinBindPattern.getBindableSource(entry) }))
      .filter(({ index }) => index !== baseIndex);
    if (candidates.some(({ source }) => !source)) {
      return failTest(`Actor ${this.name} requires all entries but the smallest to be patterns with a source`);
    }
    const patterns: IBindablePattern[] = candidates.map(({ index }) => {
      const pattern = <Algebra.Pattern> action.entries[index].operation;
      return {
        metadata: metadatas[index],
        cardinality: metadatas[index].cardinality.value,
        variables: metadatas[index].variables.map(variable => variable.variable.value),
        subjectVariable: pattern.subject.termType === 'Variable' ? pattern.subject.value : undefined,
      };
    });
    const bound = new Set(metadatas[baseIndex].variables.map(variable => variable.variable.value));
    const order = ActorRdfJoinBindPattern.orderPatterns([ ...bound ], patterns);
    if (!order) {
      return failTest(`Actor ${this.name} requires every pattern to share a variable with the entries bound before it`);
    }
    const patternIndexes = order.map(position => candidates[position].index);
    const sources = order.map(position => candidates[position].source!);

    const requestInitialTimes = ActorRdfJoin.getRequestInitialTimes(metadatas);
    const requestItemTimes = ActorRdfJoin.getRequestItemTimes(metadatas);
    const cardinalityBase = metadatas[baseIndex].cardinality.value;

    // Every binding entering a level is looked up in that level's source once, which costs more than a row
    // because the source has to start answering a new pattern, and every row a level produces enters the next.
    let iterations = 0;
    // Every binding costs a whole request of its own, whether or not the source answers in pages, so this only
    // pays off against reading a pattern when the bindings entering its level are fewer than that pattern's pages.
    let requestTime = requestInitialTimes[baseIndex] + cardinalityBase * requestItemTimes[baseIndex];
    let entering: MetadataBindings = metadatas[baseIndex];
    for (const [ level, position ] of order.entries()) {
      const pattern = patterns[position];
      const index = patternIndexes[level];
      const joined = ActorRdfJoinBindPattern.estimateJoined(entering, pattern, bound);
      const probes = entering.cardinality.value;
      const levelIterations = probes * (1 + this.probeCost) + joined;
      const levelRequestTime = probes * (pattern.metadata.requestTime ?? 0) + joined * requestItemTimes[index];
      // Binding into a pattern only pays off when it beats reading that pattern once and hashing the bindings
      // into it. When a level does not, this leaves the join to the actors that split it up, where a shorter
      // chain can still claim the levels that do pay off.
      const hashIterations = (probes + pattern.cardinality) * 0.8;
      const hashRequestTime = requestInitialTimes[index] + pattern.cardinality * requestItemTimes[index];
      if (levelIterations + levelRequestTime > hashIterations + hashRequestTime) {
        return failTest(`Actor ${this.name} would bind into a pattern that is cheaper to read once`);
      }
      iterations += levelIterations;
      requestTime += levelRequestTime;
      for (const variable of pattern.variables) {
        bound.add(variable);
      }
      entering = {
        ...pattern.metadata,
        cardinality: { type: 'estimate', value: joined },
        variables: [
          ...entering.variables,
          ...pattern.metadata.variables.filter(variable => !entering.variables
            .some(previous => previous.variable.equals(variable.variable))),
        ],
      };
    }

    return passTestWithSideData({
      iterations,
      persistedItems: 0,
      blockingItems: 0,
      requestTime,
    }, { ...sideData, baseIndex, patternIndexes, sources });
  }
}

/**
 * A pattern this actor can bind into, with what its cost depends on.
 */
export interface IBindablePattern {
  metadata: MetadataBindings;
  cardinality: number;
  variables: string[];
  /**
   * The name of the subject variable, if the subject is a variable.
   */
  subjectVariable?: string;
}

export interface IActorRdfJoinBindPatternTestSideData extends IActorRdfJoinTestSideData {
  /**
   * The index of the entry that is read.
   */
  baseIndex: number;
  /**
   * The indexes of the pattern entries, in the order in which they are bound.
   */
  patternIndexes: number[];
  /**
   * The source of each pattern entry, in the same order.
   */
  sources: IQuerySourceWrapper[];
}

export interface IActorRdfJoinBindPatternArgs extends IActorRdfJoinArgs<IActorRdfJoinBindPatternTestSideData> {
  /**
   * The order in which elements should be bound.
   * @default {depth-first}
   */
  bindOrder: BindOrder;
  // TODO: in next major, make mandatory.
  /**
   * The cost of asking the source for one bound pattern, expressed in produced rows.
   * @range {double}
   * @default {10}
   */
  probeCost?: number;
  /**
   * A mediator for creating binding context merge handlers
   */
  mediatorMergeBindingsContext: MediatorMergeBindingsContext;
}
