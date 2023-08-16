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
  set: <V>(key: IActionContextKey<V>, value: V) => IActionContext;
  /**
   * Will only set the value if the key is not already set.
   */
  setDefault: <V>(key: IActionContextKey<V>, value: V) => IActionContext;
  delete: <V>(key: IActionContextKey<V>) => IActionContext;
  get: <V>(key: IActionContextKey<V>) => V | undefined;
  getSafe: <V>(key: IActionContextKey<V>) => V;
  has: <V>(key: IActionContextKey<V>) => boolean;
  merge: (...contexts: IActionContext[]) => IActionContext;
  keys: () => IActionContextKey<any>[];
  toJS: () => any;
}

/**
 * Keys that can be used within an {@link IActionContext}.
 *
 * To avoid entry conflicts, all keys must be properly namespaced using the following convention:
 * Each key name must be prefixed with the package name followed by a `:`.
 * For example, the `rdf-resolve-quad-pattern` bus declares the `sources` entry,
 * which should be named as `@comunica/bus-rdf-resolve-quad-pattern:sources`.
 */
export interface IActionContextKey<V> {
  readonly name: string;
}
