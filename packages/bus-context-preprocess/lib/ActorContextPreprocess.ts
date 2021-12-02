import type { ActionContext, IAction, IActorArgs, IActorOutput, IActorTest, Mediator } from '@comunica/core';
import { Actor } from '@comunica/core';

/**
 * A comunica actor for context-preprocess events.
 *
 * Actor types:
 * * Input:  IAction:      A context that will be processed.
 * * Test:   <none>
 * * Output: IActorContextPreprocessOutput: The resulting context.
 *
 * @see IActionContextPreprocess
 * @see IActorContextPreprocessOutput
 */
export abstract class ActorContextPreprocess
  extends Actor<IAction, IActorTest, IActorContextPreprocessOutput> {
  /**
   * @param args - @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   */
  public constructor(args: IActorContextPreprocessArgs) {
    super(args);
  }
}

export interface IActorContextPreprocessOutput extends IActorOutput {
  /**
   * A context object.
   * Can be null.
   */
  context?: ActionContext;
}

export type IActorContextPreprocessArgs = IActorArgs<IAction, IActorTest, IActorContextPreprocessOutput>;

export type MediatorContextPreprocess = Mediator<
Actor<IAction, IActorTest, IActorContextPreprocessOutput>,
IAction, IActorTest, IActorContextPreprocessOutput>;
