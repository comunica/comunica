import { ActorRdfJoinMultiBind } from '@comunica/actor-rdf-join-inner-multi-bind';
import { ActorRdfJoinOptionalBind } from '@comunica/actor-rdf-join-optional-bind';
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
import type { ComunicaDataFactory, IActionContext, IQuerySourceWrapper, MetadataBindings } from '@comunica/types';
import type { Algebra } from '@comunica/utils-algebra';
import { inScopeVariables } from '@comunica/utils-algebra';
import {
  doesShapeAcceptOperationInContext,
  getOperationSource,
  getSourceSelectorShape,
} from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { ArrayIterator, MultiTransformIterator, TransformIterator } from 'asynciterator';
import { termToString } from 'rdf-string';
import { KeyedChunkedIterator } from './KeyedChunkedIterator';

/**
 * A comunica Optional Bind Source RDF Join Actor.
 * It sends blocks of left bindings to the source of the right operation, and adds the left bindings without results.
 * Left bindings with the same values for the variables of the right operation are sent once.
 */
export class ActorRdfJoinOptionalBindSource extends ActorRdfJoin {
  public static readonly BLANK_NODE_IRI_PREFIX = 'urn:comunica:optional-bind-source:blank-node:';

  public readonly selectivityModifier: number;
  public readonly blockSize: number;
  public readonly maxBlockBindings: number;

  public constructor(args: IActorRdfJoinOptionalBindSourceArgs) {
    super(args, {
      logicalType: 'optional',
      physicalName: 'bind-source',
      limitEntries: 2,
      canHandleUndefs: true,
      requiresVariableOverlap: true,
      canHandleExpression: true,
      pushesBindingsToSource: true,
    });
    this.selectivityModifier = args.selectivityModifier;
    this.blockSize = args.blockSize;
    this.maxBlockBindings = args.maxBlockBindings;
  }

  protected async getOutput(action: IActionRdfJoin): Promise<IActorRdfJoinOutputInner> {
    const dataFactory: ComunicaDataFactory = action.context.getSafe(KeysInitQuery.dataFactory);

    // Close the right stream, since its results are obtained by binding
    action.entries[1].output.bindingsStream.close();

    const sourceWrapper = getOperationSource(action.entries[1].operation)!;
    const operation = ActorRdfJoinOptionalBind.getBindOperation(action);
    const variables = ActorRdfJoinOptionalBindSource.getVariableNames(operation);
    const metadata = await action.entries[0].output.metadata();
    const context = sourceWrapper.context ? action.context.merge(sourceWrapper.context) : action.context;
    // Left bindings with the same values for the left variables of the operation have the same results
    const keyVariables = metadata.variables
      .map(({ variable }) => variable)
      .filter(variable => variables.has(variable.value));
    let unkeyedCounter = 0;
    const getKey = (binding: RDF.Bindings): string => ActorRdfJoinOptionalBindSource
      .getKey(binding, keyVariables) ?? `unkeyed:${unkeyedCounter++}`;

    // Slice the left stream into blocks of distinct keys, and join each block with the right operation in the source
    const chunks: AsyncIterator<AsyncIterator<RDF.Bindings>> = new KeyedChunkedIterator(
      action.entries[0].output.bindingsStream,
      this.blockSize,
      this.maxBlockBindings,
      getKey,
      { autoStart: false },
    );
    // A block is joined as soon as it is read, so that the blocks in the buffer are joined in parallel
    const joinChunk = (chunk: AsyncIterator<RDF.Bindings>): AsyncIterator<RDF.Bindings> => {
      const results = chunk.toArray().then(bindings => ActorRdfJoinOptionalBindSource
        .joinBlock(sourceWrapper, operation, variables, keyVariables, bindings, metadata, context, dataFactory));
      results.catch(() => {
        // Errors are emitted by the iterator once it is read
      });
      return new TransformIterator(
        async() => new ArrayIterator(await results, { autoStart: false }),
        { autoStart: false },
      );
    };
    // Blocks are only read as results are needed, so the left stream is not read far ahead, e.g., for a LIMIT
    const bindingsStream = new MultiTransformIterator(chunks, { autoStart: false, multiTransform: joinChunk });

    return {
      result: {
        type: 'bindings',
        bindingsStream,
        metadata: async() => await this.constructResultMetadata(
          action.entries,
          await ActorRdfJoin.getMetadatas(action.entries),
          action.context,
          {},
          true,
        ),
      },
    };
  }

  /**
   * Determine the names of all variables that occur in the given operation, including in expressions.
   * @param operation An operation.
   */
  public static getVariableNames(operation: Algebra.Operation): Set<string> {
    const names = new Set<string>();
    const visited = new Set<object>();
    const visit = (value: any): void => {
      if (value && typeof value === 'object' && !visited.has(value)) {
        visited.add(value);
        if (value.termType === 'Variable') {
          names.add(value.value);
        }
        for (const [ key, child ] of Object.entries(value)) {
          if (key !== 'metadata') {
            visit(child);
          }
        }
      }
    };
    visit(operation);
    return names;
  }

  /**
   * Determine the key of a binding: its values for the given variables.
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

  /**
   * Left join a block of bindings with an operation in a source.
   *
   * Bindings that bind all key variables share the results of their values for these variables,
   * so only the distinct values are passed to the source.
   * Other bindings are passed as a whole, as values that are not bound match any value in the source.
   *
   * @param sourceWrapper The source of the operation.
   * @param operation The operation.
   * @param variables The names of all variables in the operation.
   * @param keyVariables The variables of the left bindings that occur in the operation.
   * @param bindings The left bindings.
   * @param metadata The metadata of the left bindings.
   * @param context The action context.
   * @param dataFactory The data factory.
   * @return The joined bindings, and the left bindings without results.
   */
  public static async joinBlock(
    sourceWrapper: IQuerySourceWrapper,
    operation: Algebra.Operation,
    variables: Set<string>,
    keyVariables: RDF.Variable[],
    bindings: RDF.Bindings[],
    metadata: MetadataBindings,
    context: IActionContext,
    dataFactory: ComunicaDataFactory,
  ): Promise<RDF.Bindings[]> {
    const keyed: RDF.Bindings[] = [];
    const unkeyed: RDF.Bindings[] = [];
    for (const binding of bindings) {
      (ActorRdfJoinOptionalBindSource.getKey(binding, keyVariables) ? keyed : unkeyed).push(binding);
    }
    const [ keyedResults, unkeyedResults ] = await Promise.all([
      ActorRdfJoinOptionalBindSource.joinBlockOnKeys(sourceWrapper, operation, keyVariables, keyed, metadata, context),
      ActorRdfJoinOptionalBindSource
        .joinBlockOnBindings(sourceWrapper, operation, variables, unkeyed, metadata, context, dataFactory),
    ]);
    return [ ...keyedResults, ...unkeyedResults ];
  }

  /**
   * Left join a block of bindings that bind all key variables with an operation in a source,
   * by passing the distinct values of the key variables.
   *
   * Blank nodes can not be passed to a source, as their labels are scoped to the result they came from.
   * So keys with a blank node can not have results.
   *
   * @param sourceWrapper The source of the operation.
   * @param operation The operation.
   * @param keyVariables The variables of the left bindings that occur in the operation.
   * @param bindings The left bindings, which bind all key variables.
   * @param metadata The metadata of the left bindings.
   * @param context The action context.
   * @return The joined bindings, and the left bindings without results.
   */
  public static async joinBlockOnKeys(
    sourceWrapper: IQuerySourceWrapper,
    operation: Algebra.Operation,
    keyVariables: RDF.Variable[],
    bindings: RDF.Bindings[],
    metadata: MetadataBindings,
    context: IActionContext,
  ): Promise<RDF.Bindings[]> {
    const keyBindings = new Map<string, RDF.Bindings>();
    for (const binding of bindings) {
      const key = ActorRdfJoinOptionalBindSource.getKey(binding, keyVariables)!;
      if (!keyBindings.has(key) &&
        keyVariables.every(variable => binding.get(variable)!.termType !== 'BlankNode')) {
        keyBindings.set(key, binding
          .filter((_, variable) => keyVariables.some(keyVariable => keyVariable.equals(variable))));
      }
    }

    const resultsByKey = new Map<string, RDF.Bindings[]>();
    if (keyBindings.size > 0) {
      const results = await sourceWrapper.source.queryBindings(operation, context, {
        joinBindings: {
          bindings: new ArrayIterator([ ...keyBindings.values() ], { autoStart: false }),
          metadata: {
            ...metadata,
            variables: metadata.variables
              .filter(({ variable }) => keyVariables.some(keyVariable => keyVariable.equals(variable))),
          },
        },
      }).toArray();
      for (const result of results) {
        const key = ActorRdfJoinOptionalBindSource.getKey(result, keyVariables)!;
        const keyResults = resultsByKey.get(key);
        if (keyResults) {
          keyResults.push(result);
        } else {
          resultsByKey.set(key, [ result ]);
        }
      }
    }

    return bindings.flatMap((binding) => {
      const results = resultsByKey.get(ActorRdfJoinOptionalBindSource.getKey(binding, keyVariables)!);
      return results ? results.map(result => binding.merge(result)!) : [ binding ];
    });
  }

  /**
   * Left join a block of bindings with an operation in a source, by passing the bindings as a whole.
   *
   * Blank nodes can not be passed to a source, as their labels are scoped to the result they came from.
   * So bindings with a blank node for a variable of the operation can not have results.
   * Blank nodes for other variables are passed as IRIs, and restored in the results.
   *
   * @param sourceWrapper The source of the operation.
   * @param operation The operation.
   * @param variables The names of all variables in the operation.
   * @param bindings The left bindings.
   * @param metadata The metadata of the left bindings.
   * @param context The action context.
   * @param dataFactory The data factory.
   * @return The joined bindings, and the left bindings without results.
   */
  public static async joinBlockOnBindings(
    sourceWrapper: IQuerySourceWrapper,
    operation: Algebra.Operation,
    variables: Set<string>,
    bindings: RDF.Bindings[],
    metadata: MetadataBindings,
    context: IActionContext,
    dataFactory: ComunicaDataFactory,
  ): Promise<RDF.Bindings[]> {
    const blankNodes = new Map<string, RDF.Term>();
    const joinBindings: RDF.Bindings[] = [];
    for (const binding of bindings) {
      const isBlankNodeBound = [ ...binding ]
        .some(([ variable, term ]) => term.termType === 'BlankNode' && variables.has(variable.value));
      if (!isBlankNodeBound) {
        joinBindings.push(binding.map((term) => {
          if (term.termType !== 'BlankNode') {
            return term;
          }
          const iri = `${ActorRdfJoinOptionalBindSource.BLANK_NODE_IRI_PREFIX}${blankNodes.size}`;
          blankNodes.set(iri, term);
          return dataFactory.namedNode(iri);
        }));
      }
    }

    let results: RDF.Bindings[] = [];
    if (joinBindings.length > 0) {
      results = await sourceWrapper.source.queryBindings(
        operation,
        context,
        { joinBindings: { bindings: new ArrayIterator(joinBindings, { autoStart: false }), metadata }},
      ).toArray();
      if (blankNodes.size > 0) {
        results = results.map(result => result
          .map(term => (term.termType === 'NamedNode' ? blankNodes.get(term.value) : undefined) ?? term));
      }
    }

    // Results contain the values of the left bindings, so the left bindings without results are those that no
    // result agrees with.
    const unmatched = bindings.filter(binding => !results
      .some(result => [ ...binding ].every(([ variable, term ]) => result.get(variable)?.equals(term))));
    return [ ...results, ...unmatched ];
  }

  public async getJoinCoefficients(
    action: IActionRdfJoin,
    sideData: IActorRdfJoinTestSideData,
  ): Promise<TestResult<IMediatorTypeJoinCoefficients, IActorRdfJoinTestSideData>> {
    const { metadatas } = sideData;

    // The right operation must have a source that accepts bindings for it
    const sourceWrapper = getOperationSource(action.entries[1].operation);
    if (!sourceWrapper) {
      return failTest(`Actor ${this.name} can only bind on a right operation with a source annotation`);
    }
    const operation = ActorRdfJoinOptionalBind.getBindOperation(action);
    const selectorShape = await getSourceSelectorShape(sourceWrapper, action.context);
    if (!doesShapeAcceptOperationInContext(selectorShape, operation, action.context, { joinBindings: true })) {
      return failTest(`Actor ${this.name} detected a source that can not handle passing down join bindings`);
    }
    if (!ActorRdfJoinMultiBind.canBindWithOperation(operation, inScopeVariables(action.entries[0].operation))) {
      return failTest(`Actor ${this.name} can not bind on Extend, Group, or conflicting LeftJoin/Minus operations`);
    }
    // The source evaluates the expression before joining with the left bindings, so it must not use their variables
    if (action.expression) {
      const expressionVariables = ActorRdfJoinOptionalBindSource.getVariableNames(action.expression);
      if (metadatas[0].variables.some(({ variable }) => expressionVariables.has(variable.value))) {
        return failTest(`Actor ${this.name} can not bind with an expression over variables of the left entry`);
      }
    }

    const requestInitialTimes = ActorRdfJoin.getRequestInitialTimes(metadatas);
    const requestItemTimes = ActorRdfJoin.getRequestItemTimes(metadatas);
    const selectivity = (await this.mediatorJoinSelectivity.mediate({
      entries: action.entries,
      context: action.context,
    })).selectivity * this.selectivityModifier;

    // As the optional bind join, but with one request per block of left bindings
    return passTestWithSideData({
      iterations: metadatas[0].cardinality.value * metadatas[1].cardinality.value * selectivity / this.blockSize,
      persistedItems: 0,
      blockingItems: 0,
      requestTime: requestInitialTimes[0] +
        metadatas[0].cardinality.value * (
          requestItemTimes[0] +
          (requestInitialTimes[1] + selectivity * metadatas[1].cardinality.value * requestItemTimes[1]) /
          this.blockSize
        ),
    }, sideData);
  }
}

export interface IActorRdfJoinOptionalBindSourceArgs extends IActorRdfJoinArgs {
  /**
   * Multiplier for selectivity values
   * @range {double}
   * @default {0.000001}
   */
  selectivityModifier: number;
  /**
   * The maximum amount of distinct values of the left bindings for the variables of the right operation
   * to send to the source per request.
   * @default {16}
   */
  blockSize: number;
  /**
   * The maximum amount of left bindings per request, which may share their values for these variables.
   * @default {1024}
   */
  maxBlockBindings: number;
}
