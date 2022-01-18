import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import { Actor } from '@comunica/core';

/**
 * A comunica actor for http-invalidate events.
 *
 * Actor types:
 * * Input:  IActionHttpInvalidate:      An action for invalidating the cached contents of given URL.
 * * Test:   <none>
 * * Output: IActorHttpInvalidateOutput: An empty response.
 *
 * @see IActionHttpInvalidate
 * @see IActorHttpInvalidateOutput
 */
export abstract class ActorHttpInvalidate extends Actor<IActionHttpInvalidate, IActorTest, IActorHttpInvalidateOutput> {
  /**
   * @param args - @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   */
  public constructor(args: IActorHttpInvalidateArgs) {
    super(args);
  }
}

export interface IActionHttpInvalidate extends IAction {
  /**
   * The URL that requires invalidation.
   * If not provided, then _all_ URLs need to be invalidated.
   */
  url?: string;
}

export interface IActorHttpInvalidateOutput extends IActorOutput {

}

export type IActorHttpInvalidateArgs = IActorArgs<IActionHttpInvalidate, IActorTest, IActorHttpInvalidateOutput>;

export type MediatorHttpInvalidate = Mediate<IActionHttpInvalidate, IActorHttpInvalidateOutput>;
