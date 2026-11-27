import type { IEncodedQuadBuffer } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { Store } from 'n3';
import { DataFactory } from 'rdf-data-factory';
import { RdfStore } from 'rdf-stores';
import { EncodedQuadAccessRdfStore } from '../lib';
import 'jest-rdf';

const DF = new DataFactory();

describe('EncodedQuadAccessRdfStore', () => {
  let store: RdfStore;
  let quads: RDF.Quad[];
  let access: EncodedQuadAccessRdfStore;

  function buffer(size = 4): IEncodedQuadBuffer {
    return { data: new Int32Array(size), length: 0 };
  }

  function decodeQuads(data: IEncodedQuadBuffer): string[] {
    const result: string[] = [];
    for (let i = 0; i < data.length; i += 4) {
      result.push([ 0, 1, 2, 3 ].map(c => access.decode(data.data[i + c]).value).join(' '));
    }
    return result.sort();
  }

  function expected(subject?: RDF.Term, predicate?: RDF.Term, object?: RDF.Term, graph?: RDF.Term): string[] {
    return quads
      .filter(q => (!subject || q.subject.equals(subject)) && (!predicate || q.predicate.equals(predicate)) &&
        (!object || q.object.equals(object)) && (!graph || q.graph.equals(graph)))
      .map(q => [ q.subject.value, q.predicate.value, q.object.value, q.graph.value ].join(' '))
      .sort();
  }

  beforeEach(() => {
    store = RdfStore.createOrdered();
    quads = [];
    // Enough quads to span multiple leaves of the sorted blocks indexes.
    for (let i = 0; i < 1500; i++) {
      quads.push(DF.quad(DF.namedNode(`s${i % 300}`), DF.namedNode(`p${i % 3}`), DF.literal(`o${i}`)));
    }
    quads.push(DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('s2'), DF.namedNode('g')));
    store.addQuads(quads);
    access = EncodedQuadAccessRdfStore.wrap(store)!;
  });

  describe('wrap', () => {
    it('should wrap an ordered store', () => {
      expect(access).toBeInstanceOf(EncodedQuadAccessRdfStore);
      expect(access.encoding).toBe(store);
    });

    it('should not wrap a store with nested map indexes', () => {
      expect(EncodedQuadAccessRdfStore.wrap(RdfStore.createDefault())).toBeUndefined();
    });

    it('should not wrap other sources', () => {
      expect(EncodedQuadAccessRdfStore.wrap(new Store())).toBeUndefined();
      expect(EncodedQuadAccessRdfStore.wrap({})).toBeUndefined();
      expect(EncodedQuadAccessRdfStore.wrap({ dictionary: { encodeOptional() {}, decode() {} }})).toBeUndefined();
      expect(EncodedQuadAccessRdfStore.wrap({ dictionary: { encodeOptional() {}, decode() {} }, indexesWrapped: []}))
        .toBeUndefined();
    });
  });

  describe('encode and decode', () => {
    it('should encode and decode terms', () => {
      const id = access.encode(DF.namedNode('s1'))!;
      expect(id).toBeGreaterThanOrEqual(0);
      expect(access.decode(id)).toEqualRdfTerm(DF.namedNode('s1'));
    });

    it('should encode the same term object twice', () => {
      const term = access.decode(access.encode(DF.namedNode('s1'))!);
      expect(access.encode(term)).toBe(access.encode(term));
    });

    it('should encode equal term objects that are not in the dictionary', () => {
      expect(access.encode(DF.namedNode('s1'))).toBe(access.encode(DF.namedNode('s1')));
    });

    it('should not encode unknown terms', () => {
      expect(access.encode(DF.namedNode('unknown'))).toBeUndefined();
    });
  });

  describe('prepareLookup', () => {
    it('should cache lookups', () => {
      const lookup = access.prepareLookup([ true, false, false, true ]);
      expect(lookup).toBeDefined();
      expect(access.prepareLookup([ true, false, false, true ])).toBe(lookup);
    });

    it('should prepare lookups for stores without a best index table', () => {
      const bare = Object.assign(Object.create(store), { bestIndexLookup: undefined });
      access = EncodedQuadAccessRdfStore.wrap(bare)!;
      const lookup = access.prepareLookup([ false, true, false, true ])!;
      const ids = [ 0, access.encode(DF.namedNode('p1'))!, 0, access.encode(DF.defaultGraph())! ];
      expect(lookup.count(ids)).toBe(500);
    });

    it('should not prepare lookups whose bound components are no prefix of an index', () => {
      expect(access.prepareLookup([ true, false, false, false ])).toBeUndefined();
      expect(access.prepareLookup([ true, false, false, false ])).toBeUndefined();
    });

    it.each([
      [[ false, false, false, false ]],
      [[ false, false, false, true ]],
      [[ true, false, false, true ]],
      [[ false, true, false, true ]],
      [[ false, false, true, true ]],
      [[ true, true, false, true ]],
      [[ true, false, true, true ]],
      [[ false, true, true, true ]],
      [[ true, true, true, true ]],
    ])('should look up and count patterns with bound components %j', (bound) => {
      const lookup = access.prepareLookup(<[boolean, boolean, boolean, boolean]> bound)!;
      const missing = DF.quad(DF.namedNode('s1'), DF.namedNode('p2'), DF.literal('x'));
      for (const quad of [ quads[0], quads[7], quads.at(-1)!, missing ]) {
        const terms = [ quad.subject, quad.predicate, quad.object, quad.graph ];
        const ids = terms.map(term => access.encode(term) ?? 0);
        const data = buffer();
        const count = lookup.lookup(ids, data);
        const matches = expected(...terms.map((term, i) => bound[i] ? term : undefined));
        expect(count).toBe(matches.length);
        expect(data).toHaveLength(count * 4);
        expect(decodeQuads(data)).toEqual(matches);
        expect(lookup.count(ids)).toBe(matches.length);
      }
    });

    it('should stop looking up and counting at a limit', () => {
      const lookup = access.prepareLookup([ false, true, false, true ])!;
      const ids = [ 0, access.encode(DF.namedNode('p1'))!, 0, access.encode(DF.defaultGraph())! ];
      const data = buffer();
      expect(lookup.lookup(ids, data, 3)).toBe(3);
      expect(data).toHaveLength(12);
      expect(lookup.count(ids, 3)).toBe(3);
      expect(lookup.count(ids, 600)).toBe(500);
      expect(lookup.count(ids, 10)).toBe(10);
      expect(access.prepareLookup([ false, false, false, false ])!.count(ids, 10)).toBe(10);
    });

    it('should append to a buffer', () => {
      const lookup = access.prepareLookup([ true, true, false, true ])!;
      const data = buffer(256);
      data.length = 4;
      const ids = [
        access.encode(DF.namedNode('s1'))!,
        access.encode(DF.namedNode('p1'))!,
        0,
        access.encode(DF.defaultGraph())!,
      ];
      expect(lookup.lookup(ids, data)).toBe(5);
      expect(data).toHaveLength(24);
    });

    it('should look up nothing in an empty store', () => {
      access = EncodedQuadAccessRdfStore.wrap(RdfStore.createOrdered())!;
      const lookup = access.prepareLookup([ false, false, false, false ])!;
      expect(lookup.lookup([ 0, 0, 0, 0 ], buffer())).toBe(0);
      expect(lookup.count([ 0, 0, 0, 0 ])).toBe(0);
    });
  });
});
