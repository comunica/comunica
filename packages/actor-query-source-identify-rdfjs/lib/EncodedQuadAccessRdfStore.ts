import type { IEncodedLookup, IEncodedQuadAccess, IEncodedQuadBuffer } from '@comunica/types';
import type * as RDF from '@rdfjs/types';

const COMPONENTS = [ 'subject', 'predicate', 'object', 'graph' ];

/**
 * The parts of an rdf-stores sorted blocks index that encoded lookups read.
 */
interface ISortedBlocksIndex {
  leaves: Int32Array[];
  sizes: number[];
  size: number;
  seekKey: (key: number[], length: number, after: boolean) => { leaf: number; offset: number };
}

/**
 * The parts of an rdf-stores store that encoded lookups read.
 */
interface IRdfStoreInternals {
  dictionary: {
    encodeOptional: (term: RDF.Term) => number | undefined;
    decode: (id: number) => RDF.Term;
  };
  indexesWrapped: { index: ISortedBlocksIndex; componentOrder: string[] }[];
  bestIndexLookup?: ArrayLike<number>;
}

/**
 * Encoded access to an rdf-stores store whose indexes keep their quads in sorted blocks,
 * as created by `RdfStore.createOrdered`.
 *
 * Every pattern of which the bound components form a prefix of an index is looked up by a binary search
 * followed by a scan over the contiguous quads with that prefix.
 */
export class EncodedQuadAccessRdfStore implements IEncodedQuadAccess {
  public readonly encoding: unknown;
  private readonly store: IRdfStoreInternals;
  private readonly lookups = new Map<number, IEncodedLookup | undefined>();
  // Terms are immutable and ids are stable, so encodings can be cached per term object.
  private readonly encoded = new WeakMap<RDF.Term, number>();

  public constructor(store: IRdfStoreInternals) {
    this.store = store;
    this.encoding = store;
  }

  /**
   * Create an encoded access for the given source, if it is an rdf-stores store with sorted blocks indexes.
   * @param source An RDF/JS source.
   */
  public static wrap(source: unknown): EncodedQuadAccessRdfStore | undefined {
    const store = <Partial<IRdfStoreInternals>> source;
    if (typeof store.dictionary?.encodeOptional !== 'function' || typeof store.dictionary.decode !== 'function' ||
      !Array.isArray(store.indexesWrapped) || store.indexesWrapped.length === 0 ||
      !store.indexesWrapped.every(({ index }) => Array.isArray(index.leaves) && Array.isArray(index.sizes) &&
        typeof index.seekKey === 'function')) {
      return undefined;
    }
    return new EncodedQuadAccessRdfStore(<IRdfStoreInternals> store);
  }

  public encode(term: RDF.Term): number | undefined {
    let id = this.encoded.get(term);
    if (id === undefined) {
      id = this.store.dictionary.encodeOptional(term);
      // Only the term objects of the dictionary itself are cached, as other ones tend to be short-lived.
      if (id !== undefined && this.store.dictionary.decode(id) === term) {
        this.encoded.set(term, id);
      }
    }
    return id;
  }

  public decode(id: number): RDF.Term {
    return this.store.dictionary.decode(id);
  }

  public prepareLookup(bound: readonly [boolean, boolean, boolean, boolean]): IEncodedLookup | undefined {
    const mask = (bound[0] ? 1 : 0) | (bound[1] ? 2 : 0) | (bound[2] ? 4 : 0) | (bound[3] ? 8 : 0);
    if (this.lookups.has(mask)) {
      return this.lookups.get(mask);
    }
    const boundCount = bound.filter(Boolean).length;
    let lookup: IEncodedLookup | undefined;
    // The index that the store itself would scan comes first, so that results come in the same order.
    const preferred = this.store.bestIndexLookup?.[mask] ?? 0;
    const candidates = [
      this.store.indexesWrapped[preferred],
      ...this.store.indexesWrapped.filter((_, i) => i !== preferred),
    ];
    for (const { index, componentOrder } of candidates) {
      const positions = componentOrder.map(component => COMPONENTS.indexOf(component));
      let leading = 0;
      while (leading < 4 && bound[positions[leading]]) {
        leading++;
      }
      if (leading === boundCount) {
        lookup = new EncodedPrefixLookup(index, positions, leading);
        break;
      }
    }
    this.lookups.set(mask, lookup);
    return lookup;
  }
}

/**
 * Looks up patterns of which the bound components form a prefix of an index.
 */
export class EncodedPrefixLookup implements IEncodedLookup {
  private readonly index: ISortedBlocksIndex;
  private readonly positions: number[];
  private readonly leading: number;
  private readonly key: number[];
  // The level within the index of the subject, predicate, object, and graph.
  private readonly levelS: number;
  private readonly levelP: number;
  private readonly levelO: number;
  private readonly levelG: number;

  /**
   * @param index A sorted blocks index.
   * @param positions For each level of the index, the position of its component in a quad.
   * @param leading The number of leading levels that are bound.
   */
  public constructor(index: ISortedBlocksIndex, positions: number[], leading: number) {
    this.index = index;
    this.positions = positions;
    this.leading = leading;
    this.key = Array.from({ length: leading }, () => 0);
    this.levelS = positions.indexOf(0);
    this.levelP = positions.indexOf(1);
    this.levelO = positions.indexOf(2);
    this.levelG = positions.indexOf(3);
  }

  public count(ids: ArrayLike<number>, limit = Number.POSITIVE_INFINITY): number {
    const { index, positions, leading, key } = this;
    if (leading === 0) {
      return Math.min(index.size, limit);
    }
    for (let i = 0; i < leading; i++) {
      key[i] = ids[positions[i]];
    }
    const from = index.seekKey(key, leading, false);
    const to = index.seekKey(key, leading, true);
    if (from.leaf === to.leaf) {
      return Math.min(to.offset - from.offset, limit);
    }
    const sizes = index.sizes;
    let count = sizes[from.leaf] - from.offset;
    for (let leaf = from.leaf + 1; leaf < to.leaf && count < limit; leaf++) {
      count += sizes[leaf];
    }
    return Math.min(count + to.offset, limit);
  }

  public lookup(ids: ArrayLike<number>, buffer: IEncodedQuadBuffer, limit = Number.POSITIVE_INFINITY): number {
    const { index, positions, leading, key, levelS, levelP, levelO, levelG } = this;
    for (let i = 0; i < leading; i++) {
      key[i] = ids[positions[i]];
    }
    const leaves = index.leaves;
    const sizes = index.sizes;
    let leaf: number;
    let offset: number;
    if (leading === 0) {
      leaf = sizes[0] === 0 ? leaves.length : 0;
      offset = 0;
    } else {
      ({ leaf, offset } = index.seekKey(key, leading, false));
    }
    let count = 0;
    let data = buffer.data;
    let length = buffer.length;
    for (; leaf < leaves.length; leaf++, offset = 0) {
      const quads = leaves[leaf];
      const end = sizes[leaf] * 4;
      for (let at = offset * 4; at < end; at += 4) {
        for (let i = 0; i < leading; i++) {
          if (quads[at + i] !== key[i]) {
            buffer.data = data;
            buffer.length = length;
            return count;
          }
        }
        if (length + 4 > data.length) {
          const grown = new Int32Array(Math.max(64, data.length * 2));
          grown.set(data.subarray(0, length));
          data = grown;
        }
        data[length] = quads[at + levelS];
        data[length + 1] = quads[at + levelP];
        data[length + 2] = quads[at + levelO];
        data[length + 3] = quads[at + levelG];
        length += 4;
        count++;
        if (count >= limit) {
          buffer.data = data;
          buffer.length = length;
          return count;
        }
      }
    }
    buffer.data = data;
    buffer.length = length;
    return count;
  }
}
