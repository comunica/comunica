/**
 * An immutable key-value mapped context that can be passed to any (@link IAction}.
 * All actors that receive a context must forward this context to any actor, mediator or bus that it calls.
 * This context may be transformed before forwarding.
 *
 * For type-safety, the keys of this context can only be instances of {@link IActionContextKey},
 * where each key supplies acceptable the value type.
 *
 * Each bus should describe in its action interface which context entries are possible (non-restrictive)
 * and corresponding context keys should be exposed in '@comunica/context-entries' for easy reuse.
 * If actors support any specific context entries next to those inherited by the bus action interface,
 * then this should be described in its README file.
 *
 * This context can contain any information that might be relevant for certain actors.
 * For instance, this context can contain a list of datasources over which operators should query.
 */
export interface IActionContext {
  /**
   * Sets the value for the given typed context key.
   * @param key The context key to set.
   * @param value The value to associate with the key.
   * @return A new context with the updated entry.
   */
  set: <V>(key: IActionContextKey<V>, value: V) => IActionContext;
  /**
   * Sets the value only if the key is not already present in the context.
   * @param key The context key to set.
   * @param value The default value to associate with the key.
   * @return A new context with the entry set, or the original context if the key was already present.
   */
  setDefault: <V>(key: IActionContextKey<V>, value: V) => IActionContext;
  /**
   * Removes the entry for the given context key.
   * @param key The context key to remove.
   * @return A new context without the given entry.
   */
  delete: <V>(key: IActionContextKey<V>) => IActionContext;
  /**
   * Retrieves the value for the given typed context key.
   * @param key The context key to look up.
   * @return The value associated with the key, or undefined if not present.
   */
  get: <V>(key: IActionContextKey<V>) => V | undefined;
  /**
   * Retrieves the value for the given typed context key, throwing an error if not present.
   * @param key The context key to look up.
   * @return The value associated with the key.
   */
  getSafe: <V>(key: IActionContextKey<V>) => V;
  /**
   * Checks whether the given key is present in the context.
   * @param key The context key to check.
   * @return True if the key is present, false otherwise.
   */
  has: <V>(key: IActionContextKey<V>) => boolean;
  /**
   * Merges one or more contexts into this context.
   * @param contexts The contexts to merge into this one.
   * @return A new context containing entries from all provided contexts.
   */
  merge: (...contexts: IActionContext[]) => IActionContext;
  /**
   * Returns all context keys present in this context.
   * @return An array of all context keys.
   */
  keys: () => IActionContextKey<any>[];
  /**
   * Converts this context to a plain JavaScript object.
   * @return A plain object representation of this context.
   */
  toJS: () => any;
}

/**
 * Keys that can be used within an {@link IActionContext}.
 *
 * To avoid entry conflicts, all keys must be properly namespaced using the following convention:
 * Each key name must be prefixed with the package name followed by a `:`.
 * For example, the `query-operation` bus declares the `operation` entry,
 * which should be named as `@comunica/bus-query-operation:operation`.
 */
export interface IActionContextKey<V> {
  /**
   * The unique string name of this context key.
   */
  readonly name: string;
  /**
   * A dummy field that we must define to make TypeScript bind the type `V`, otherwise it would always be `any`.
   * This field will be undefined, so it will never exist in JavaScript.
   */
  readonly dummy: V | undefined;
}
