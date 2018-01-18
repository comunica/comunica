import {Actor, IAction, IActorArgs, IActorOutput, IActorTest} from "@comunica/core";
import {Agent} from "http";

/**
 * A base actor for listening to HTTP events.
 *
 * Actor types:
 * * Input:  IActionHttp:      The HTTP request.
 * * Test:   IActorHttpTest:   An estimate for the response time.
 * * Output: IActorHttpOutput: The HTTP response.
 *
 * @see IActionHttp
 * @see IActorHttpTest
 * @see IActorHttpOutput
 */
export abstract class ActorHttp extends Actor<IActionHttp, IActorTest, IActorHttpOutput> {

  constructor(args: IActorArgs<IActionHttp, IActorTest, IActorHttpOutput>) {
    super(args);
  }

}

/**
 * The HTTP input, which contains the HTTP request.
 */
export interface IActionHttp extends IAction {
  input: RequestInfo;
  init?: RequestInit;
}

/**
 * The HTTP output, which contains the HTTP response.
 */
export interface IActorHttpOutput extends IActorOutput, Response {

}
