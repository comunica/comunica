import {Actor, IAction, IActorArgs, IActorOutput, IActorTest} from "@comunica/core";

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

  constructor(args: IActorArgs<IActionContextPreprocess, IActorTest, IActorContextPreprocessOutput>) {
    super(args);
  }

}

export interface IActionContextPreprocess extends IAction {
  /**
   * A context object.
   * Can be null.
   */
  context?: {[id: string]: any};
}

export interface IActorContextPreprocessOutput extends IActorOutput {
  /**
   * A context object.
   * Can be null.
   */
  context?: {[id: string]: any};
}
