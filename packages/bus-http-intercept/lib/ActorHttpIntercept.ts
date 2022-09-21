import type { IActionHttp, IActorHttpOutput } from '@comunica/bus-http';
import type { IActorArgs, IActorTest, Mediate } from '@comunica/core';
import { Actor } from '@comunica/core';

/**
 * A comunica actor for http-intercept events.
 *
 * Actor types:
 * * Input:  IActionHttp:      The HTTP request.
 * * Test:   IActorHttpTest:   An estimate for the response time.
 * * Output: IActorHttpOutput: The HTTP response.
 *
 * @see IActionHttp
 * @see IActorHttpTest
 * @see IActorHttpOutput
 *
 * @see IActionHttpIntercept
 * @see IActorHttpInterceptOutput
 */
export abstract class ActorHttpIntercept extends Actor<IActionHttpIntercept, IActorTest, IActorHttpInterceptOutput> {
  /**
  * @param args - @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
  */
  public constructor(args: IActorHttpInterceptArgs) {
    super(args);
  }
}

export interface IActionHttpIntercept extends IActionHttp {

}

export interface IActorHttpInterceptOutput extends IActorHttpOutput {

}

export type IActorHttpInterceptArgs = IActorArgs<
IActionHttpIntercept, IActorTest, IActorHttpInterceptOutput>;

export type MediatorHttpIntercept = Mediate<
IActionHttpIntercept, IActorHttpInterceptOutput>;
