import {IActorTest} from "@comunica/core";

/**
 * A mediator type that has a httpRequests parameter.
 */
export interface IMediatorTypeHttpRequests extends IActorTest {
  /**
   * An estimation of a number of HTTP requests.
   */
  httpRequests?: number;
}
