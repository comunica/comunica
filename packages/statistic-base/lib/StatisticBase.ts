import type { IStatisticBase } from '@comunica/types';

/**
 * Base class for statistics with event emitter logic implemented. Statistic tracker implementations
 * should only define their updateStatistic function.
 */
export abstract class StatisticBase<TEventData> implements IStatisticBase<TEventData> {
  private readonly listeners: ((data: TEventData) => any)[] = [];

  public on(listener: (data: TEventData) => any): StatisticBase<TEventData> {
    this.listeners.push(listener);
    return this;
  }

  public removeListener(listener: (data: TEventData) => any): StatisticBase<TEventData> {
    if (!this.listeners || this.listeners.length === 0) {
      return this;
    }
    for (let i = this.listeners.length - 1; i >= 0; i--) {
      if (this.listeners[i] === listener) {
        this.listeners.splice(i, 1);
      }
    }
    return this;
  }

  public emit(data: TEventData): boolean {
    if (!this.listeners || this.listeners.length === 0) {
      return false;
    }
    for (const listener of this.listeners) {
      listener(data);
    }
    return true;
  }

  public getListeners(): ((data: TEventData) => any)[] {
    return this.listeners;
  }

  public abstract updateStatistic(...data: any[]): void;
}
