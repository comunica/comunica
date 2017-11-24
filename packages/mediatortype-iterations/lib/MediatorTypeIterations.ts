import {IActorTest} from "@comunica/core";

/**
 * A mediator type that has an iterations parameter.
 */
export interface IMediatorTypeIterations extends IActorTest {
  /**
   * How many iterations are estimated to be executed.
   */
  iterations?: number;
}
