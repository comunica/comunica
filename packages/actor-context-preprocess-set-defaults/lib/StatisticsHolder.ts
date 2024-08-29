import { ActionContextKey } from '@comunica/core';
import type { IActionContextKey, IStatisticsHolder } from '@comunica/types';

/**
 * A mutable map wrapper that uses ActionContextKeys as keys.
 */
export class StatisticsHolder implements IStatisticsHolder {
  private readonly map: Map<string, any>;

  public constructor(data?: (string | any)[]) {
    this.map = new Map(data);
  }

  public set<V>(key: IActionContextKey<V>, value: V): void {
    this.map.set(key.name, value);
  };

  public delete<V>(key: IActionContextKey<V>): void {
    this.map.delete(key.name);
  }

  public get<V>(key: IActionContextKey<V>): V | undefined {
    return this.map.get(key.name);
  }

  public has<V>(key: IActionContextKey<V>): boolean {
    return this.map.has(key.name);
  }

  public keys(): IActionContextKey<any>[] {
    return [ ...<any> this.map.keys() ]
      .map(keyName => new ActionContextKey(keyName));
  }
}
