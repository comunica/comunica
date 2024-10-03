import type { Bindings } from '@comunica/types';

/**
 * An index for mapping bindings to values.
 */
export interface IBindingsIndex<V> {
  put: (bindings: Bindings, value: V) => V;
  get: (bindings: Bindings) => V[];
  getFirst: (bindings: Bindings, matchUndefsAsWildcard: boolean) => V | undefined;
  values: () => V[];
}
