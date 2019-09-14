import {Bindings} from "@comunica/bus-query-operation";
import * as RDF from "rdf-js";
import {termToString} from "rdf-string";

/**
 * A simple efficient tree-based index for maintaining bindings,
 * and checking whether or not a bindings is contained in this index.
 *
 * This will consider bindings with a variable term or a missing term
 * as a 'match-all' with other terms.
 */
export class BindingsIndex {

  private readonly keys: string[];
  private readonly data: IDataIndex = {};

  constructor(keys: string[]) {
    this.keys = keys;
  }

  protected static hashTerm(term: RDF.Term): string {
    return term && term.termType !== 'Variable' ? termToString(term) : '';
  }

  /**
   * Add the given bindings to the index.
   * @param {Bindings} bindings A bindings.
   */
  public add(bindings: Bindings) {
    if (this.isBindingsValid(bindings)) {
      let dataIt = this.data;
      for (const key of this.keys) {
        const dataKey = BindingsIndex.hashTerm(bindings.get(key));
        let subDataIt = dataIt[dataKey];
        if (!subDataIt) {
          subDataIt = dataIt[dataKey] = {};
        }
        dataIt = subDataIt;
      }
    }
  }

  /**
   * Check if the given bindings is contained in this index.
   * @param {Bindings} bindings A bindings.
   * @return {boolean} If it exists in the index.
   */
  public contains(bindings: Bindings): boolean {
    // Always return false if the bindings contain none of the expected keys
    if (!this.isBindingsValid(bindings)) {
      return false;
    }

    return this.containsRecursive(bindings, this.keys, [this.data]);
  }

  protected isBindingsValid(bindings: Bindings): boolean {
    let validKeys: boolean = false;
    for (const key of this.keys) {
      if (bindings.get(key)) {
        validKeys = true;
        break;
      }
    }
    return validKeys;
  }

  protected containsRecursive(bindings: Bindings, keys: string[], dataIndexes: IDataIndex[]): boolean {
    if (keys.length === 0) {
      return true;
    }

    let key: string;
    [key, ...keys] = keys;
    for (const data of dataIndexes) {
      // If the index contained a variable, all terms will match.
      const dataKey = BindingsIndex.hashTerm(bindings.get(key));
      if (!dataKey) {
        // Iterate over all entries
        let subDatas = Object.keys(data).map((k) => data[k]);
        if (subDatas.length === 0) {
          subDatas = [{}];
        }
        if (this.containsRecursive(bindings, keys, subDatas)) {
          return true;
        }
      } else {
        // Check the entry for the term, and the variable term.
        const subDatas = [data[dataKey], data['']].filter((e) => !!e);
        if (subDatas.length === 0) {
          continue;
        }
        if (this.containsRecursive(bindings, keys, subDatas)) {
          return true;
        }
      }
    }
    return false;
  }

}

export interface IDataIndex {
  [key: string]: IDataIndex;
}
