import { ActorRdfJoinOptionalBind } from '@comunica/actor-rdf-join-optional-bind';
import { ActorRdfJoinOptionalBindSource } from '@comunica/actor-rdf-join-optional-bind-source';
import { KeyedChunkedIterator } from '@comunica/actor-rdf-join-optional-bind-source/lib/KeyedChunkedIterator';
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
import type { ComunicaDataFactory } from '@comunica/types';
import type { Algebra } from '@comunica/utils-algebra';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { getOperationSource, getSafeBindings } from '@comunica/utils-query-operation';
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
    const chunks: AsyncIterator<AsyncIterator<RDF.Bindings>> = new KeyedChunkedIterator(
      action.entries[0].output.bindingsStream,
      this.blockSize,
      this.maxBlockBindings,
      binding => ActorRdfJoinOptionalBindBlock.getProjectionKey(binding, keyVariables),
      { autoStart: false },
    );
    // A block is joined as soon as it is read, so that the blocks in the buffer are joined in parallel
    const joinChunk = (chunk: AsyncIterator<RDF.Bindings>): AsyncIterator<RDF.Bindings> => {
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
   * Blank nodes can not be passed in VALUES, as their labels are scoped to the result they came from.
   * So bindings with a blank node for a key variable can not have results.
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
    bindings: RDF.Bindings[],
    algebraFactory: AlgebraFactory,
    dataFactory: ComunicaDataFactory,
  ): Promise<RDF.Bindings[]> {
    const rowVariable = dataFactory.variable(ActorRdfJoinOptionalBindBlock.ROW_VARIABLE);
    const rows = new Map<string, Record<string, RDF.NamedNode | RDF.Literal>>();
    for (const binding of bindings) {
      const key = ActorRdfJoinOptionalBindBlock.getProjectionKey(binding, keyVariables);
      const terms = keyVariables
        .map(variable => <[ RDF.Variable, RDF.Term | undefined ]> [ variable, binding.get(variable) ]);
      if (!rows.has(key) && terms.every(([ _, term ]) => term?.termType !== 'BlankNode')) {
        const row: Record<string, RDF.NamedNode | RDF.Literal> = {
          [rowVariable.value]: dataFactory.literal(`${rows.size}`),
        };
        for (const [ variable, term ] of terms) {
          if (term) {
            row[variable.value] = <RDF.NamedNode | RDF.Literal> term;
          }
        }
        rows.set(key, row);
      }
    }

    const resultsByRow = new Map<string, RDF.Bindings[]>();
    if (rows.size > 0) {
      let operation: Algebra.Operation = algebraFactory.createJoin([
        algebraFactory.createValues([ ...keyVariables, rowVariable ], [ ...rows.values() ]),
        action.entries[1].operation,
      ]);
      if (action.expression) {
        operation = algebraFactory.createFilter(operation, action.expression);
      }
      const results = await getSafeBindings(await this.mediatorQueryOperation
        .mediate({ operation, context: action.context })).bindingsStream.toArray();
      for (const result of results) {
        const row = result.get(rowVariable)!.value;
        const rowResults = resultsByRow.get(row);
        const cleanResult = result.delete(rowVariable);
        if (rowResults) {
          rowResults.push(cleanResult);
        } else {
          resultsByRow.set(row, [ cleanResult ]);
        }
      }
    }

    return bindings.flatMap((binding) => {
      const row = rows.get(ActorRdfJoinOptionalBindBlock.getProjectionKey(binding, keyVariables));
      const results = row ? resultsByRow.get(row[rowVariable.value].value) : undefined;
      return results ? results.map(result => binding.merge(result)!) : [ binding ];
    });
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
