import type { MetadataVariable } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { IBindingsIndex } from './IBindingsIndex';

/**
 * A simple efficient hash-based index for maintaining bindings,
 * and checking whether or not a bindings is contained in this index.
 *
 * This can not handle bindings with undefined values.
 */
export class BindingsIndexDef<V> implements IBindingsIndex<V> {
  private readonly keys: RDF.Variable[];
  private readonly hashFn: (term: RDF.Bindings, keys: RDF.Variable[]) => string;
  private readonly index: Record<string, V>;

  /**
   * Creates a new hash-based bindings index for defined values.
   * @param keys The variables to index on.
   * @param hashFn A hash function that produces a string key from bindings and variables.
   */
  public constructor(keys: MetadataVariable[], hashFn: (term: RDF.Bindings, keys: RDF.Variable[]) => string) {
    this.keys = keys.map(v => v.variable);
    this.hashFn = hashFn;
    this.index = {};
  }

  /**
   * Stores a value in the index under the given bindings.
   * @param bindings The bindings to index.
   * @param value The value to associate with the bindings.
   * @return The stored value.
   */
  public put(bindings: RDF.Bindings, value: V): V {
    return this.index[this.hashFn(bindings, this.keys)] = value;
  }

  /**
   * Retrieves all values matching the given bindings.
   * @param bindings The bindings to look up.
   * @return An array of matching values, or an empty array if none match.
   */
  public get(bindings: RDF.Bindings): V[] {
    const v = this.getFirst(bindings);
    return v ? [ v ] : [];
  }

  /**
   * Retrieves the first value matching the given bindings.
   * @param bindings The bindings to look up.
   * @return The matching value, or undefined if not found.
   */
  public getFirst(bindings: RDF.Bindings): V | undefined {
    return this.index[this.hashFn(bindings, this.keys)];
  }

  /**
   * Returns all values stored in the index.
   * @return An array of all indexed values.
   */
  public values(): V[] {
    return Object.values(this.index);
  }
}
