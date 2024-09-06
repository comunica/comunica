/**
 * Statistics are able to track specific types of information during query execution.
 * It is possible to listen to events that are produced by each specific statistic.
 */
export interface IStatisticBase<T> {
  /**
   * Attaches a listener to the statistic to listen for new statistic events
   * @param fn Callback to use the statistic data
   * @returns
   */
  on: (fn: (data: T) => any) => IStatisticBase<T>;

  /**
   * Removes a listener from the statistic
   * @param fn Callback to remove
   * @returns
   */
  removeListener: (fn: (data: T) => any) => IStatisticBase<T>;

  /**
   * Emits a new statistic event to all listeners
   * @param data Statistic data to emit
   * @returns
   */
  emit: (data: T) => boolean;

  /**
   * @returns All listeners on statistic
   */
  getListeners: () => ((data: T) => any)[];

  /**
   * Updates the statistic with new information from query processing
   * @param data Statistic data to process
   * @returns
   */
  updateStatistic: (...data: any[]) => void;
}
