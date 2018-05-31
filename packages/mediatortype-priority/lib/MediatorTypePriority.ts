import {IActorTest} from "@comunica/core";

/**
 * A mediator type that has a priority parameter.
 */
export interface IMediatorTypePriority extends IActorTest {
  /**
   * A certain amount of priority, going from 0 to 1.
   */
  priority?: number;
}
