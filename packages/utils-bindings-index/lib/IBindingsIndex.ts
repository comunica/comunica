import type { Bindings } from '@comunica/types';

/**
 * An index for mapping bindings to values.
 */
export interface IBindingsIndex<V> {
  /**
   * Stores a value in the index under the given bindings.
   * @param bindings The bindings to index.
   * @param value The value to associate with the bindings.
   * @return The stored value.
   */
  put: (bindings: Bindings, value: V) => V;
  /**
   * Retrieves all values matching the given bindings.
   * @param bindings The bindings to look up.
   * @return An array of matching values.
   */
  get: (bindings: Bindings) => V[];
  /**
   * Retrieves the first value matching the given bindings.
   * @param bindings The bindings to look up.
   * @param matchUndefsAsWildcard Whether undefined bindings should match any existing value.
   * @return The matching value, or undefined if not found.
   */
  getFirst: (bindings: Bindings, matchUndefsAsWildcard: boolean) => V | undefined;
  /**
   * Returns all values stored in the index.
   * @return An array of all indexed values.
   */
  values: () => V[];
}
