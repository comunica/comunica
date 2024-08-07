import { BindingsFactory } from '@comunica/bindings-factory';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import { DataFactory } from 'rdf-data-factory';
import { BindingsIndexDef } from '../lib/BindingsIndexDef';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);

const hashFn = ActorRdfJoin.hashNonClashing;

describe('BindingsIndexDef', () => {
  let index: BindingsIndexDef<number>;

  describe('without keys', () => {
    beforeEach(() => {
      index = new BindingsIndexDef([], hashFn);
    });

    describe('values', () => {
      it('should return all values', () => {
        expect(index.values()).toEqual([]);
      });
    });

    describe('without bindings', () => {
      it('should contain nothing', () => {
        expect(index.get(BF.bindings())).toEqual([]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('b') ],
        ]))).toEqual([]);
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.variable('b') ],
        ]))).toEqual([]);
      });
    });
  });

  describe('with one key', () => {
    beforeEach(() => {
      index = new BindingsIndexDef([ DF.variable('a') ], hashFn);
    });

    describe('without bindings', () => {
      it('should not contain concrete terms', () => {
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('b') ],
        ]))).toEqual([]);
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

      it('should not contain non-matching concrete terms', () => {
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('NON') ],
        ]))).toEqual([]);
      });

      it('should contain matching concrete terms', () => {
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('b') ],
        ]))).toEqual([ 1 ]);
      });
    });
  });

  describe('with three keys', () => {
    beforeEach(() => {
      index = new BindingsIndexDef([ DF.variable('a'), DF.variable('b'), DF.variable('c') ], hashFn);
    });

    describe('without bindings', () => {
      it('should not contain concrete terms', () => {
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('2') ],
          [ DF.variable('c'), DF.namedNode('3') ],
        ]))).toEqual([]);
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

      it('should not contain non-matching concrete terms', () => {
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

      it('should contain matching concrete terms', () => {
        expect(index.get(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('2') ],
          [ DF.variable('c'), DF.namedNode('3') ],
        ]))).toEqual([ 1 ]);
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

      it('should not contain non-matching concrete terms', () => {
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

      it('should contain matching concrete terms', () => {
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
    });
  });
});
