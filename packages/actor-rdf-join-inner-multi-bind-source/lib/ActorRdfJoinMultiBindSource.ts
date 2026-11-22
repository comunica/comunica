import type {
  IActionRdfJoin,
  IActorRdfJoinArgs,
  IActorRdfJoinOutputInner,
  IActorRdfJoinTestSideData,
  MediatorRdfJoin,
} from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import type { MediatorRdfJoinEntriesSort } from '@comunica/bus-rdf-join-entries-sort';
import { KeysInitQuery } from '@comunica/context-entries';
import type { TestResult } from '@comunica/core';
import { passTestWithSideData, failTest, passTest } from '@comunica/core';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type {
  IJoinEntryWithMetadata,
  IQueryOperationResultBindings,
  IQuerySource,
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
    reanchoring?: IBlankNodeReanchoring,
  ): AsyncIterator<RDF.Bindings> {
    return new TransformIterator(async() => {
      const bindings = await chunk.toArray();
      if (targets.length === 1) {
        return this.queryTarget(targets[0], bindings, metadata, context, dataFactory, reanchoring);
      }
      return new UnionIterator(
        targets.map(target => this.queryTarget(target, bindings, metadata, context, dataFactory, reanchoring)),
        { autoStart: false },
      );
    }, { autoStart: false });
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
    reanchoring?: IBlankNodeReanchoring,
  ): AsyncIterator<RDF.Bindings> {
    const variables = new Set(algebraUtils.inScopeVariables(target.operation).map(variable => variable.value));
    const bindingsWithoutBlankNodes: RDF.Bindings[] = [];
    const bindingsWithBlankNodes: RDF.Bindings[] = [];
    for (const binding of bindings) {
      if ([ ...binding ].some(([ variable, term ]) => term.termType === 'BlankNode' && variables.has(variable.value))) {
        bindingsWithBlankNodes.push(binding);
      } else {
        bindingsWithoutBlankNodes.push(binding);
      }
    }
    const reanchored = reanchoring && bindingsWithBlankNodes.length > 0 ?
      this.reanchorBlankNodes(target, bindingsWithBlankNodes, reanchoring, metadata, context, dataFactory) :
      undefined;
    const results = this
      .queryTargetWithoutBlankNodes(target, bindingsWithoutBlankNodes, metadata, context, dataFactory);
    return reanchored ? new UnionIterator([ results, reanchored ], { autoStart: false }) : results;
  }

  /**
   * Send bindings without blank nodes for variables of the target operation to a target.
   */
  public queryTargetWithoutBlankNodes(
    target: IBindTarget,
    bindingsWithoutBlankNodes: RDF.Bindings[],
    metadata: IJoinEntryWithMetadata['metadata'],
    context: IActionContext,
    dataFactory: ComunicaDataFactory,
  ): AsyncIterator<RDF.Bindings> {
    const variables = new Set(algebraUtils.inScopeVariables(target.operation).map(variable => variable.value));
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
   * Re-anchor left bindings with blank nodes for variables of the target in the source of the target.
   *
   * Blank nodes can not be passed to a source, as their labels are scoped to the result they came from.
   * But a blank node produced by the source of the target can only match within that source,
   * together with the patterns of the left operation that produced it.
   * So these patterns are joined with the target operation, filtered to blank nodes for these variables,
   * and sent to that source as one query, bound on the other values of the bindings.
   * This is done once per distinct set of other values over the whole left stream,
   * as the query finds the results of all left bindings that only differ in their blank nodes.
   *
   * @param target A bind target.
   * @param bindings Left bindings with a blank node for a variable of the target operation.
   * @param reanchoring The left operation, and the re-anchored keys per source.
   * @param metadata The metadata of the left bindings.
   * @param context The action context.
   * @param dataFactory The data factory.
   */
  public reanchorBlankNodes(
    target: IBindTarget,
    bindings: RDF.Bindings[],
    reanchoring: IBlankNodeReanchoring,
    metadata: IJoinEntryWithMetadata['metadata'],
    context: IActionContext,
    dataFactory: ComunicaDataFactory,
  ): AsyncIterator<RDF.Bindings> | undefined {
    const source = target.sourceWrapper.source;
    if (!source.isBlankNodeLocal) {
      return;
    }
    let seen = reanchoring.seen.get(source);
    if (!seen) {
      seen = new Set();
      reanchoring.seen.set(source, seen);
    }
    const targetVariables = new Set(algebraUtils.inScopeVariables(target.operation).map(variable => variable.value));

    // Group the bindings by their blank node variables, which determine the patterns to re-anchor
    const groups = new Map<string, IBlankNodeGroup>();
    for (const binding of bindings) {
      const blankVariables = new Set([ ...binding ]
        .filter(([ variable, term ]) => term.termType === 'BlankNode' && targetVariables.has(variable.value))
        .map(([ variable ]) => variable.value));
      // Blank nodes of other sources can not match in this source
      if ([ ...blankVariables ].some(variable => !source.isBlankNodeLocal!(<RDF.BlankNode> binding.get(variable)))) {
        continue;
      }
      // The left patterns that mention these variables, and other blank nodes of these patterns
      let patterns: Algebra.Pattern[] = [];
      let size = -1;
      while (blankVariables.size !== size) {
        size = blankVariables.size;
        patterns = reanchoring.patterns.filter(pattern => ActorRdfJoinMultiBindSource.getPatternVariables(pattern)
          .some(variable => blankVariables.has(variable.value)));
        for (const variable of patterns.flatMap(pattern => ActorRdfJoinMultiBindSource.getPatternVariables(pattern))) {
          if (binding.get(variable)?.termType === 'BlankNode') {
            blankVariables.add(variable.value);
          }
        }
      }
      if (patterns.length === 0) {
        continue;
      }
      const reduced = binding.filter((_, variable) => !blankVariables.has(variable.value));
      const groupKey = [ ...blankVariables ].sort().join(' ');
      const key = `${groupKey} ${JSON.stringify([ ...reduced ]
        .map(([ variable, term ]) => `${variable.value} ${termToString(term)}`).sort())}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      let group = groups.get(groupKey);
      if (!group) {
        group = { patterns, blankVariables, reduced: []};
        groups.set(groupKey, group);
      }
      group.reduced.push(reduced);
    }

    const algebraFactory = new AlgebraFactory(dataFactory);
    const targetContext = target.sourceWrapper.context ? context.merge(target.sourceWrapper.context) : context;
    const outputs: AsyncIterator<RDF.Bindings>[] = [];
    for (const { patterns, blankVariables, reduced } of groups.values()) {
      const join = algebraFactory.createJoin([ ...patterns, target.operation ], false);
      // Bind on the variables of the query that all bindings bind
      const anchorVariables = algebraUtils.inScopeVariables(join)
        .filter(variable => !blankVariables.has(variable.value) && reduced.every(binding => binding.has(variable)));
      const operation = algebraFactory.createFilter(join, [ ...blankVariables ]
        .map(variable => algebraFactory.createOperatorExpression('isblank', [
          algebraFactory.createTermExpression(dataFactory.variable(variable)),
        ]))
        .reduce((left, right) => algebraFactory.createOperatorExpression('&&', [ left, right ])));
      const reducedByAnchor = new Map<string, RDF.Bindings[]>();
      const anchors: RDF.Bindings[] = [];
      for (const binding of reduced) {
        const anchorKey = ActorRdfJoinMultiBindSource.getKey(binding, anchorVariables)!;
        const reducedOfAnchor = reducedByAnchor.get(anchorKey);
        if (reducedOfAnchor) {
          reducedOfAnchor.push(binding);
        } else {
          reducedByAnchor.set(anchorKey, [ binding ]);
          anchors.push(binding.filter((_, variable) => anchorVariables.some(anchor => anchor.equals(variable))));
        }
      }
      const results = anchorVariables.length > 0 ?
        source.queryBindings(operation, targetContext, {
          joinBindings: {
            bindings: new ArrayIterator(anchors, { autoStart: false }),
            metadata: {
              ...metadata,
              variables: anchorVariables.map(variable => ({ variable, canBeUndef: false })),
            },
          },
        }) :
        source.queryBindings(operation, targetContext);
      outputs.push(results.transform({
        autoStart: false,
        transform(result, done, push) {
          const anchorKey = ActorRdfJoinMultiBindSource.getKey(result, anchorVariables)!;
          for (const binding of reducedByAnchor.get(anchorKey) ?? []) {
            const merged = binding.merge(result);
            if (merged) {
              push(merged);
            }
          }
          done();
        },
      }));
    }
    if (outputs.length === 0) {
      return;
    }
    return outputs.length === 1 ? outputs[0] : new UnionIterator(outputs, { autoStart: false });
  }

  /**
   * The variables of a pattern, excluding nested quoted triples.
   * @param pattern A pattern.
   */
  public static getPatternVariables(pattern: Algebra.Pattern): RDF.Variable[] {
    return [ pattern.subject, pattern.predicate, pattern.object, pattern.graph ]
      .filter((term): term is RDF.Variable => term.termType === 'Variable');
  }

  /**
   * The distinct patterns of an operation, as the same pattern may occur once per source.
   * @param operation An operation.
   */
  public static getDistinctPatterns(operation: Algebra.Operation): Algebra.Pattern[] {
    const patterns = new Map<string, Algebra.Pattern>();
    algebraUtils.visitOperation(operation, {
      [Algebra.Types.PATTERN]: {
        preVisitor: (pattern: Algebra.Pattern) => {
          const key = [ pattern.subject, pattern.predicate, pattern.object, pattern.graph ].map(termToString).join(' ');
          if (!patterns.has(key)) {
            patterns.set(key, pattern);
          }
          return {};
        },
      },
    });
    return [ ...patterns.values() ];
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

    // Bindings with blank nodes are re-anchored in their source, once per distinct set of other values
    const reanchoring: IBlankNodeReanchoring = {
      patterns: ActorRdfJoinMultiBindSource.getDistinctPatterns(entries[0].operation),
      seen: new Map(),
    };

    // For each chunk, pass the query and the bindings to the sources for execution
    const bindingsStream = new UnionIterator(
      chunkedStreams.map(chunk => this.queryTargets(
        targets,
        chunk,
        smallestMetadata,
        action.context,
        dataFactory,
        reanchoring,
      )),
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

/**
 * The state for re-anchoring left bindings with blank nodes in their source.
 */
export interface IBlankNodeReanchoring {
  /**
   * The distinct patterns of the left operation.
   */
  patterns: Algebra.Pattern[];
  /**
   * The keys of the bindings that were re-anchored per source.
   */
  seen: Map<IQuerySource, Set<string>>;
}

interface IBlankNodeGroup {
  patterns: Algebra.Pattern[];
  blankVariables: Set<string>;
  reduced: RDF.Bindings[];
}
