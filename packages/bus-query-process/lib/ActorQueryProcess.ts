import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import { Actor } from '@comunica/core';
import type { QueryFormatType, IQueryExplained, IActionContext, IQueryOperationResult } from '@comunica/types';
import type { Algebra } from '@comunica/utils-algebra';

/**
 * A comunica actor for query-process events.
 *
 * Actor types:
 * * Input:  IActionQueryProcess:      The input query to process.
 * * Test:   <none>
 * * Output: IActorQueryProcessOutput: Output of the query processing.
 *
 * @see IActionQueryProcess
 * @see IActorQueryProcessOutput
 */
export abstract class ActorQueryProcess<TS = undefined>
  extends Actor<IActionQueryProcess, IActorTest, IActorQueryProcessOutput, TS> {
  /* eslint-disable max-len */
  /**
   * @param args -
   *   \ @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   *   \ @defaultNested {Query processing failed: none of the configured actor were process to the query "${action.query}"} busFailMessage
   */
  /* eslint-enable max-len */
  public constructor(args: IActorQueryProcessArgs<TS>) {
    super(args);
  }
}

export interface IActionQueryProcess extends IAction {
  /**
   * The query to process.
   */
  query: QueryFormatType;
}

export interface IActorQueryProcessOutput extends IActorOutput {
  /**
   * Result of the query processing.
   */
  result: IQueryOperationResult | IQueryExplained;
}

/**
 * Constructor arguments for {@link ActorQueryProcess}.
 */
export type IActorQueryProcessArgs<TS = undefined> = IActorArgs<
IActionQueryProcess,
IActorTest,
IActorQueryProcessOutput,
TS
>;

/**
 * A mediator type for query process actors.
 */
export type MediatorQueryProcess = Mediate<
IActionQueryProcess,
IActorQueryProcessOutput
>;

/**
 * Defines sequential steps for query processing.
 */
export interface IQueryProcessSequential {
  /**
   * Parses a query into an algebra operation.
   * @param query The query to parse.
   * @param context The action context.
   * @return The parsed output containing the operation and updated context.
   */
  parse: (query: QueryFormatType, context: IActionContext) => Promise<IQueryProcessSequentialOutput>;
  /**
   * Optimizes a query algebra operation.
   * @param operation The algebra operation to optimize.
   * @param context The action context.
   * @return The optimized output containing the operation and updated context.
   */
  optimize: (operation: Algebra.Operation, context: IActionContext) => Promise<IQueryProcessSequentialOutput>;
  /**
   * Evaluates a query algebra operation.
   * @param operation The algebra operation to evaluate.
   * @param context The action context.
   * @return The query operation result.
   */
  evaluate: (operation: Algebra.Operation, context: IActionContext) => Promise<IQueryOperationResult>;
}

/**
 * Output of a sequential query processing step.
 */
export interface IQueryProcessSequentialOutput {
  /**
   * The resulting algebra operation.
   */
  operation: Algebra.Operation;
  /**
   * The updated action context.
   */
  context: IActionContext;
}
