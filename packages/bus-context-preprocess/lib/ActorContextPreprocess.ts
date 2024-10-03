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
export abstract class ActorContextPreprocess<TS = undefined>
  extends Actor<IActionContextPreprocess, IActorTest, IActorContextPreprocessOutput, TS> {
  /**
   * @param args -
   *   \ @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   *   \ @defaultNested {Context preprocessing failed} busFailMessage
   */
  public constructor(args: IActorContextPreprocessArgs<TS>) {
    super(args);
  }
}

export interface IActionContextPreprocess extends IAction {
  /**
   * If the query processing is being initialized.
   * This is typically used for setting query-wide defaults.
   * This will be false for initializing source-specific contexts.
   */
  initialize?: boolean;
}

export interface IActorContextPreprocessOutput extends IActorOutput {
  /**
   * A context object.
   * Can be null.
   */
  context: IActionContext;
}

export type IActorContextPreprocessArgs<TS = undefined> = IActorArgs<
IActionContextPreprocess,
IActorTest,
IActorContextPreprocessOutput,
TS
>;

export type MediatorContextPreprocess = Mediate<IActionContextPreprocess, IActorContextPreprocessOutput>;
