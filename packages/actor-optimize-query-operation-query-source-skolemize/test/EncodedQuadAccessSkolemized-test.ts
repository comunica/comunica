import type { IEncodedQuadAccess } from '@comunica/types';
import { BlankNodeScoped } from '@comunica/utils-data-factory';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import { EncodedQuadAccessSkolemized } from '../lib';
import { SKOLEM_PREFIX } from '../lib/utils';
import 'jest-rdf';

const DF = new DataFactory();

describe('EncodedQuadAccessSkolemized', () => {
  let terms: RDF.Term[];
  let inner: IEncodedQuadAccess;
  let access: EncodedQuadAccessSkolemized;

  beforeEach(() => {
    terms = [ DF.namedNode('a'), DF.blankNode('b'), DF.literal('c'), DF.defaultGraph() ];
    inner = {
      encoding: {},
      encode: jest.fn((term: RDF.Term) => {
        const id = terms.findIndex(other => other.equals(term));
        return id < 0 ? undefined : id;
      }),
      decode: jest.fn((id: number) => terms[id]),
      prepareLookup: jest.fn(() => <any> 'LOOKUP'),
    };
    access = new EncodedQuadAccessSkolemized(inner, '0', DF);
  });

  it('should have its own encoding', () => {
    expect(access.encoding).toBe(access);
  });

  it('should delegate preparing lookups', () => {
    expect(access.prepareLookup([ true, false, false, true ])).toBe('LOOKUP');
    expect(inner.prepareLookup).toHaveBeenCalledWith([ true, false, false, true ]);
  });

  describe('encode', () => {
    it('should encode named nodes and literals directly', () => {
      expect(access.encode(DF.namedNode('a'))).toBe(0);
      expect(access.encode(DF.literal('c'))).toBe(2);
      expect(access.encode(DF.literal(`${SKOLEM_PREFIX}0:b`))).toBeUndefined();
    });

    it('should encode skolemized named nodes of this source as their blank nodes, once', () => {
      expect(access.encode(DF.namedNode(`${SKOLEM_PREFIX}0:b`))).toBe(1);
      expect(access.encode(DF.namedNode(`${SKOLEM_PREFIX}0:b`))).toBe(1);
      expect(inner.encode).toHaveBeenCalledTimes(1);
    });

    it('should not encode skolemized named nodes of other sources', () => {
      expect(access.encode(DF.namedNode(`${SKOLEM_PREFIX}1:b`))).toBeUndefined();
      expect(access.encode(DF.namedNode(`${SKOLEM_PREFIX}1:b`))).toBeUndefined();
      expect(inner.encode).not.toHaveBeenCalled();
    });

    it('should encode scoped blank nodes of this source', () => {
      const term = new BlankNodeScoped('bc_0_b', DF.namedNode(`${SKOLEM_PREFIX}0:b`));
      expect(access.encode(term)).toBe(1);
    });

    it('should encode other blank nodes and terms', () => {
      expect(access.encode(DF.blankNode('b'))).toBe(1);
      expect(access.encode(DF.defaultGraph())).toBe(3);
    });
  });

  describe('decode', () => {
    it('should decode named nodes and literals directly', () => {
      expect(access.decode(0)).toBe(terms[0]);
      expect(access.decode(2)).toBe(terms[2]);
    });

    it('should skolemize blank nodes, once', () => {
      const term = access.decode(1);
      expect(term).toBeInstanceOf(BlankNodeScoped);
      expect((<BlankNodeScoped> term).skolemized).toEqualRdfTerm(DF.namedNode(`${SKOLEM_PREFIX}0:b`));
      expect(access.decode(1)).toBe(term);
      expect(access.encode(term)).toBe(1);
    });
  });
});
