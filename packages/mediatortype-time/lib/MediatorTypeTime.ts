import {IActorTest} from "@comunica/core";

/**
 * A mediator type that has a time parameter.
 */
export interface IMediatorTypeTime extends IActorTest {
  /**
   * A certain amount of time, expressed in milliseconds.
   */
  time?: number;
}
