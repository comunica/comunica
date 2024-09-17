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
export abstract class ActorHttpInvalidate<TS = undefined>
  extends Actor<IActionHttpInvalidate, IActorTest, IActorHttpInvalidateOutput, TS> {
  /* eslint-disable max-len */
  /**
   * @param args -
   *   \ @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   *   \ @defaultNested {HTTP invalidation failed: none of the configured actors were able to invalidate ${action.url}} busFailMessage
   */
  /* eslint-enable max-len */
  public constructor(args: IActorHttpInvalidateArgs<TS>) {
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

export type IActorHttpInvalidateArgs<TS = undefined> =
  IActorArgs<IActionHttpInvalidate, IActorTest, IActorHttpInvalidateOutput, TS>;

export type MediatorHttpInvalidate = Mediate<IActionHttpInvalidate, IActorHttpInvalidateOutput>;
