import type { IActionContextKey } from '../IActionContext';

/**
 * Interface that holds all tracked statistics
 */
export interface IStatisticsHolder {
  set: <V>(key: IActionContextKey<V>, value: V) => void;
  delete: <V>(key: IActionContextKey<V>) => void;
  get: <V>(key: IActionContextKey<V>) => V | undefined;
  has: <V>(key: IActionContextKey<V>) => boolean;
  keys: () => IActionContextKey<any>[];
}
