import type { IBindingsContextMergeHandler } from '@comunica/bus-merge-bindings-context';

/**
 * A bindings context merge handler that computes the set union of input arrays.
 */
export class SetUnionBindingsContextMergeHandler implements IBindingsContextMergeHandler<any> {
  /**
   * Merges multiple input arrays into a single deduplicated array using set union semantics.
   * @param inputSets The input arrays to merge.
   * @return The deduplicated union of all input elements.
   */
  public run(...inputSets: any[][]): any[] {
    return [ ...new Set<string>(inputSets.flat()) ];
  }
}
