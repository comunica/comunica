import type { IActorTest } from '@comunica/core';

/**
 * A mediator type that has a accuracy parameter.
 */
export interface IMediatorTypeAccuracy extends IActorTest {
  /**
   * An factor for the selectivity in the range [0, 1].
   * Lower values are more heuristic-based,
   * and higher values are more statistics-based.
   * A value of 0 indicates a random guess,
   * and a value of 1 indicates a certainty.
   */
  accuracy?: number;
}
