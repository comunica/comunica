import type {
  IActionRdfJoin,
  IActorRdfJoinArgs,
  IActorRdfJoinOutputInner,
  IActorRdfJoinTestSideData,
  MediatorRdfJoin,
} from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import type { MediatorRdfJoinEntriesSort } from '@comunica/bus-rdf-join-entries-sort';
import { KeysHttp, KeysInitQuery } from '@comunica/context-entries';
import type { TestResult } from '@comunica/core';
import { passTestWithSideData, failTest, passTest } from '@comunica/core';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type {
  IJoinEntryWithMetadata,
  IQueryOperationResultBindings,
  IQuerySourceWrapper,
  IActionContext,
  ComunicaDataFactory,
} from '@comunica/types';
import { Algebra, AlgebraFactory, algebraUtils } from '@comunica/utils-algebra';
import { ChunkedIterator } from '@comunica/utils-iterator';
import {
  doesShapeAcceptOperationInContext,
  getOperationSource,
  getSourceSelectorShape,
} from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { ArrayIterator, TransformIterator, UnionIterator } from 'asynciterator';
import { termToString } from 'rdf-string';

/**
 * A comunica Inner Multi Bind Source RDF Join Actor.
 */
export class ActorRdfJoinMultiBindSource extends ActorRdfJoin<IActorRdfJoinMultiBindSourceTestSideData> {
  public static readonly BLANK_NODE_IRI_PREFIX = 'urn:comunica:bind-source:blank-node:';

  public readonly selectivityModifier: number;
  public readonly blockSize: number;
  public readonly minMaxCardinalityRatio: number;
  public readonly mediatorJoinEntriesSort: MediatorRdfJoinEntriesSort;
  public readonly mediatorJoin?: MediatorRdfJoin;

  public constructor(args: IActorRdfJoinInnerMultiBindSourceArgs) {
    super(args, {
      logicalType: 'inner',
      physicalName: 'bind-source',
      pushesBindingsToSource: true,
      canHandleUndefs: true,
    });
    this.selectivityModifier = args.selectivityModifier;
    this.blockSize = args.blockSize;
    this.minMaxCardinalityRatio = args.minMaxCardinalityRatio ?? 60;
    this.mediatorJoinEntriesSort = args.mediatorJoinEntriesSort;
    this.mediatorJoin = args.mediatorJoin;
  }

  /**
   * The operations to send bindings to: the operation itself if it has a source,
   * or each input of a union of operations that each have a source.
   * @param operation An operation.
   */
  public static getBindTargets(operation: Algebra.Operation): IBindTarget[] | undefined {
    const sourceWrapper = getOperationSource(operation);
    if (sourceWrapper) {
      return [{ sourceWrapper, operation }];
    }
    if (operation.type === Algebra.Types.UNION) {
      const targets = (<Algebra.Union> operation).input
        .map(input => ({ sourceWrapper: getOperationSource(input), operation: input }));
      if (targets.every(target => target.sourceWrapper)) {
        return <IBindTarget[]> targets;
      }
    }
  }

  /**
   * Send a chunk of bindings to each target, and union the results.
   */
  public queryTargets(
    targets: IBindTarget[],
    chunk: AsyncIterator<RDF.Bindings>,
    metadata: IJoinEntryWithMetadata['metadata'],
    context: IActionContext,
    dataFactory: ComunicaDataFactory,
  ): AsyncIterator<RDF.Bindings> {
    return new TransformIterator(async() => {
      const bindings = await chunk.toArray();
      const bindingsPerTarget = await Promise.all(targets
        .map(target => this.pruneBindingsByIriPrefix(target, bindings, context, dataFactory)));
      if (targets.length === 1) {
        return this.queryTarget(targets[0], bindingsPerTarget[0], metadata, context, dataFactory);
      }
      return new UnionIterator(
        targets.map((target, i) => this.queryTarget(target, bindingsPerTarget[i], metadata, context, dataFactory)),
        { autoStart: false },
      );
    }, { autoStart: false });
  }

  /**
   * Per target operation, whether it has results for IRIs with a given prefix for a given variable.
   */
  private readonly iriPrefixAsks = new WeakMap<Algebra.Operation, Map<string, Promise<boolean>>>();
  public static IRI_PREFIX_PRUNING = process.env.COMUNICA_BIND_PREFIX_PRUNING !== '0';
  public static IRI_PREFIX_ASK_TIMEOUT = 2_000;
  public static IRI_PREFIX_ASK_WAIT = 500;
  private readonly slowPrefixSources = new WeakSet<object>();

  /**
   * The prefix of an IRI up to and including its last slash or hash.
   * @param iri An IRI.
   */
  public static getIriPrefix(iri: string): string {
    const index = Math.max(iri.lastIndexOf('/'), iri.lastIndexOf('#'));
    return index > 0 ? iri.slice(0, index + 1) : iri;
  }

  /**
   * Remove the bindings that can not have results in the target,
   * because the target has no results for the IRI prefix of one of their values.
   * This is determined with one (cached) ASK query per variable and IRI prefix,
   * e.g., so that blocks of museum-specific IRIs are only sent to the museum that mints them.
   * @param target A bind target.
   * @param bindings Bindings to pass to the target.
   * @param context The action context.
   * @param dataFactory The data factory.
   */
  public async pruneBindingsByIriPrefix(
    target: IBindTarget,
    bindings: RDF.Bindings[],
    context: IActionContext,
    dataFactory: ComunicaDataFactory,
  ): Promise<RDF.Bindings[]> {
    if (!ActorRdfJoinMultiBindSource.IRI_PREFIX_PRUNING || bindings.length === 0) {
      return bindings;
    }
    const variables = new Set(algebraUtils.inScopeVariables(target.operation).map(variable => variable.value));
    const keys = new Map<string, [RDF.Variable, string]>();
    for (const binding of bindings) {
      for (const [ variable, term ] of binding) {
        if (term.termType === 'NamedNode' && variables.has(variable.value)) {
          const prefix = ActorRdfJoinMultiBindSource.getIriPrefix(term.value);
          keys.set(`${variable.value} ${prefix}`, [ variable, prefix ]);
        }
      }
    }
    if (keys.size === 0) {
      return bindings;
    }

    // Sources that do not answer these checks in time are not checked anymore.
    if (this.slowPrefixSources.has(target.sourceWrapper.source)) {
      return bindings;
    }
    let asks = this.iriPrefixAsks.get(target.operation);
    if (!asks) {
      asks = new Map();
      this.iriPrefixAsks.set(target.operation, asks);
    }
    const algebraFactory = new AlgebraFactory(dataFactory);
    const allowed = new Map<string, boolean>();
    await Promise.all([ ...keys.entries() ].map(async([ key, [ variable, prefix ]]) => {
      let ask = asks.get(key);
      if (!ask) {
        const operation = algebraFactory.createAsk(algebraFactory.createFilter(
          target.operation,
          algebraFactory.createOperatorExpression('strstarts', [
            algebraFactory.createOperatorExpression('str', [ algebraFactory.createTermExpression(variable) ]),
            algebraFactory.createTermExpression(dataFactory.literal(prefix)),
          ]),
        ));
        // Checks that fail or are not answered in time do not prune anything, and are aborted.
        const abortController = new AbortController();
        const existingSignal = context.get(KeysHttp.httpAbortSignal);
        const askContext = context.set(
          KeysHttp.httpAbortSignal,
          existingSignal ? AbortSignal.any([ existingSignal, abortController.signal ]) : abortController.signal,
        );
        let timeout: NodeJS.Timeout | undefined;
        ask = Promise.race([
          target.sourceWrapper.source.queryBoolean(operation, askContext).catch(() => true),
          new Promise<boolean>((resolve) => {
            timeout = setTimeout(() => {
              this.slowPrefixSources.add(target.sourceWrapper.source);
              abortController.abort();
              resolve(true);
            }, ActorRdfJoinMultiBindSource.IRI_PREFIX_ASK_TIMEOUT);
          }),
        ]).finally(() => clearTimeout(timeout));
        asks.set(key, ask);
      }
      // Do not hold up a block for long on a check, but send it unpruned instead.
      allowed.set(key, await Promise.race([
        ask,
        new Promise<boolean>(resolve => setTimeout(() => resolve(true), ActorRdfJoinMultiBindSource.IRI_PREFIX_ASK_WAIT)),
      ]));
    }));

    return bindings.filter(binding => [ ...binding ].every(([ variable, term ]) =>
      term.termType !== 'NamedNode' || !variables.has(variable.value) ||
      allowed.get(`${variable.value} ${ActorRdfJoinMultiBindSource.getIriPrefix(term.value)}`) !== false));
  }

  /**
   * Send bindings to a target.
   *
   * If all bindings bind the variables of the target operation that the bindings can bind,
   * only the distinct values of these variables are passed, and the results are joined with the bindings locally.
   * Otherwise, the bindings are passed as a whole, as unbound variables match any value in the source.
   *
   * Blank nodes can not be passed to a source, as their labels are scoped to the result they came from.
   * So bindings with a blank node for a variable of the target operation can not produce results, and are skipped.
   * Blank nodes for other variables of bindings that are passed as a whole are passed as IRIs,
   * and restored in the results.
   */
  public queryTarget(
    target: IBindTarget,
    bindings: RDF.Bindings[],
    metadata: IJoinEntryWithMetadata['metadata'],
    context: IActionContext,
    dataFactory: ComunicaDataFactory,
  ): AsyncIterator<RDF.Bindings> {
    const variables = new Set(algebraUtils.inScopeVariables(target.operation).map(variable => variable.value));
    const bindingsWithoutBlankNodes = bindings.filter(binding => ![ ...binding ]
      .some(([ variable, term ]) => term.termType === 'BlankNode' && variables.has(variable.value)));
    if (bindingsWithoutBlankNodes.length === 0) {
      return new ArrayIterator<RDF.Bindings>([], { autoStart: false });
    }
    const targetContext = target.sourceWrapper.context ? context.merge(target.sourceWrapper.context) : context;

    const keyVariables = metadata.variables
      .map(({ variable }) => variable)
      .filter(variable => variables.has(variable.value));
    const keys = bindingsWithoutBlankNodes.map(binding => ActorRdfJoinMultiBindSource.getKey(binding, keyVariables));
    if (keys.every(Boolean)) {
      const bindingsByKey = new Map<string, RDF.Bindings[]>();
      const keyBindings: RDF.Bindings[] = [];
      for (const [ index, binding ] of bindingsWithoutBlankNodes.entries()) {
        const bindingsOfKey = bindingsByKey.get(keys[index]!);
        if (bindingsOfKey) {
          bindingsOfKey.push(binding);
        } else {
          bindingsByKey.set(keys[index]!, [ binding ]);
          keyBindings.push(binding
            .filter((_, variable) => keyVariables.some(keyVariable => keyVariable.equals(variable))));
        }
      }
      return target.sourceWrapper.source.queryBindings(target.operation, targetContext, {
        joinBindings: {
          bindings: new ArrayIterator(keyBindings, { autoStart: false }),
          metadata: {
            ...metadata,
            variables: metadata.variables
              .filter(({ variable }) => keyVariables.some(keyVariable => keyVariable.equals(variable))),
          },
        },
      }).transform({
        autoStart: false,
        transform(result, done, push) {
          for (const binding of bindingsByKey.get(ActorRdfJoinMultiBindSource.getKey(result, keyVariables)!) ?? []) {
            push(binding.merge(result)!);
          }
          done();
        },
      });
    }

    const blankNodes = new Map<string, RDF.Term>();
    const joinBindings = bindingsWithoutBlankNodes.map(binding => binding.map((term) => {
      if (term.termType !== 'BlankNode') {
        return term;
      }
      const iri = `${ActorRdfJoinMultiBindSource.BLANK_NODE_IRI_PREFIX}${blankNodes.size}`;
      blankNodes.set(iri, term);
      return dataFactory.namedNode(iri);
    }));
    const results = target.sourceWrapper.source.queryBindings(target.operation, targetContext, {
      joinBindings: { bindings: new ArrayIterator(joinBindings, { autoStart: false }), metadata },
    });
    if (blankNodes.size === 0) {
      return results;
    }
    return results.map(result => result
      .map(term => (term.termType === 'NamedNode' ? blankNodes.get(term.value) : undefined) ?? term));
  }

  /**
   * Create a key from the values of the given variables.
   * @param binding A binding.
   * @param keyVariables The variables of the key.
   * @return The key, or undefined if the binding does not bind all variables.
   */
  public static getKey(binding: RDF.Bindings, keyVariables: RDF.Variable[]): string | undefined {
    const terms = keyVariables.map(variable => binding.get(variable));
    if (terms.every(Boolean)) {
      return JSON.stringify(terms.map(term => termToString(term)));
    }
  }

  public async getOutput(
    action: IActionRdfJoin,
    sideData: IActorRdfJoinMultiBindSourceTestSideData,
  ): Promise<IActorRdfJoinOutputInner> {
    const dataFactory: ComunicaDataFactory = action.context.getSafe(KeysInitQuery.dataFactory);
    const algebraFactory = new AlgebraFactory(dataFactory);

    // Order the entries so we can pick the first one (usually the one with the lowest cardinality)
    const entries = sideData.entriesSorted;
    this.logDebug(
      action.context,
      'First entry for Bind Join Source: ',
      () => ({
        entry: entries[0].operation,
        cardinality: entries[0].metadata.cardinality,
        order: entries[0].metadata.order,
        availableOrders: entries[0].metadata.availableOrders,
      }),
    );

    // Take the stream with the lowest cardinality
    const smallestStream: IQueryOperationResultBindings = entries[0].output;
    const smallestMetadata = entries[0].metadata;
    const remainingEntries = [ ...entries ];
    remainingEntries.splice(0, 1);
    const { targets, bindIndex } = sideData;
    const boundEntries = bindIndex < 0 ? remainingEntries : [ remainingEntries[bindIndex] ];
    const otherEntries = bindIndex < 0 ? [] : remainingEntries.filter((_, i) => i !== bindIndex);

    // Close the streams of the entries that bindings are passed to
    for (const entry of boundEntries) {
      entry.output.bindingsStream.close();
    }

    // Slice the smallest stream into chunks according to the block size, so we avoid blocking too long.
    const chunkedStreams: AsyncIterator<AsyncIterator<RDF.Bindings>> = new ChunkedIterator(
      smallestStream.bindingsStream,
      this.blockSize,
      { autoStart: false },
    );

    // For each chunk, pass the query and the bindings to the sources for execution
    const bindingsStream = new UnionIterator(
      chunkedStreams.map(chunk => this.queryTargets(targets, chunk, smallestMetadata, action.context, dataFactory)),
      { autoStart: false },
    );

    // Join the result with the entries that were not bound
    if (otherEntries.length > 0) {
      const boundJoinEntries = [ entries[0], ...boundEntries ];
      const result = await this.mediatorJoin!.mediate({
        type: action.type,
        entries: [
          {
            output: {
              type: 'bindings',
              bindingsStream,
              metadata: () => this.constructResultMetadata(
                boundJoinEntries,
                boundJoinEntries.map(entry => entry.metadata),
                action.context,
              ),
            },
            operation: algebraFactory.createJoin(boundJoinEntries.map(entry => entry.operation), false),
            operationModified: true,
          },
          ...otherEntries.map(entry => ({
            output: entry.output,
            operation: entry.operation,
            operationModified: entry.operationModified,
          })),
        ],
        context: action.context,
      });
      return {
        result,
        physicalPlanMetadata: {
          bindIndex: sideData.entriesUnsorted.indexOf(entries[0]),
        },
      };
    }

    return {
      result: {
        type: 'bindings',
        bindingsStream,
        metadata: () => this.constructResultMetadata(entries, entries.map(entry => entry.metadata), action.context),
      },
      physicalPlanMetadata: {
        bindIndex: sideData.entriesUnsorted.indexOf(entries[0]),
      },
    };
  }

  protected async sortJoinEntries(
    entries: IJoinEntryWithMetadata[],
    context: IActionContext,
  ): Promise<TestResult<IJoinEntryWithMetadata[]>> {
    const entriesTest = await ActorRdfJoin.sortJoinEntries(this.mediatorJoinEntriesSort, entries, context);
    if (entriesTest.isFailed()) {
      return entriesTest;
    }
    entries = entriesTest.get();

    // Prioritize entries with modified operations, so these are not re-executed
    entries = entries.sort((entryLeft, entryRight) => {
      if (entryLeft.operationModified && !entryRight.operationModified) {
        return -1;
      }
      return 0;
    });

    return passTest(entries);
  }

  public async getJoinCoefficients(
    action: IActionRdfJoin,
    sideData: IActorRdfJoinTestSideData,
  ): Promise<TestResult<IMediatorTypeJoinCoefficients, IActorRdfJoinMultiBindSourceTestSideData>> {
    let { metadatas } = sideData;

    const dataFactory: ComunicaDataFactory = action.context.getSafe(KeysInitQuery.dataFactory);
    const algebraFactory = new AlgebraFactory(dataFactory);

    // Order the entries so we can pick the first one (usually the one with the lowest cardinality)
    const entriesUnsorted = action.entries.map((entry, i) => ({ ...entry, metadata: metadatas[i] }));
    const entriesTest = await this.sortJoinEntries(entriesUnsorted, action.context);
    if (entriesTest.isFailed()) {
      return entriesTest;
    }
    const entriesSorted = entriesTest.get();
    metadatas = entriesSorted.map(entry => entry.metadata);

    const requestInitialTimes = ActorRdfJoin.getRequestInitialTimes(metadatas);
    const requestItemTimes = ActorRdfJoin.getRequestItemTimes(metadatas);

    // Determine first stream and remaining ones
    const remainingEntries = [ ...entriesSorted ];
    const remainingRequestInitialTimes = [ ...requestInitialTimes ];
    const remainingRequestItemTimes = [ ...requestItemTimes ];
    remainingEntries.splice(0, 1);
    remainingRequestInitialTimes.splice(0, 1);
    remainingRequestItemTimes.splice(0, 1);

    // Bind on all remaining operations if they have the same source.
    const sources = remainingEntries.map(entry => getOperationSource(entry.operation));
    let targets: IBindTarget[];
    let bindIndex = -1;
    if (sources.every(source => source && source === sources[0])) {
      targets = [{
        sourceWrapper: sources[0]!,
        operation: this.createOperationFromEntries(algebraFactory, remainingEntries),
      }];
    } else if (this.mediatorJoin) {
      // Otherwise, bind on the first remaining operation that shares a variable with the first one,
      // and join the result with the other operations.
      const firstVariables = new Set(metadatas[0].variables.map(variable => variable.variable.value));
      bindIndex = remainingEntries.findIndex(entry => entry.metadata.variables
        .some(variable => firstVariables.has(variable.variable.value)) &&
        ActorRdfJoinMultiBindSource.getBindTargets(entry.operation));
      if (bindIndex < 0) {
        return failTest(`Actor ${this.name} found no remaining operation with sources that shares variables to bind on`);
      }
      targets = ActorRdfJoinMultiBindSource.getBindTargets(remainingEntries[bindIndex].operation)!;

      // As in the bind join, only bind if the smallest stream is much smaller than the largest stream.
      if (metadatas[0].cardinality.value * this.minMaxCardinalityRatio >
        Math.max(...metadatas.map(metadata => metadata.cardinality.value))) {
        return failTest(`Actor ${this.name} can only bind across sources if the smallest stream is much smaller than largest stream`);
      }
    } else if (sources.some(source => !source)) {
      return failTest(`Actor ${this.name} can not bind on remaining operations without source annotation`);
    } else {
      return failTest(`Actor ${this.name} can not bind on remaining operations with non-equal source annotation`);
    }

    // Reject if a source can not handle bindings
    for (const target of targets) {
      const selectorShape = await getSourceSelectorShape(target.sourceWrapper, action.context);
      if (!doesShapeAcceptOperationInContext(selectorShape, target.operation, action.context, { joinBindings: true })) {
        return failTest(`Actor ${this.name} detected a source that can not handle passing down join bindings`);
      }
    }

    // Determine selectivities of smallest entry with all other entries
    const selectivities = await Promise.all(remainingEntries
      .map(async entry => (await this.mediatorJoinSelectivity.mediate({
        entries: [ entriesSorted[0], entry ],
        context: action.context,
      })).selectivity * this.selectivityModifier));

    // Determine coefficients for remaining entries
    const cardinalityRemaining = remainingEntries
      .map((entry, i) => entry.metadata.cardinality.value * selectivities[i])
      .reduce((sum, element) => sum + element, 0);

    return passTestWithSideData({
      iterations: 1,
      persistedItems: metadatas[0].cardinality.value,
      blockingItems: metadatas[0].cardinality.value,
      requestTime: requestInitialTimes[0] + metadatas[0].cardinality.value * requestItemTimes[0] +
        requestInitialTimes[1] + cardinalityRemaining * requestItemTimes[1],
    }, { ...sideData, entriesUnsorted, entriesSorted, targets, bindIndex });
  }

  public createOperationFromEntries(
    algebraFactory: AlgebraFactory,
    remainingEntries: IJoinEntryWithMetadata[],
  ): Algebra.Operation {
    if (remainingEntries.length === 1) {
      return remainingEntries[0].operation;
    }
    return algebraFactory.createJoin(remainingEntries.map(entry => entry.operation), true);
  }
}

export interface IActorRdfJoinInnerMultiBindSourceArgs
  extends IActorRdfJoinArgs<IActorRdfJoinMultiBindSourceTestSideData> {
  /**
   * Multiplier for selectivity values
   * @range {double}
   * @default {0.0001}
   */
  selectivityModifier: number;
  /**
   * The maximum amount of bindings to send to the source per block.
   * @default {16}
   */
  blockSize: number;
  /**
   * The minimum ratio between the largest and smallest stream to bind on operations of different sources.
   * @range {double}
   * @default {60}
   */
  minMaxCardinalityRatio?: number;
  /**
   * The join entries sort mediator
   */
  mediatorJoinEntriesSort: MediatorRdfJoinEntriesSort;
  /**
   * An optional join mediator, to join the remaining operations that were not bound,
   * when these do not all have the same source.
   */
  mediatorJoin?: MediatorRdfJoin;
}

export interface IBindTarget {
  sourceWrapper: IQuerySourceWrapper;
  operation: Algebra.Operation;
}

export interface IActorRdfJoinMultiBindSourceTestSideData extends IActorRdfJoinTestSideData {
  entriesUnsorted: IJoinEntryWithMetadata[];
  entriesSorted: IJoinEntryWithMetadata[];
  targets: IBindTarget[];
  bindIndex: number;
}
