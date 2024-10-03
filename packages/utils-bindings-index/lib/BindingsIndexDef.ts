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

  public constructor(keys: MetadataVariable[], hashFn: (term: RDF.Bindings, keys: RDF.Variable[]) => string) {
    this.keys = keys.map(v => v.variable);
    this.hashFn = hashFn;
    this.index = {};
  }

  public put(bindings: RDF.Bindings, value: V): V {
    return this.index[this.hashFn(bindings, this.keys)] = value;
  }

  public get(bindings: RDF.Bindings): V[] {
    const v = this.getFirst(bindings);
    return v ? [ v ] : [];
  }

  public getFirst(bindings: RDF.Bindings): V | undefined {
    return this.index[this.hashFn(bindings, this.keys)];
  }

  public values(): V[] {
    return Object.values(this.index);
  }
}
