import type { IActorTest } from '@comunica/core';

/**
 * A mediator type that has an iterations parameter.
 */
export interface IMediatorTypeJoinCoefficients extends IActorTest {
  /**
   * An estimation of how many iterations over items are executed.
   * This is used to determine the CPU cost.
   */
  iterations: number;
  /**
   * An estimation of how many items are stored in memory.
   * This is used to determine the memory cost.
   */
  persistedItems: number;
  /**
   * An estimation of how many items block the stream.
   * This is used to determine the time the stream is not progressing anymore.
   */
  blockingItems: number;
  /**
   * An estimation of the time to request items from sources.
   * This estimation can be based on the `cardinality`, `pageSize`, and `requestTime` metadata entries.
   * This is used to determine the I/O cost.
   */
  requestTime: number;
}
