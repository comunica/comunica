import type { IActionContext, IActionContextKey } from '@comunica/types';

/**
 * Implementation of {@link IActionContext} backed by a native Map, which is never modified after construction.
 * Modifications copy the map.
 */
export class ActionContext implements IActionContext {
  private readonly map: ReadonlyMap<string, any>;

  public constructor(data: Record<string, any> = {}) {
    // Maps are only passed internally, by contexts that do not modify them anymore
    this.map = data instanceof Map ? data : new Map(Object.entries(data));
  }

  /**
   * Will only set the value if the key is not already set.
   */
  public setDefault<V>(key: IActionContextKey<V>, value: V): IActionContext {
    return this.has(key) ? this : this.set(key, value);
  }

  public set<V>(key: IActionContextKey<V>, value: V): IActionContext {
    return this.setRaw(key.name, value);
  }

  public setRaw(key: string, value: any): IActionContext {
    const map = new Map(this.map);
    map.set(key, value);
    return new ActionContext(<any> map);
  }

  public delete<V>(key: IActionContextKey<V>): IActionContext {
    if (!this.map.has(key.name)) {
      return new ActionContext(<any> this.map);
    }
    const map = new Map(this.map);
    map.delete(key.name);
    return new ActionContext(<any> map);
  }

  public get<V>(key: IActionContextKey<V>): V | undefined {
    return this.getRaw(key.name);
  }

  public getRaw(key: string): any | undefined {
    return this.map.get(key);
  }

  public getSafe<V>(key: IActionContextKey<V>): V {
    if (!this.has(key)) {
      throw new Error(`Context entry ${key.name} is required but not available`);
    }
    return <V> this.get(key);
  }

  public has<V>(key: IActionContextKey<V>): boolean {
    return this.hasRaw(key.name);
  }

  public hasRaw(key: string): boolean {
    return this.map.has(key);
  }

  public merge(...contexts: IActionContext[]): IActionContext {
    // The entries are only copied once, when the first entry is merged
    let map: Map<string, any> | undefined;
    for (const source of contexts) {
      for (const key of source.keys()) {
        map ??= new Map(this.map);
        map.set(key.name, source.get(key));
      }
    }
    return map ? new ActionContext(<any> map) : this;
  }

  public keys(): IActionContextKey<any>[] {
    return [ ...this.map.keys() ].map(keyName => new ActionContextKey(keyName));
  }

  public toJS(): any {
    return ActionContext.toJS(Object.fromEntries(this.map));
  }

  public toString(): string {
    return `ActionContext(${JSON.stringify(this.toJS())})`;
  }

  public [Symbol.for('nodejs.util.inspect.custom')](): string {
    return `ActionContext(${JSON.stringify(this.toJS(), null, '  ')})`;
  }

  /**
   * Deeply copy plain objects and arrays, keeping other values as-is.
   * @param value A value.
   */
  protected static toJS(value: any): any {
    if (Array.isArray(value)) {
      return value.map(element => ActionContext.toJS(element));
    }
    if (value !== null && typeof value === 'object' &&
      [ Object.prototype, null ].includes(Object.getPrototypeOf(value))) {
      return Object.fromEntries(Object.entries(value).map(([ key, entry ]) => [ key, ActionContext.toJS(entry) ]));
    }
    return value;
  }

  /**
   * Convert the given object to an action context object if it is not an action context object yet.
   * If it already is an action context object, return the object as-is.
   * @param maybeActionContext An action context or record.
   * @return {ActionContext} An action context object.
   */
  public static ensureActionContext(maybeActionContext?: IActionContext | Record<string, any>): IActionContext {
    // This should only be an instanceof, but can fail when this package is loaded multiple times,
    // with multiple ActionContexts existing in parallel.
    return maybeActionContext instanceof ActionContext || (maybeActionContext && 'map' in maybeActionContext) ?
      <IActionContext> maybeActionContext :
      new ActionContext(maybeActionContext);
  }
}

/**
 * Simple implementation of {@link IActionContextKey}.
 */
export class ActionContextKey<V> implements IActionContextKey<V> {
  /**
   * A unique context key name.
   */
  public readonly name: string;
  public readonly dummy: V | undefined;

  public constructor(name: string) {
    this.name = name;
  }
}
