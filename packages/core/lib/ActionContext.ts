import type { IActionContext, IActionContextKey } from '@comunica/types';
import { Map } from 'immutable';

/**
 * Implementation of {@link IActionContext} using Immutable.js.
 *
 * Provides an immutable key-value store for passing contextual information through actor pipelines.
 * Each mutation method returns a new instance, leaving the original unchanged.
 *
 * @see IActionContext
 */
export class ActionContext implements IActionContext {
  private readonly map: Map<string, any>;

  /**
   * Creates a new ActionContext from a plain record of key-value pairs.
   * @param data Initial context entries keyed by their string names.
   */
  public constructor(data: Record<string, any> = {}) {
    this.map = Map<string, any>(data);
  }

  /**
   * Sets the value for the given key only if it is not already present.
   * @param key The context key to conditionally set.
   * @param value The value to associate with the key.
   * @return A new context with the value set, or this context if the key already exists.
   */
  public setDefault<V>(key: IActionContextKey<V>, value: V): IActionContext {
    return this.has(key) ? this : this.set(key, value);
  }

  /**
   * Sets the value for the given typed context key.
   * @param key The context key.
   * @param value The value to associate with the key.
   * @return A new context containing the updated entry.
   */
  public set<V>(key: IActionContextKey<V>, value: V): IActionContext {
    return this.setRaw(key.name, value);
  }

  /**
   * Sets the value for a raw string key.
   * @param key The raw string key name.
   * @param value The value to associate with the key.
   * @return A new context containing the updated entry.
   */
  public setRaw(key: string, value: any): IActionContext {
    return new ActionContext(this.map.set(key, value));
  }

  /**
   * Removes the entry for the given context key.
   * @param key The context key to remove.
   * @return A new context without the specified entry.
   */
  public delete<V>(key: IActionContextKey<V>): IActionContext {
    return new ActionContext(this.map.delete(key.name));
  }

  /**
   * Retrieves the value for the given typed context key.
   * @param key The context key to look up.
   * @return The value associated with the key, or undefined if not present.
   */
  public get<V>(key: IActionContextKey<V>): V | undefined {
    return this.getRaw(key.name);
  }

  /**
   * Retrieves the value for a raw string key.
   * @param key The raw string key name.
   * @return The value associated with the key, or undefined if not present.
   */
  public getRaw(key: string): any | undefined {
    return this.map.get(key);
  }

  /**
   * Retrieves the value for the given key, throwing if the key is not present.
   * @param key The context key to look up.
   * @return The value associated with the key.
   * @throws When the key is not present in this context.
   */
  public getSafe<V>(key: IActionContextKey<V>): V {
    if (!this.has(key)) {
      throw new Error(`Context entry ${key.name} is required but not available`);
    }
    return <V> this.get(key);
  }

  /**
   * Checks whether the given typed context key is present.
   * @param key The context key to check.
   * @return True if the key exists in this context.
   */
  public has<V>(key: IActionContextKey<V>): boolean {
    return this.hasRaw(key.name);
  }

  /**
   * Checks whether a raw string key is present.
   * @param key The raw string key name.
   * @return True if the key exists in this context.
   */
  public hasRaw(key: string): boolean {
    return this.map.has(key);
  }

  /**
   * Merges one or more contexts into this context, returning a new combined context.
   * Entries from later contexts overwrite entries from earlier ones.
   * @param contexts The contexts to merge into this one.
   * @return A new context containing all entries.
   */
  public merge(...contexts: IActionContext[]): IActionContext {
    // eslint-disable-next-line ts/no-this-alias
    let context: IActionContext = this;
    for (const source of contexts) {
      for (const key of source.keys()) {
        context = context.set(key, source.get(key));
      }
    }
    return context;
  }

  /**
   * Returns all context keys present in this context.
   * @return An array of all context keys.
   */
  public keys(): IActionContextKey<any>[] {
    return [ ...<any> this.map.keys() ]
      .map(keyName => new ActionContextKey(keyName));
  }

  /**
   * Converts this context to a plain JavaScript object.
   * @return A plain object representation of the context entries.
   */
  public toJS(): any {
    return this.map.toJS();
  }

  /**
   * Returns a string representation of this context.
   * @return A human-readable string of the context contents.
   */
  public toString(): string {
    return `ActionContext(${JSON.stringify(this.map.toJS())})`;
  }

  /**
   * Custom Node.js inspect handler for pretty-printing in the console.
   * @return A formatted string representation with indentation.
   */
  public [Symbol.for('nodejs.util.inspect.custom')](): string {
    return `ActionContext(${JSON.stringify(this.map.toJS(), null, '  ')})`;
  }

  /**
   * Converts the given object to an action context object if it is not an action context object yet.
   * If it already is an action context object, returns the object as-is.
   * @param maybeActionContext An action context or record.
   * @return An action context object.
   */
  public static ensureActionContext(maybeActionContext?: IActionContext | Record<string, any>): IActionContext {
    // This should only be an instanceof, but can fail when this package is loaded multiple times,
    // with multiple ActionContexts existing in parallel.
    return maybeActionContext instanceof ActionContext || (maybeActionContext && 'map' in maybeActionContext) ?
      <IActionContext> maybeActionContext :
      new ActionContext(Map(maybeActionContext ?? {}));
  }
}

/**
 * Simple implementation of {@link IActionContextKey}.
 * @template V The value type this key is associated with.
 * @see IActionContextKey
 */
export class ActionContextKey<V> implements IActionContextKey<V> {
  /**
   * A unique context key name.
   */
  public readonly name: string;
  /**
   * A phantom field used to bind the generic type parameter at the type level.
   * This field is always undefined at runtime.
   */
  public readonly dummy: V | undefined;

  /**
   * Creates a new context key with the given unique name.
   * @param name A unique, namespaced key name (e.g. `'@comunica/bus-http:fetch'`).
   */
  public constructor(name: string) {
    this.name = name;
  }
}
