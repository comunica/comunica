import type { Bindings } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { IBindingsIndex } from './IBindingsIndex';

/**
 * A simple efficient tree-based index for maintaining bindings,
 * and checking whether or not a bindings is contained in this index.
 *
 * This will consider bindings with a variable term or an undefined term
 * as a 'match-all' with other terms.
 */
export class BindingsIndexUndef<V> implements IBindingsIndex<V> {
  private readonly keys: RDF.Variable[];
  private readonly data: IDataIndex<V> = {};
  private readonly hashFn: (term: RDF.Term | undefined) => string;

  public constructor(keys: RDF.Variable[], hashFn: (term: RDF.Term | undefined) => string) {
    this.keys = keys;
    this.hashFn = hashFn;
  }

  /**
   * Add the given bindings to the index.
   * @param {Bindings} bindings A bindings.
   * @param {V} value The value to put.
   */
  public put(bindings: Bindings, value: V): V {
    if (this.isBindingsValid(bindings)) {
      let dataIt: IDataIndex<V> | V = this.data;
      for (let i = 0; i < this.keys.length; i++) {
        const key = this.keys[i];
        const dataKey = this.hashFn(bindings.get(key));
        let subDataIt: IDataIndex<V> | V | undefined = (<IDataIndex<V>> dataIt)[dataKey];
        if (!subDataIt) {
          subDataIt = ((<IDataIndex<V>> dataIt))[dataKey] = i === this.keys.length - 1 ? value : {};
        }
        dataIt = subDataIt;
      }
    }
    return value;
  }

  protected isBindingsValid(bindings: Bindings): boolean {
    let validKeys = false;
    for (const key of this.keys) {
      if (bindings.has(key)) {
        validKeys = true;
        break;
      }
    }
    return validKeys;
  }

  /**
   * Get the value of the given bindings is contained in this index.
   * @param {Bindings} bindings A bindings.
   * @return {V[]} The values.
   */
  public get(bindings: Bindings): V[] {
    // Always return undefined if the bindings contain none of the expected keys
    if (!this.isBindingsValid(bindings)) {
      return [];
    }

    return this.getRecursive(bindings, this.keys, [ this.data ]);
  }

  protected getRecursive(bindings: Bindings | undefined, keys: RDF.Variable[], dataIndexes: IDataIndex<V>[]): V[] {
    if (keys.length === 0) {
      return <V[]> dataIndexes;
    }

    let key: RDF.Variable;
    // eslint-disable-next-line prefer-const
    [ key, ...keys ] = keys;
    const matchingRecursive: V[][] = [];
    for (const data of dataIndexes) {
      // If the index contained a variable, all terms will match.
      const dataKey = this.hashFn(bindings?.get(key));
      if (dataKey) {
        // Check the entry for the term, and the variable term.
        const subDatas = <IDataIndex<V>[]> [ data[dataKey], data[''] ].filter(Boolean);
        if (subDatas.length === 0) {
          continue;
        }
        matchingRecursive.push(this.getRecursive(bindings, keys, subDatas));
      } else {
        // Iterate over all entries
        const subDatas = <IDataIndex<V>[]> Object.values(data);
        if (subDatas.length === 0) {
          continue;
        }
        matchingRecursive.push(this.getRecursive(bindings, keys, subDatas));
      }
    }
    return matchingRecursive.flat();
  }

  /**
   * Get the first value of the given bindings is contained in this index.
   * @param {Bindings} bindings A bindings.
   * @return {V | undefined} The value.
   */
  public getFirst(bindings: Bindings): V | undefined {
    // Always return undefined if the bindings contain none of the expected keys
    if (!this.isBindingsValid(bindings)) {
      return undefined;
    }

    return this.getRecursiveFirst(bindings, this.keys, [ this.data ]);
  }

  protected getRecursiveFirst(bindings: Bindings, keys: RDF.Variable[], dataIndexes: IDataIndex<V>[]): V | undefined {
    if (keys.length === 0) {
      return <V> dataIndexes[0];
    }

    let key: RDF.Variable;
    // eslint-disable-next-line prefer-const
    [ key, ...keys ] = keys;
    for (const data of dataIndexes) {
      // If the index contained a variable, all terms will match.
      const dataKey = this.hashFn(bindings.get(key));
      if (dataKey) {
        // Check the entry for the term, and the variable term.
        const subDatas = <IDataIndex<V>[]> [ data[dataKey], data[''] ].filter(Boolean);
        if (subDatas.length === 0) {
          continue;
        }
        const ret = this.getRecursiveFirst(bindings, keys, subDatas);
        if (ret) {
          return ret;
        }
      } else {
        // Iterate over all entries
        const subDatas = <IDataIndex<V>[]> Object.values(data);
        if (subDatas.length === 0) {
          continue;
        }
        const ret = this.getRecursiveFirst(bindings, keys, subDatas);
        if (ret) {
          return ret;
        }
      }
    }
    return undefined;
  }

  public values(): V[] {
    return this.keys.length === 0 ? [] : this.getRecursive(undefined, this.keys, [ this.data ]);
  }
}

export interface IDataIndex<V> {
  [key: string]: IDataIndex<V> | V;
}
