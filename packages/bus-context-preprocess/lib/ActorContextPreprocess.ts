import type { ActionContext, IAction, IActorArgs, IActorOutput, IActorTest } from '@comunica/core';
import { Actor } from '@comunica/core';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica actor for context-preprocess events.
 *
 * Actor types:
 * * Input:  IActionContextPreprocess:      A context that will be processed.
 * * Test:   <none>
 * * Output: IActorContextPreprocessOutput: The resulting context.
 *
 * @see IActionContextPreprocess
 * @see IActorContextPreprocessOutput
 */
export abstract class ActorContextPreprocess
  extends Actor<IActionContextPreprocess, IActorTest, IActorContextPreprocessOutput> {
  public constructor(args: IActorArgs<IActionContextPreprocess, IActorTest, IActorContextPreprocessOutput>) {
    super(args);
  }
}

export interface IActionContextPreprocess extends IAction {
  /**
   * The operation that is being handled.
   */
  operation?: Algebra.Operation;
}

export interface IActorContextPreprocessOutput extends IActorOutput {
  /**
   * A context object.
   * Can be null.
   */
  context?: ActionContext;
}
