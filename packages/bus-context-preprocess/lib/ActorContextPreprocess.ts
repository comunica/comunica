import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import { Actor } from '@comunica/core';
import type { IActionContext } from '@comunica/types';

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
  context: IActionContext;
}

export type IActorContextPreprocessArgs = IActorArgs<IAction, IActorTest, IActorContextPreprocessOutput>;

export type MediatorContextPreprocess = Mediate<IAction, IActorContextPreprocessOutput>;
