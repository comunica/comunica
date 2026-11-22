import { ActorRdfJoinOptionalBind } from '@comunica/actor-rdf-join-optional-bind';
import { ActorRdfJoinOptionalBindSource } from '@comunica/actor-rdf-join-optional-bind-source';
import type { MediatorQueryOperation } from '@comunica/bus-query-operation';
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
import type { Bindings, ComunicaDataFactory, IActionContext } from '@comunica/types';
import { Algebra, AlgebraFactory } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { KeyedChunkedIterator } from '@comunica/utils-iterator';
import { getOperationSource, getSafeBindings, materializeOperation } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { ArrayIterator, MultiTransformIterator, TransformIterator } from 'asynciterator';
import { termToString } from 'rdf-string';

/**
 * A comunica Optional Bind Block RDF Join Actor.
 *
 * It joins blocks of left bindings with the right operation, as an inner join of the right operation with VALUES
 * that is planned like any other join, and adds the left bindings without results.
 * This allows the join to pass blocks of bindings to the sources of a right operation over multiple sources,
 * instead of evaluating it once per left binding, as the optional bind join does.
 * Left bindings with the same values for the variables of the right operation share their results.
 */
export class ActorRdfJoinOptionalBindBlock extends ActorRdfJoin {
  public readonly mediatorQueryOperation: MediatorQueryOperation;
  public readonly selectivityModifier: number;
  public readonly blockSize: number;
  public readonly maxBlockBindings: number;

  public constructor(args: IActorRdfJoinOptionalBindBlockArgs) {
    super(args, {
      logicalType: 'optional',
      physicalName: 'bind-block',
      limitEntries: 2,
      canHandleUndefs: true,
      requiresVariableOverlap: true,
      canHandleExpression: true,
    });
    this.mediatorQueryOperation = args.mediatorQueryOperation;
    this.selectivityModifier = args.selectivityModifier;
    this.blockSize = args.blockSize;
    this.maxBlockBindings = args.maxBlockBindings;
  }

  protected async getOutput(action: IActionRdfJoin): Promise<IActorRdfJoinOutputInner> {
    const dataFactory: ComunicaDataFactory = action.context.getSafe(KeysInitQuery.dataFactory);
    const algebraFactory = new AlgebraFactory(dataFactory);

    // Close the right stream, since its results are obtained per block
    action.entries[1].output.bindingsStream.close();

    // The variables of the left bindings that occur in the right operation or the expression
    const variables = ActorRdfJoinOptionalBindSource
      .getVariableNames(ActorRdfJoinOptionalBind.getBindOperation(action));
    const keyVariables = (await action.entries[0].output.metadata()).variables
      .map(({ variable }) => variable)
      .filter(variable => variables.has(variable.value));

    // Slice the left stream into blocks of distinct keys, and join each block with the right operation
    const chunks: AsyncIterator<AsyncIterator<Bindings>> = new KeyedChunkedIterator(
      action.entries[0].output.bindingsStream,
      this.blockSize,
      this.maxBlockBindings,
      binding => ActorRdfJoinOptionalBindBlock.getProjectionKey(binding, keyVariables),
      { autoStart: false },
    );
    // A block is joined as soon as it is read, so that the blocks in the buffer are joined in parallel
    const joinChunk = (chunk: AsyncIterator<Bindings>): AsyncIterator<Bindings> => {
      const results = chunk.toArray()
        .then(bindings => this.joinBlock(action, keyVariables, bindings, algebraFactory, dataFactory));
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
   * Determine the key of a binding: its values for the given variables, of which some may be unbound.
   * @param binding A binding.
   * @param keyVariables The variables of the key.
   */
  public static getProjectionKey(binding: RDF.Bindings, keyVariables: RDF.Variable[]): string {
    return JSON.stringify(keyVariables.map((variable) => {
      const term = binding.get(variable);
      return term ? termToString(term) : null;
    }));
  }

  /**
   * Left join a block of bindings with the right operation.
   *
   * The distinct values of the bindings for the key variables are joined with the right operation as VALUES,
   * each with a row number, so that results can be assigned to the rows that produced them,
   * even if a row with unbound values produces results that agree with another row.
   *
   * Blank nodes can not be passed in VALUES, so bindings with a blank node for a key variable
   * are bound into the right operation one by one instead, as by the optional bind join.
   *
   * @param action The join action.
   * @param keyVariables The variables of the left bindings that occur in the right operation or the expression.
   * @param bindings The left bindings.
   * @param algebraFactory The algebra factory.
   * @param dataFactory The data factory.
   * @return The joined bindings, and the left bindings without results.
   */
  public async joinBlock(
    action: IActionRdfJoin,
    keyVariables: RDF.Variable[],
    bindings: Bindings[],
    algebraFactory: AlgebraFactory,
    dataFactory: ComunicaDataFactory,
  ): Promise<Bindings[]> {
    const rowVariable = dataFactory.variable(ActorRdfJoinOptionalBindBlock.ROW_VARIABLE);
    const keys = new Set<string>();
    const rowKeys: string[] = [];
    const rows: Record<string, RDF.NamedNode | RDF.Literal>[] = [];
    const blankNodeBindings: [ string, Bindings ][] = [];
    for (const binding of bindings) {
      const key = ActorRdfJoinOptionalBindBlock.getProjectionKey(binding, keyVariables);
      if (!keys.has(key)) {
        keys.add(key);
        if (keyVariables.some(variable => binding.get(variable)?.termType === 'BlankNode')) {
          blankNodeBindings.push([ key, binding ]);
        } else {
          const row: Record<string, RDF.NamedNode | RDF.Literal> = {
            [rowVariable.value]: dataFactory.literal(`${rows.length}`),
          };
          for (const variable of keyVariables) {
            const term = binding.get(variable);
            if (term) {
              row[variable.value] = <RDF.NamedNode | RDF.Literal> term;
            }
          }
          rowKeys.push(key);
          rows.push(row);
        }
      }
    }

    const resultsByKey = new Map<string, Bindings[]>();
    const addResult = (key: string, result: Bindings): void => {
      const keyResults = resultsByKey.get(key);
      if (keyResults) {
        keyResults.push(result);
      } else {
        resultsByKey.set(key, [ result ]);
      }
    };
    const evaluations: Promise<void>[] = [];
    if (rows.length > 0) {
      // The block is joined with each branch of a union, so that each branch with a single source receives it at once
      const values = algebraFactory.createValues([ ...keyVariables, rowVariable ], rows);
      const right = action.entries[1].operation;
      let operation: Algebra.Operation = right.type === Algebra.Types.UNION ?
        algebraFactory.createUnion((<Algebra.Union> right).input
          .map(branch => algebraFactory.createJoin([ values, branch ]))) :
        algebraFactory.createJoin([ values, right ]);
      if (action.expression) {
        operation = algebraFactory.createFilter(operation, action.expression);
      }
      evaluations.push(this.evaluate(operation, action.context).then((results) => {
        for (const result of results) {
          addResult(rowKeys[Number.parseInt(result.get(rowVariable)!.value, 10)], result.delete(rowVariable));
        }
      }));
    }
    if (blankNodeBindings.length > 0) {
      const bindOperation = ActorRdfJoinOptionalBind.getBindOperation(action);
      const bindingsFactory = new BindingsFactory(dataFactory);
      for (const [ key, binding ] of blankNodeBindings) {
        const operation = materializeOperation(bindOperation, binding, algebraFactory, bindingsFactory, {
          bindFilter: true,
        });
        evaluations.push(this.evaluate(operation, action.context).then((results) => {
          for (const result of results) {
            addResult(key, result);
          }
        }));
      }
    }
    await Promise.all(evaluations);

    return bindings.flatMap((binding) => {
      const joined = (resultsByKey.get(ActorRdfJoinOptionalBindBlock.getProjectionKey(binding, keyVariables)) ?? [])
        .map(result => binding.merge(result))
        .filter((result): result is Bindings => result !== undefined);
      return joined.length > 0 ? joined : [ binding ];
    });
  }

  /**
   * Evaluate an operation into an array of bindings.
   * @param operation An operation.
   * @param context The action context.
   */
  protected async evaluate(operation: Algebra.Operation, context: IActionContext): Promise<Bindings[]> {
    return await getSafeBindings(await this.mediatorQueryOperation.mediate({ operation, context }))
      .bindingsStream.toArray();
  }

  public async getJoinCoefficients(
    action: IActionRdfJoin,
    sideData: IActorRdfJoinTestSideData,
  ): Promise<TestResult<IMediatorTypeJoinCoefficients, IActorRdfJoinTestSideData>> {
    const { metadatas } = sideData;

    // A right operation over a single source is passed blocks directly by the optional bind source join
    if (getOperationSource(action.entries[1].operation)) {
      return failTest(`Actor ${this.name} can only join a right operation without a single source annotation`);
    }

    const requestInitialTimes = ActorRdfJoin.getRequestInitialTimes(metadatas);
    const requestItemTimes = ActorRdfJoin.getRequestItemTimes(metadatas);
    const selectivity = (await this.mediatorJoinSelectivity.mediate({
      entries: action.entries,
      context: action.context,
    })).selectivity * this.selectivityModifier;

    // As the optional bind source join, but a block is planned and may be sent to multiple sources
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

  /**
   * The variable that numbers the rows of a block, which is removed from the results.
   */
  public static readonly ROW_VARIABLE = '__comunica_optional_bind_block_row';
}

export interface IActorRdfJoinOptionalBindBlockArgs extends IActorRdfJoinArgs {
  /**
   * The query operation mediator
   */
  mediatorQueryOperation: MediatorQueryOperation;
  /**
   * Multiplier for selectivity values
   * @range {double}
   * @default {0.000001}
   */
  selectivityModifier: number;
  /**
   * The maximum amount of distinct values of the left bindings for the variables of the right operation per block.
   * @default {64}
   */
  blockSize: number;
  /**
   * The maximum amount of left bindings per block, which may share their values for these variables.
   * @default {1024}
   */
  maxBlockBindings: number;
}
