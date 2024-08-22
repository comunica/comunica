import { BindingsFactory } from '@comunica/bindings-factory';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import { termToString } from 'rdf-string';
import { BindingsIndexUndef } from '../lib/BindingsIndexUndef';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);

const hashFn = (term: RDF.Term | undefined) => term && term.termType !== 'Variable' ? termToString(term) : '';

describe('BindingsIndexUndef', () => {
  let index: BindingsIndexUndef<number>;

  describe('without keys', () => {
    beforeEach(() => {
      index = new BindingsIndexUndef([], hashFn);
    });

    describe('without bindings', () => {
      describe('values', () => {
        it('should return all values', () => {
          expect(index.values()).toEqual([]);
        });
      });

      it('should get nothing', () => {
        expect(index.get(BF.bindings())).toEqual([]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('b') ],
        ]))).toEqual([]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.variable('b') ],
        ]))).toEqual([]);
      });

      it('should getFirst nothing', () => {
        expect(index.getFirst(BF.bindings())).toBeUndefined();
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('b') ],
        ]))).toBeUndefined();
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.variable('b') ],
        ]))).toBeUndefined();
      });
    });

    describe('with one bindings', () => {
      beforeEach(() => {
        index.put(BF.bindings([
          [ DF.variable('x'), DF.namedNode('b') ],
        ]), 1);
      });

      describe('values', () => {
        it('should return all values', () => {
          expect(index.values()).toEqual([]);
        });
      });

      it('should get nothing', () => {
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('b') ],
        ]))).toEqual([]);
        expect(index.get(BF.bindings())).toEqual([]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.variable('b') ],
        ]))).toEqual([]);
      });

      it('should getFirst nothing', () => {
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('b') ],
        ]))).toBeUndefined();
        expect(index.getFirst(BF.bindings())).toBeUndefined();
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.variable('b') ],
        ]))).toBeUndefined();
      });
    });
  });

  describe('with one key', () => {
    beforeEach(() => {
      index = new BindingsIndexUndef([ DF.variable('a') ], hashFn);
    });

    describe('without bindings', () => {
      it('should not get concrete terms', () => {
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('b') ],
        ]))).toEqual([]);
      });

      it('should not getFirst concrete terms', () => {
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('b') ],
        ]))).toBeUndefined();
      });

      it('should get variable, null or undefined terms', () => {
        expect(index.get(BF.bindings())).toEqual([]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.variable('b') ],
        ]))).toEqual([]);
      });

      it('should getFirst variable, null or undefined terms', () => {
        expect(index.getFirst(BF.bindings())).toBeUndefined();
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.variable('b') ],
        ]))).toBeUndefined();
      });
    });

    describe('with one bindings', () => {
      beforeEach(() => {
        index.put(BF.bindings([
          [ DF.variable('a'), DF.namedNode('b') ],
        ]), 1);
      });

      describe('values', () => {
        it('should return all values', () => {
          expect(index.values()).toEqual([ 1 ]);
        });
      });

      it('should not get non-matching concrete terms', () => {
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('NON') ],
        ]))).toEqual([]);
      });

      it('should not getFirst non-matching concrete terms', () => {
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('NON') ],
        ]))).toBeUndefined();
      });

      it('should get matching concrete terms', () => {
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('b') ],
        ]))).toEqual([ 1 ]);
      });

      it('should getFirst matching concrete terms', () => {
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('b') ],
        ]))).toBe(1);
      });

      it('should get variable, null or undefined terms', () => {
        expect(index.get(BF.bindings())).toEqual([]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.variable('b') ],
        ]))).toEqual([ 1 ]);
      });

      it('should getFirst variable, null or undefined terms', () => {
        expect(index.getFirst(BF.bindings())).toBeUndefined();
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.variable('b') ],
        ]))).toBe(1);
      });
    });
  });

  describe('with three keys', () => {
    beforeEach(() => {
      index = new BindingsIndexUndef([ DF.variable('a'), DF.variable('b'), DF.variable('c') ], hashFn);
    });

    describe('without bindings', () => {
      it('should not get concrete terms', () => {
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('2') ],
          [ DF.variable('c'), DF.namedNode('3') ],
        ]))).toEqual([]);
      });

      it('should not getFirst concrete terms', () => {
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('2') ],
          [ DF.variable('c'), DF.namedNode('3') ],
        ]))).toBeUndefined();
      });

      it('should get variable, null or undefined terms', () => {
        expect(index.get(BF.bindings())).toEqual([]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.variable('1-') ],
          [ DF.variable('b'), DF.variable('2-') ],
          [ DF.variable('c'), DF.variable('3-') ],
        ]))).toEqual([]);
      });

      it('should getFirst variable, null or undefined terms', () => {
        expect(index.getFirst(BF.bindings())).toBeUndefined();
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.variable('1-') ],
          [ DF.variable('b'), DF.variable('2-') ],
          [ DF.variable('c'), DF.variable('3-') ],
        ]))).toBeUndefined();
      });

      it('should not get partially concrete terms', () => {
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.variable('1') ],
          [ DF.variable('b'), DF.namedNode('2') ],
          [ DF.variable('c'), DF.variable('3') ],
        ]))).toEqual([]);
      });

      it('should not getFirst partially concrete terms', () => {
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.variable('1') ],
          [ DF.variable('b'), DF.namedNode('2') ],
          [ DF.variable('c'), DF.variable('3') ],
        ]))).toBeUndefined();
      });
    });

    describe('with one bindings', () => {
      beforeEach(() => {
        index.put(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('2') ],
          [ DF.variable('c'), DF.namedNode('3') ],
        ]), 1);
      });

      describe('values', () => {
        it('should return all values', () => {
          expect(index.values()).toEqual([ 1 ]);
        });
      });

      it('should not get non-matching concrete terms', () => {
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('NON') ],
          [ DF.variable('b'), DF.namedNode('NON') ],
          [ DF.variable('c'), DF.namedNode('NON') ],
        ]))).toEqual([]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('NON') ],
          [ DF.variable('c'), DF.namedNode('NON') ],
        ]))).toEqual([]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('2') ],
          [ DF.variable('c'), DF.namedNode('NON') ],
        ]))).toEqual([]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('NON') ],
          [ DF.variable('c'), DF.namedNode('3') ],
        ]))).toEqual([]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('NON') ],
          [ DF.variable('b'), DF.namedNode('NON') ],
          [ DF.variable('c'), DF.namedNode('3') ],
        ]))).toEqual([]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('NON') ],
          [ DF.variable('b'), DF.namedNode('2') ],
          [ DF.variable('c'), DF.namedNode('3') ],
        ]))).toEqual([]);
      });

      it('should not getFirst non-matching concrete terms', () => {
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('NON') ],
          [ DF.variable('b'), DF.namedNode('NON') ],
          [ DF.variable('c'), DF.namedNode('NON') ],
        ]))).toBeUndefined();
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('NON') ],
          [ DF.variable('c'), DF.namedNode('NON') ],
        ]))).toBeUndefined();
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('2') ],
          [ DF.variable('c'), DF.namedNode('NON') ],
        ]))).toBeUndefined();
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('NON') ],
          [ DF.variable('c'), DF.namedNode('3') ],
        ]))).toBeUndefined();
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('NON') ],
          [ DF.variable('b'), DF.namedNode('NON') ],
          [ DF.variable('c'), DF.namedNode('3') ],
        ]))).toBeUndefined();
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('NON') ],
          [ DF.variable('b'), DF.namedNode('2') ],
          [ DF.variable('c'), DF.namedNode('3') ],
        ]))).toBeUndefined();
      });

      it('should get matching concrete terms', () => {
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('2') ],
          [ DF.variable('c'), DF.namedNode('3') ],
        ]))).toEqual([ 1 ]);
      });

      it('should getFirst matching concrete terms', () => {
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('2') ],
          [ DF.variable('c'), DF.namedNode('3') ],
        ]))).toBe(1);
      });

      it('should get variable, null or undefined terms', () => {
        expect(index.get(BF.bindings())).toEqual([]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.variable('b') ],
        ]))).toEqual([ 1 ]);
      });

      it('should getFirst variable, null or undefined terms', () => {
        expect(index.getFirst(BF.bindings())).toBeUndefined();
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.variable('b') ],
        ]))).toBe(1);
      });

      it('should get partially matching concrete terms', () => {
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('2') ],
        ]))).toEqual([ 1 ]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('c'), DF.namedNode('3') ],
        ]))).toEqual([ 1 ]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
        ]))).toEqual([ 1 ]);
        expect(index.get(BF.bindings([
          [ DF.variable('b'), DF.namedNode('2') ],
        ]))).toEqual([ 1 ]);
        expect(index.get(BF.bindings([
          [ DF.variable('c'), DF.namedNode('3') ],
        ]))).toEqual([ 1 ]);
      });

      it('should getFirst partially matching concrete terms', () => {
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('2') ],
        ]))).toBe(1);
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('c'), DF.namedNode('3') ],
        ]))).toBe(1);
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
        ]))).toBe(1);
        expect(index.getFirst(BF.bindings([
          [ DF.variable('b'), DF.namedNode('2') ],
        ]))).toBe(1);
        expect(index.getFirst(BF.bindings([
          [ DF.variable('c'), DF.namedNode('3') ],
        ]))).toBe(1);
      });

      it('should not get partially non-matching concrete terms', () => {
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('2x') ],
        ]))).toEqual([]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('c'), DF.namedNode('3x') ],
        ]))).toEqual([]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1x') ],
        ]))).toEqual([]);
        expect(index.get(BF.bindings([
          [ DF.variable('b'), DF.namedNode('2x') ],
        ]))).toEqual([]);
        expect(index.get(BF.bindings([
          [ DF.variable('c'), DF.namedNode('3x') ],
        ]))).toEqual([]);
      });

      it('should not getFirst partially non-matching concrete terms', () => {
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('2x') ],
        ]))).toBeUndefined();
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('c'), DF.namedNode('3x') ],
        ]))).toBeUndefined();
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1x') ],
        ]))).toBeUndefined();
        expect(index.getFirst(BF.bindings([
          [ DF.variable('b'), DF.namedNode('2x') ],
        ]))).toBeUndefined();
        expect(index.getFirst(BF.bindings([
          [ DF.variable('c'), DF.namedNode('3x') ],
        ]))).toBeUndefined();
      });
    });

    describe('with one bindings with variables', () => {
      beforeEach(() => {
        index.put(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.variable('V') ],
          [ DF.variable('c'), DF.namedNode('3') ],
        ]), 1);
      });

      describe('values', () => {
        it('should return all values', () => {
          expect(index.values()).toEqual([ 1 ]);
        });
      });

      it('should not get non-matching concrete terms', () => {
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('NON') ],
          [ DF.variable('b'), DF.namedNode('NON') ],
          [ DF.variable('c'), DF.namedNode('NON') ],
        ]))).toEqual([]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('NON') ],
          [ DF.variable('c'), DF.namedNode('NON') ],
        ]))).toEqual([]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('2') ],
          [ DF.variable('c'), DF.namedNode('NON') ],
        ]))).toEqual([]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('NON') ],
          [ DF.variable('c'), DF.namedNode('3') ],
        ]))).toEqual([ 1 ]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('NON') ],
          [ DF.variable('b'), DF.namedNode('NON') ],
          [ DF.variable('c'), DF.namedNode('3') ],
        ]))).toEqual([]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('NON') ],
          [ DF.variable('b'), DF.namedNode('2') ],
          [ DF.variable('c'), DF.namedNode('3') ],
        ]))).toEqual([]);
      });

      it('should not getFirst non-matching concrete terms', () => {
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('NON') ],
          [ DF.variable('b'), DF.namedNode('NON') ],
          [ DF.variable('c'), DF.namedNode('NON') ],
        ]))).toBeUndefined();
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('NON') ],
          [ DF.variable('c'), DF.namedNode('NON') ],
        ]))).toBeUndefined();
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('2') ],
          [ DF.variable('c'), DF.namedNode('NON') ],
        ]))).toBeUndefined();
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('NON') ],
          [ DF.variable('c'), DF.namedNode('3') ],
        ]))).toBe(1);
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('NON') ],
          [ DF.variable('b'), DF.namedNode('NON') ],
          [ DF.variable('c'), DF.namedNode('3') ],
        ]))).toBeUndefined();
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('NON') ],
          [ DF.variable('b'), DF.namedNode('2') ],
          [ DF.variable('c'), DF.namedNode('3') ],
        ]))).toBeUndefined();
      });

      it('should get matching concrete terms', () => {
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('2') ],
          [ DF.variable('c'), DF.namedNode('3') ],
        ]))).toEqual([ 1 ]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('ABC') ],
          [ DF.variable('c'), DF.namedNode('3') ],
        ]))).toEqual([ 1 ]);
      });

      it('should getFirst matching concrete terms', () => {
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('2') ],
          [ DF.variable('c'), DF.namedNode('3') ],
        ]))).toBe(1);
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('ABC') ],
          [ DF.variable('c'), DF.namedNode('3') ],
        ]))).toBe(1);
      });

      it('should get variable, null or undefined terms', () => {
        expect(index.get(BF.bindings())).toEqual([]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.variable('b') ],
        ]))).toEqual([ 1 ]);
      });

      it('should getFirst variable, null or undefined terms', () => {
        expect(index.getFirst(BF.bindings())).toBeUndefined();
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.variable('b') ],
        ]))).toBe(1);
      });

      it('should get partially matching concrete terms', () => {
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('ABC') ],
        ]))).toEqual([ 1 ]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('c'), DF.namedNode('3') ],
        ]))).toEqual([ 1 ]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
        ]))).toEqual([ 1 ]);
        expect(index.get(BF.bindings([
          [ DF.variable('b'), DF.namedNode('ABC') ],
        ]))).toEqual([ 1 ]);
        expect(index.get(BF.bindings([
          [ DF.variable('c'), DF.namedNode('3') ],
        ]))).toEqual([ 1 ]);
      });

      it('should getFirst partially matching concrete terms', () => {
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('ABC') ],
        ]))).toBe(1);
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('c'), DF.namedNode('3') ],
        ]))).toBe(1);
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
        ]))).toBe(1);
        expect(index.getFirst(BF.bindings([
          [ DF.variable('b'), DF.namedNode('ABC') ],
        ]))).toBe(1);
        expect(index.getFirst(BF.bindings([
          [ DF.variable('c'), DF.namedNode('3') ],
        ]))).toBe(1);
      });

      it('should not get partially non-matching concrete terms', () => {
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1x') ],
          [ DF.variable('b'), DF.namedNode('2') ],
        ]))).toEqual([]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1x') ],
          [ DF.variable('c'), DF.namedNode('3x') ],
        ]))).toEqual([]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1x') ],
        ]))).toEqual([]);
        expect(index.get(BF.bindings([
          [ DF.variable('b'), DF.namedNode('2x') ],
        ]))).toEqual([ 1 ]);
        expect(index.get(BF.bindings([
          [ DF.variable('c'), DF.namedNode('3x') ],
        ]))).toEqual([]);
      });

      it('should not getFirst partially non-matching concrete terms', () => {
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1x') ],
          [ DF.variable('b'), DF.namedNode('2') ],
        ]))).toBeUndefined();
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1x') ],
          [ DF.variable('c'), DF.namedNode('3x') ],
        ]))).toBeUndefined();
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1x') ],
        ]))).toBeUndefined();
        expect(index.getFirst(BF.bindings([
          [ DF.variable('b'), DF.namedNode('2x') ],
        ]))).toBe(1);
        expect(index.getFirst(BF.bindings([
          [ DF.variable('c'), DF.namedNode('3x') ],
        ]))).toBeUndefined();
      });
    });

    describe('with three bindings', () => {
      beforeEach(() => {
        index.put(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('2a') ],
          [ DF.variable('c'), DF.namedNode('3a') ],
        ]), 1);
        index.put(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('2b') ],
          [ DF.variable('c'), DF.namedNode('3b') ],
        ]), 2);
        index.put(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1x') ],
          [ DF.variable('b'), DF.namedNode('2y') ],
          [ DF.variable('c'), DF.namedNode('3z') ],
        ]), 3);
      });

      describe('values', () => {
        it('should return all values', () => {
          expect(index.values()).toEqual([ 1, 2, 3 ]);
        });
      });

      it('should not get non-matching concrete terms', () => {
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('NON') ],
          [ DF.variable('b'), DF.namedNode('NON') ],
          [ DF.variable('c'), DF.namedNode('NON') ],
        ]))).toEqual([]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('NON') ],
          [ DF.variable('c'), DF.namedNode('NON') ],
        ]))).toEqual([]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('2') ],
          [ DF.variable('c'), DF.namedNode('NON') ],
        ]))).toEqual([]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('NON') ],
          [ DF.variable('c'), DF.namedNode('3') ],
        ]))).toEqual([]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('NON') ],
          [ DF.variable('b'), DF.namedNode('NON') ],
          [ DF.variable('c'), DF.namedNode('3') ],
        ]))).toEqual([]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('NON') ],
          [ DF.variable('b'), DF.namedNode('2') ],
          [ DF.variable('c'), DF.namedNode('3') ],
        ]))).toEqual([]);
      });

      it('should not getFirst non-matching concrete terms', () => {
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('NON') ],
          [ DF.variable('b'), DF.namedNode('NON') ],
          [ DF.variable('c'), DF.namedNode('NON') ],
        ]))).toBeUndefined();
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('NON') ],
          [ DF.variable('c'), DF.namedNode('NON') ],
        ]))).toBeUndefined();
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('2') ],
          [ DF.variable('c'), DF.namedNode('NON') ],
        ]))).toBeUndefined();
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('NON') ],
          [ DF.variable('c'), DF.namedNode('3') ],
        ]))).toBeUndefined();
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('NON') ],
          [ DF.variable('b'), DF.namedNode('NON') ],
          [ DF.variable('c'), DF.namedNode('3') ],
        ]))).toBeUndefined();
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('NON') ],
          [ DF.variable('b'), DF.namedNode('2') ],
          [ DF.variable('c'), DF.namedNode('3') ],
        ]))).toBeUndefined();
      });

      it('should get matching concrete terms', () => {
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('2a') ],
          [ DF.variable('c'), DF.namedNode('3a') ],
        ]))).toEqual([ 1 ]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('2b') ],
          [ DF.variable('c'), DF.namedNode('3b') ],
        ]))).toEqual([ 2 ]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1x') ],
          [ DF.variable('b'), DF.namedNode('2y') ],
          [ DF.variable('c'), DF.namedNode('3z') ],
        ]))).toEqual([ 3 ]);
      });

      it('should getFirst matching concrete terms', () => {
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('2a') ],
          [ DF.variable('c'), DF.namedNode('3a') ],
        ]))).toBe(1);
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('2b') ],
          [ DF.variable('c'), DF.namedNode('3b') ],
        ]))).toBe(2);
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1x') ],
          [ DF.variable('b'), DF.namedNode('2y') ],
          [ DF.variable('c'), DF.namedNode('3z') ],
        ]))).toBe(3);
      });

      it('should get variable, null or undefined terms', () => {
        expect(index.get(BF.bindings())).toEqual([]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.variable('b') ],
          [ DF.variable('b'), DF.variable('b') ],
          [ DF.variable('c'), DF.variable('b') ],
        ]))).toEqual([ 1, 2, 3 ]);
      });

      it('should getFirst variable, null or undefined terms', () => {
        expect(index.getFirst(BF.bindings())).toBeUndefined();
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.variable('b') ],
          [ DF.variable('b'), DF.variable('b') ],
          [ DF.variable('c'), DF.variable('b') ],
        ]))).toBe(1);
      });

      it('should get partially matching concrete terms', () => {
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('2a') ],
        ]))).toEqual([ 1 ]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('2b') ],
        ]))).toEqual([ 2 ]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1x') ],
          [ DF.variable('b'), DF.namedNode('2y') ],
        ]))).toEqual([ 3 ]);

        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('c'), DF.namedNode('3a') ],
        ]))).toEqual([ 1 ]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('c'), DF.namedNode('3b') ],
        ]))).toEqual([ 2 ]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1x') ],
          [ DF.variable('c'), DF.namedNode('3z') ],
        ]))).toEqual([ 3 ]);

        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
        ]))).toEqual([ 1, 2 ]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1x') ],
        ]))).toEqual([ 3 ]);

        expect(index.get(BF.bindings([
          [ DF.variable('b'), DF.namedNode('2a') ],
        ]))).toEqual([ 1 ]);
        expect(index.get(BF.bindings([
          [ DF.variable('b'), DF.namedNode('2b') ],
        ]))).toEqual([ 2 ]);
        expect(index.get(BF.bindings([
          [ DF.variable('b'), DF.namedNode('2y') ],
        ]))).toEqual([ 3 ]);

        expect(index.get(BF.bindings([
          [ DF.variable('c'), DF.namedNode('3a') ],
        ]))).toEqual([ 1 ]);
        expect(index.get(BF.bindings([
          [ DF.variable('c'), DF.namedNode('3b') ],
        ]))).toEqual([ 2 ]);
        expect(index.get(BF.bindings([
          [ DF.variable('c'), DF.namedNode('3z') ],
        ]))).toEqual([ 3 ]);
      });

      it('should getFirst partially matching concrete terms', () => {
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('2a') ],
        ]))).toBe(1);
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('2b') ],
        ]))).toBe(2);
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1x') ],
          [ DF.variable('b'), DF.namedNode('2y') ],
        ]))).toBe(3);

        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('c'), DF.namedNode('3a') ],
        ]))).toBe(1);
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('c'), DF.namedNode('3b') ],
        ]))).toBe(2);
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1x') ],
          [ DF.variable('c'), DF.namedNode('3z') ],
        ]))).toBe(3);

        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
        ]))).toBe(1);
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1x') ],
        ]))).toBe(3);

        expect(index.getFirst(BF.bindings([
          [ DF.variable('b'), DF.namedNode('2a') ],
        ]))).toBe(1);
        expect(index.getFirst(BF.bindings([
          [ DF.variable('b'), DF.namedNode('2b') ],
        ]))).toBe(2);
        expect(index.getFirst(BF.bindings([
          [ DF.variable('b'), DF.namedNode('2y') ],
        ]))).toBe(3);

        expect(index.getFirst(BF.bindings([
          [ DF.variable('c'), DF.namedNode('3a') ],
        ]))).toBe(1);
        expect(index.getFirst(BF.bindings([
          [ DF.variable('c'), DF.namedNode('3b') ],
        ]))).toBe(2);
        expect(index.getFirst(BF.bindings([
          [ DF.variable('c'), DF.namedNode('3z') ],
        ]))).toBe(3);
      });

      it('should not get partially non-matching concrete terms', () => {
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('2x') ],
        ]))).toEqual([]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('c'), DF.namedNode('3x') ],
        ]))).toEqual([]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1y') ],
        ]))).toEqual([]);
        expect(index.get(BF.bindings([
          [ DF.variable('b'), DF.namedNode('2x') ],
        ]))).toEqual([]);
        expect(index.get(BF.bindings([
          [ DF.variable('c'), DF.namedNode('3x') ],
        ]))).toEqual([]);
      });

      it('should not getFirst partially non-matching concrete terms', () => {
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('2x') ],
        ]))).toBeUndefined();
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('c'), DF.namedNode('3x') ],
        ]))).toBeUndefined();
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1y') ],
        ]))).toBeUndefined();
        expect(index.getFirst(BF.bindings([
          [ DF.variable('b'), DF.namedNode('2x') ],
        ]))).toBeUndefined();
        expect(index.getFirst(BF.bindings([
          [ DF.variable('c'), DF.namedNode('3x') ],
        ]))).toBeUndefined();
      });
    });
  });

  describe('with two keys', () => {
    beforeEach(() => {
      index = new BindingsIndexUndef([ DF.variable('a'), DF.variable('b') ], hashFn);
    });

    describe('with mixed bindings', () => {
      beforeEach(() => {
        index.put(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1a') ],
          [ DF.variable('b'), DF.namedNode('2a') ],
        ]), 1);
        index.put(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1a') ],
        ]), 2);
        index.put(BF.bindings([
          [ DF.variable('b'), DF.namedNode('2b') ],
        ]), 3);
        index.put(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1b') ],
          [ DF.variable('b'), DF.namedNode('2b') ],
        ]), 4);
        index.put(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1d') ],
          [ DF.variable('b'), DF.namedNode('2d') ],
        ]), 5);
      });

      describe('values', () => {
        it('should return all values', () => {
          expect(index.values()).toEqual([ 1, 2, 3, 4, 5 ]);
        });
      });

      it('should not get non-matching concrete terms', () => {
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('NON') ],
          [ DF.variable('b'), DF.namedNode('NON') ],
        ]))).toEqual([]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1a') ],
          [ DF.variable('b'), DF.namedNode('NON') ],
        ]))).toEqual([ 2 ]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1b') ],
          [ DF.variable('b'), DF.namedNode('NON') ],
        ]))).toEqual([]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1d') ],
          [ DF.variable('b'), DF.namedNode('NON') ],
        ]))).toEqual([]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('NON') ],
          [ DF.variable('b'), DF.namedNode('2d') ],
        ]))).toEqual([]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('NON') ],
          [ DF.variable('b'), DF.namedNode('2b') ],
        ]))).toEqual([ 3 ]);
      });

      it('should not getFirst non-matching concrete terms', () => {
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('NON') ],
          [ DF.variable('b'), DF.namedNode('NON') ],
        ]))).toBeUndefined();
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1a') ],
          [ DF.variable('b'), DF.namedNode('NON') ],
        ]))).toBe(2);
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1b') ],
          [ DF.variable('b'), DF.namedNode('NON') ],
        ]))).toBeUndefined();
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1d') ],
          [ DF.variable('b'), DF.namedNode('NON') ],
        ]))).toBeUndefined();
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('NON') ],
          [ DF.variable('b'), DF.namedNode('2d') ],
        ]))).toBeUndefined();
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('NON') ],
          [ DF.variable('b'), DF.namedNode('2b') ],
        ]))).toBe(3);
      });

      it('should get matching concrete terms', () => {
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1a') ],
          [ DF.variable('b'), DF.namedNode('2a') ],
        ]))).toEqual([ 1, 2 ]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1a') ],
          [ DF.variable('b'), DF.namedNode('ANY') ],
        ]))).toEqual([ 2 ]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('ANY') ],
          [ DF.variable('b'), DF.namedNode('2b') ],
        ]))).toEqual([ 3 ]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1b') ],
          [ DF.variable('b'), DF.namedNode('2b') ],
        ]))).toEqual([ 4, 3 ]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1d') ],
          [ DF.variable('b'), DF.namedNode('2d') ],
        ]))).toEqual([ 5 ]);
      });

      it('should getFirst matching concrete terms', () => {
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1a') ],
          [ DF.variable('b'), DF.namedNode('2a') ],
        ]))).toBe(1);
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1a') ],
          [ DF.variable('b'), DF.namedNode('ANY') ],
        ]))).toBe(2);
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('ANY') ],
          [ DF.variable('b'), DF.namedNode('2b') ],
        ]))).toBe(3);
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1b') ],
          [ DF.variable('b'), DF.namedNode('2b') ],
        ]))).toBe(4);
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1d') ],
          [ DF.variable('b'), DF.namedNode('2d') ],
        ]))).toBe(5);
      });

      it('should get variable, null or undefined terms', () => {
        expect(index.get(BF.bindings())).toEqual([]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.variable('b') ],
          [ DF.variable('b'), DF.variable('b') ],
        ]))).toEqual([ 1, 2, 3, 4, 5 ]);
      });

      it('should getFirst variable, null or undefined terms', () => {
        expect(index.getFirst(BF.bindings())).toBeUndefined();
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.variable('b') ],
          [ DF.variable('b'), DF.variable('b') ],
        ]))).toBe(1);
      });

      it('should get partially matching concrete terms', () => {
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1a') ],
        ]))).toEqual([ 1, 2, 3 ]);
        expect(index.get(BF.bindings([
          [ DF.variable('b'), DF.namedNode('2a') ],
        ]))).toEqual([ 1, 2 ]);
        expect(index.get(BF.bindings())).toEqual([]);

        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1a') ],
        ]))).toEqual([ 1, 2, 3 ]);
        expect(index.get(BF.bindings([
          [ DF.variable('b'), DF.namedNode('ANY') ],
        ]))).toEqual([ 2 ]);

        expect(index.get(BF.bindings([
          [ DF.variable('b'), DF.namedNode('2b') ],
        ]))).toEqual([ 2, 3, 4 ]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('ANY') ],
        ]))).toEqual([ 3 ]);

        expect(index.get(BF.bindings([
          [ DF.variable('b'), DF.namedNode('2d') ],
        ]))).toEqual([ 2, 5 ]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1d') ],
        ]))).toEqual([ 5, 3 ]);
      });

      it('should getFirst partially matching concrete terms', () => {
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1a') ],
        ]))).toBe(1);
        expect(index.getFirst(BF.bindings([
          [ DF.variable('b'), DF.namedNode('2a') ],
        ]))).toBe(1);
        expect(index.getFirst(BF.bindings())).toBeUndefined();

        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1a') ],
        ]))).toBe(1);
        expect(index.getFirst(BF.bindings([
          [ DF.variable('b'), DF.namedNode('ANY') ],
        ]))).toBe(2);

        expect(index.getFirst(BF.bindings([
          [ DF.variable('b'), DF.namedNode('2b') ],
        ]))).toBe(2);
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('ANY') ],
        ]))).toBe(3);

        expect(index.getFirst(BF.bindings([
          [ DF.variable('b'), DF.namedNode('2d') ],
        ]))).toBe(2);
        expect(index.getFirst(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1d') ],
        ]))).toBe(5);
      });
    });
  });

  describe('with three keys and one extra key', () => {
    beforeEach(() => {
      index = new BindingsIndexUndef([ DF.variable('b'), DF.variable('c') ], hashFn);
      index.put(BF.bindings([
        [ DF.variable('d'), DF.namedNode('d0') ],
      ]), 1);
      index.put(BF.bindings([
        [ DF.variable('b'), DF.namedNode('b1') ],
        [ DF.variable('c'), DF.namedNode('c1') ],
        [ DF.variable('d'), DF.namedNode('d1') ],
      ]), 2);
      index.put(BF.bindings([
        [ DF.variable('b'), DF.namedNode('b2') ],
        [ DF.variable('d'), DF.namedNode('d2') ],
      ]), 3);
      index.put(BF.bindings([
        [ DF.variable('b'), DF.namedNode('b3') ],
        [ DF.variable('c'), DF.namedNode('cx') ],
        [ DF.variable('d'), DF.namedNode('d3') ],
      ]), 4);
    });

    describe('values', () => {
      it('should return all values', () => {
        expect(index.values()).toEqual([ 2, 3, 4 ]);
      });
    });

    it('should get bindings according to the spec', () => {
      expect(index.get(BF.bindings([
        [ DF.variable('a'), DF.namedNode('a0') ],
        [ DF.variable('b'), DF.namedNode('b0') ],
        [ DF.variable('c'), DF.namedNode('c0') ],
      ]))).toEqual([]);
      expect(index.get(BF.bindings([
        [ DF.variable('a'), DF.namedNode('a1') ],
        [ DF.variable('b'), DF.namedNode('b1') ],
        [ DF.variable('c'), DF.namedNode('c1') ],
      ]))).toEqual([ 2 ]);
      expect(index.get(BF.bindings([
        [ DF.variable('a'), DF.namedNode('a2') ],
        [ DF.variable('b'), DF.namedNode('b2') ],
        [ DF.variable('c'), DF.namedNode('c2') ],
      ]))).toEqual([ 3 ]);
      expect(index.get(BF.bindings([
        [ DF.variable('a'), DF.namedNode('a3') ],
        [ DF.variable('b'), DF.namedNode('b3') ],
        [ DF.variable('c'), DF.namedNode('c3') ],
      ]))).toEqual([]);
    });

    it('should getFirst bindings according to the spec', () => {
      expect(index.getFirst(BF.bindings([
        [ DF.variable('a'), DF.namedNode('a0') ],
        [ DF.variable('b'), DF.namedNode('b0') ],
        [ DF.variable('c'), DF.namedNode('c0') ],
      ]))).toBeUndefined();
      expect(index.getFirst(BF.bindings([
        [ DF.variable('a'), DF.namedNode('a1') ],
        [ DF.variable('b'), DF.namedNode('b1') ],
        [ DF.variable('c'), DF.namedNode('c1') ],
      ]))).toBe(2);
      expect(index.getFirst(BF.bindings([
        [ DF.variable('a'), DF.namedNode('a2') ],
        [ DF.variable('b'), DF.namedNode('b2') ],
        [ DF.variable('c'), DF.namedNode('c2') ],
      ]))).toBe(3);
      expect(index.getFirst(BF.bindings([
        [ DF.variable('a'), DF.namedNode('a3') ],
        [ DF.variable('b'), DF.namedNode('b3') ],
        [ DF.variable('c'), DF.namedNode('c3') ],
      ]))).toBeUndefined();
    });
  });
});
