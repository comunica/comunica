import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import { Actor } from '@comunica/core';
import type { QueryFormatType, IQueryExplained, IActionContext, IQueryOperationResult } from '@comunica/types';
import type { Algebra } from 'sparqlalgebrajs';

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
export abstract class ActorQueryProcess extends Actor<IActionQueryProcess, IActorTest, IActorQueryProcessOutput> {
  /**
   * @param args - @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   */
  public constructor(args: IActorQueryProcessArgs) {
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

export type IActorQueryProcessArgs = IActorArgs<
IActionQueryProcess,
IActorTest,
IActorQueryProcessOutput
>;

export type MediatorQueryProcess = Mediate<
IActionQueryProcess,
IActorQueryProcessOutput
>;

export interface IQueryProcessSequential {
  parse: (query: QueryFormatType, context: IActionContext) => Promise<IQueryProcessSequentialOutput>;
  optimize: (operation: Algebra.Operation, context: IActionContext) => Promise<IQueryProcessSequentialOutput>;
  evaluate: (operation: Algebra.Operation, context: IActionContext) => Promise<IQueryOperationResult>;
}

export interface IQueryProcessSequentialOutput {
  operation: Algebra.Operation;
  context: IActionContext;
}
