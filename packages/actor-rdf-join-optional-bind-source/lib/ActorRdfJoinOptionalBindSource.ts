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
import { ChunkedIterator } from '@comunica/utils-iterator';
import {
  doesShapeAcceptOperationInContext,
  getOperationSource,
  getSourceSelectorShape,
} from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { ArrayIterator, MultiTransformIterator, TransformIterator } from 'asynciterator';

/**
 * A comunica Optional Bind Source RDF Join Actor.
 * It sends blocks of left bindings to the source of the right operation, and adds the left bindings without results.
 */
export class ActorRdfJoinOptionalBindSource extends ActorRdfJoin {
  public static readonly BLANK_NODE_IRI_PREFIX = 'urn:comunica:optional-bind-source:blank-node:';

  public readonly selectivityModifier: number;
  public readonly blockSize: number;

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

    // Slice the left stream into blocks, and join each block with the right operation in the source
    const chunks: AsyncIterator<AsyncIterator<RDF.Bindings>> = new ChunkedIterator(
      action.entries[0].output.bindingsStream,
      this.blockSize,
      { autoStart: false },
    );
    const joinChunk = (chunk: AsyncIterator<RDF.Bindings>): AsyncIterator<RDF.Bindings> =>
      new TransformIterator(async() => new ArrayIterator(
        await ActorRdfJoinOptionalBindSource
          .joinBlock(sourceWrapper, operation, variables, await chunk.toArray(), metadata, context, dataFactory),
        { autoStart: false },
      ), { autoStart: false });
    // Blocks are joined as results are needed, so the left stream is not read ahead, e.g., for a LIMIT
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
   * Left join a block of bindings with an operation in a source.
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
  public static async joinBlock(
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
   * The maximum amount of left bindings to send to the source per request.
   * @default {16}
   */
  blockSize: number;
}
