import type * as RDF from '@rdfjs/types';

/**
 * Prototype: direct lookups in the default graph of an rdf-stores store with sorted blocks indexes,
 * which binary search the range of a pattern and read it without generators or intermediate arrays.
 * Only patterns whose bound terms form a prefix of an index are supported, which holds for all patterns
 * of plain terms in the ordered store, as its indexes start with the graph.
 */
export class LeanStoreScan {
  private readonly store: any;
  private readonly dictionary: any;
  private readonly dataFactory: RDF.DataFactory;
  private readonly ids: (number | undefined)[] = [ undefined, undefined, undefined, undefined ];
  private readonly key: number[] = [ 0, 0, 0, 0 ];
  private readonly keyLabels: number[] = [ 0, 0, 0, 0 ];

  private constructor(store: any) {
    this.store = store;
    this.dictionary = store.dictionary;
    this.dataFactory = store.dataFactory;
  }

  /**
   * A scanner for the given store, or undefined if it is not an rdf-stores store with sorted blocks indexes.
   * @param store A store.
   */
  public static forStore(store: any): LeanStoreScan | undefined {
    if (!store?.dictionary || !store.dataFactory || typeof store.getBestIndexWrapped !== 'function' ||
      !store.indexesWrapped?.every((wrapped: any) => wrapped.index.leaves && wrapped.index.sizes &&
        wrapped.index.termOrder)) {
      return undefined;
    }
    return new LeanStoreScan(store);
  }

  /**
   * Add the quads in the default graph that match the given terms to an array.
   * @param subject The subject, or undefined for any.
   * @param predicate The predicate, or undefined for any.
   * @param object The object, or undefined for any.
   * @param out The array to add to.
   * @return False if the pattern is not supported, which leaves the array as it was.
   */
  public scan(
    subject: RDF.Term | undefined,
    predicate: RDF.Term | undefined,
    object: RDF.Term | undefined,
    out: RDF.Quad[],
  ): boolean {
    if (subject?.termType === 'Quad' || predicate?.termType === 'Quad' || object?.termType === 'Quad') {
      return false;
    }
    const dictionary = this.dictionary;
    const ids = this.ids;
    const graph = this.dataFactory.defaultGraph();
    ids[0] = subject === undefined ? undefined : dictionary.encodeOptional(subject);
    ids[1] = predicate === undefined ? undefined : dictionary.encodeOptional(predicate);
    ids[2] = object === undefined ? undefined : dictionary.encodeOptional(object);
    ids[3] = dictionary.encodeOptional(graph);
    // Terms that were never stored match nothing
    if ((subject !== undefined && ids[0] === undefined) || (predicate !== undefined && ids[1] === undefined) ||
      (object !== undefined && ids[2] === undefined) || ids[3] === undefined) {
      return true;
    }
    const wrapped = this.store.getBestIndexWrapped(ids);
    const permutation: number[] = wrapped.componentOrderPermutation;
    const index = wrapped.index;
    const termOrder = index.termOrder;
    const key = this.key;
    const keyLabels = this.keyLabels;
    let leading = 0;
    while (leading < 4 && ids[permutation[leading]] !== undefined) {
      key[leading] = ids[permutation[leading]]!;
      keyLabels[leading] = termOrder.label(key[leading]);
      if (keyLabels[leading] === 0) {
        return true;
      }
      leading++;
    }
    for (let level = leading; level < 4; level++) {
      if (ids[permutation[level]] !== undefined) {
        return false;
      }
    }

    // The first quad whose prefix is not before the key: first the leaf, then the offset within it
    const leaves: Int32Array[] = index.leaves;
    const sizes: number[] = index.sizes;
    if (sizes[0] === 0) {
      return true;
    }
    const isBefore = (data: Int32Array, offset: number): boolean => {
      for (let i = 0; i < leading; i++) {
        const value = data[offset + i];
        if (value !== key[i]) {
          return termOrder.label(value) < keyLabels[i];
        }
      }
      return false;
    };
    let low = 0;
    let high = leaves.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (isBefore(leaves[middle], (sizes[middle] - 1) * 4)) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }
    let leaf = low;
    if (leaf === leaves.length) {
      return true;
    }
    let data = leaves[leaf];
    low = 0;
    high = sizes[leaf] - 1;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (isBefore(data, middle * 4)) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }

    // Read on while the prefix matches
    const inverse = wrapped.componentOrderInverse;
    const subjectLevel: number = inverse.subject;
    const predicateLevel: number = inverse.predicate;
    const objectLevel: number = inverse.object;
    const dataFactory = this.dataFactory;
    let offset = low;
    let size = sizes[leaf];
    for (;;) {
      const base = offset * 4;
      for (let i = 0; i < leading; i++) {
        if (data[base + i] !== key[i]) {
          return true;
        }
      }
      out.push(dataFactory.quad(
        <RDF.Quad_Subject> (subject ?? dictionary.decode(data[base + subjectLevel])),
        <RDF.Quad_Predicate> (predicate ?? dictionary.decode(data[base + predicateLevel])),
        <RDF.Quad_Object> (object ?? dictionary.decode(data[base + objectLevel])),
        graph,
      ));
      if (++offset >= size) {
        if (++leaf >= leaves.length) {
          return true;
        }
        data = leaves[leaf];
        size = sizes[leaf];
        offset = 0;
      }
    }
  }
}
