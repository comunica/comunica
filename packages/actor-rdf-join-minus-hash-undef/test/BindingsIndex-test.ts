import { BindingsFactory } from '@comunica/bindings-factory';
import { DataFactory } from 'rdf-data-factory';
import { BindingsIndex } from '../lib/BindingsIndex';

const DF = new DataFactory();
const BF = new BindingsFactory();

describe('BindingsIndex', () => {
  let index: BindingsIndex;

  describe('without keys', () => {
    beforeEach(() => {
      index = new BindingsIndex([]);
    });

    describe('without bindings', () => {
      it('should contain nothing', () => {
        expect(index.contains(BF.bindings())).toBeFalsy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('b') ],
        ]))).toBeFalsy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.variable('b') ],
        ]))).toBeFalsy();
      });
    });

    describe('with one bindings', () => {
      beforeEach(() => {
        index.add(BF.bindings([
          [ DF.variable('x'), DF.namedNode('b') ],
        ]));
      });

      it('should contain nothing', () => {
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('b') ],
        ]))).toBeFalsy();
        expect(index.contains(BF.bindings())).toBeFalsy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.variable('b') ],
        ]))).toBeFalsy();
      });
    });
  });

  describe('with one key', () => {
    beforeEach(() => {
      index = new BindingsIndex([ DF.variable('a') ]);
    });

    describe('without bindings', () => {
      it('should not contain concrete terms', () => {
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('b') ],
        ]))).toBeFalsy();
      });

      it('should handle variable, null or undefined terms', () => {
        expect(index.contains(BF.bindings())).toBeFalsy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.variable('b') ],
        ]))).toBeTruthy();
      });
    });

    describe('with one bindings', () => {
      beforeEach(() => {
        index.add(BF.bindings([
          [ DF.variable('a'), DF.namedNode('b') ],
        ]));
      });

      it('should not contain non-matching concrete terms', () => {
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('NON') ],
        ]))).toBeFalsy();
      });

      it('should contain matching concrete terms', () => {
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('b') ],
        ]))).toBeTruthy();
      });

      it('should handle variable, null or undefined terms', () => {
        expect(index.contains(BF.bindings())).toBeFalsy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.variable('b') ],
        ]))).toBeTruthy();
      });
    });
  });

  describe('with three keys', () => {
    beforeEach(() => {
      index = new BindingsIndex([ DF.variable('a'), DF.variable('b'), DF.variable('c') ]);
    });

    describe('without bindings', () => {
      it('should not contain concrete terms', () => {
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('2') ],
          [ DF.variable('c'), DF.namedNode('3') ],
        ]))).toBeFalsy();
      });

      it('should handle variable, null or undefined terms', () => {
        expect(index.contains(BF.bindings())).toBeFalsy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.variable('1-') ],
          [ DF.variable('b'), DF.variable('2-') ],
          [ DF.variable('c'), DF.variable('3-') ],
        ]))).toBeTruthy();
      });

      it('should not contain partially concrete terms', () => {
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.variable('1') ],
          [ DF.variable('b'), DF.namedNode('2') ],
          [ DF.variable('c'), DF.variable('3') ],
        ]))).toBeFalsy();
      });
    });

    describe('with one bindings', () => {
      beforeEach(() => {
        index.add(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('2') ],
          [ DF.variable('c'), DF.namedNode('3') ],
        ]));
      });

      it('should not contain non-matching concrete terms', () => {
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('NON') ],
          [ DF.variable('b'), DF.namedNode('NON') ],
          [ DF.variable('c'), DF.namedNode('NON') ],
        ]))).toBeFalsy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('NON') ],
          [ DF.variable('c'), DF.namedNode('NON') ],
        ]))).toBeFalsy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('2') ],
          [ DF.variable('c'), DF.namedNode('NON') ],
        ]))).toBeFalsy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('NON') ],
          [ DF.variable('c'), DF.namedNode('3') ],
        ]))).toBeFalsy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('NON') ],
          [ DF.variable('b'), DF.namedNode('NON') ],
          [ DF.variable('c'), DF.namedNode('3') ],
        ]))).toBeFalsy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('NON') ],
          [ DF.variable('b'), DF.namedNode('2') ],
          [ DF.variable('c'), DF.namedNode('3') ],
        ]))).toBeFalsy();
      });

      it('should contain matching concrete terms', () => {
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('2') ],
          [ DF.variable('c'), DF.namedNode('3') ],
        ]))).toBeTruthy();
      });

      it('should handle variable, null or undefined terms', () => {
        expect(index.contains(BF.bindings())).toBeFalsy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.variable('b') ],
        ]))).toBeTruthy();
      });

      it('should contain partially matching concrete terms', () => {
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('2') ],
        ]))).toBeTruthy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('c'), DF.namedNode('3') ],
        ]))).toBeTruthy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
        ]))).toBeTruthy();
        expect(index.contains(BF.bindings([
          [ DF.variable('b'), DF.namedNode('2') ],
        ]))).toBeTruthy();
        expect(index.contains(BF.bindings([
          [ DF.variable('c'), DF.namedNode('3') ],
        ]))).toBeTruthy();
      });

      it('should not contain partially non-matching concrete terms', () => {
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('2x') ],
        ]))).toBeFalsy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('c'), DF.namedNode('3x') ],
        ]))).toBeFalsy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1x') ],
        ]))).toBeFalsy();
        expect(index.contains(BF.bindings([
          [ DF.variable('b'), DF.namedNode('2x') ],
        ]))).toBeFalsy();
        expect(index.contains(BF.bindings([
          [ DF.variable('c'), DF.namedNode('3x') ],
        ]))).toBeFalsy();
      });
    });

    describe('with one bindings with variables', () => {
      beforeEach(() => {
        index.add(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.variable('V') ],
          [ DF.variable('c'), DF.namedNode('3') ],
        ]));
      });

      it('should not contain non-matching concrete terms', () => {
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('NON') ],
          [ DF.variable('b'), DF.namedNode('NON') ],
          [ DF.variable('c'), DF.namedNode('NON') ],
        ]))).toBeFalsy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('NON') ],
          [ DF.variable('c'), DF.namedNode('NON') ],
        ]))).toBeFalsy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('2') ],
          [ DF.variable('c'), DF.namedNode('NON') ],
        ]))).toBeFalsy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('NON') ],
          [ DF.variable('c'), DF.namedNode('3') ],
        ]))).toBeTruthy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('NON') ],
          [ DF.variable('b'), DF.namedNode('NON') ],
          [ DF.variable('c'), DF.namedNode('3') ],
        ]))).toBeFalsy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('NON') ],
          [ DF.variable('b'), DF.namedNode('2') ],
          [ DF.variable('c'), DF.namedNode('3') ],
        ]))).toBeFalsy();
      });

      it('should contain matching concrete terms', () => {
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('2') ],
          [ DF.variable('c'), DF.namedNode('3') ],
        ]))).toBeTruthy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('ABC') ],
          [ DF.variable('c'), DF.namedNode('3') ],
        ]))).toBeTruthy();
      });

      it('should handle variable, null or undefined terms', () => {
        expect(index.contains(BF.bindings())).toBeFalsy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.variable('b') ],
        ]))).toBeTruthy();
      });

      it('should contain partially matching concrete terms', () => {
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('ABC') ],
        ]))).toBeTruthy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('c'), DF.namedNode('3') ],
        ]))).toBeTruthy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
        ]))).toBeTruthy();
        expect(index.contains(BF.bindings([
          [ DF.variable('b'), DF.namedNode('ABC') ],
        ]))).toBeTruthy();
        expect(index.contains(BF.bindings([
          [ DF.variable('c'), DF.namedNode('3') ],
        ]))).toBeTruthy();
      });

      it('should not contain partially non-matching concrete terms', () => {
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1x') ],
          [ DF.variable('b'), DF.namedNode('2') ],
        ]))).toBeFalsy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1x') ],
          [ DF.variable('c'), DF.namedNode('3x') ],
        ]))).toBeFalsy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1x') ],
        ]))).toBeFalsy();
        expect(index.contains(BF.bindings([
          [ DF.variable('b'), DF.namedNode('2x') ],
        ]))).toBeTruthy();
        expect(index.contains(BF.bindings([
          [ DF.variable('c'), DF.namedNode('3x') ],
        ]))).toBeFalsy();
      });
    });

    describe('with three bindings', () => {
      beforeEach(() => {
        index.add(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('2a') ],
          [ DF.variable('c'), DF.namedNode('3a') ],
        ]));
        index.add(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('2b') ],
          [ DF.variable('c'), DF.namedNode('3b') ],
        ]));
        index.add(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1x') ],
          [ DF.variable('b'), DF.namedNode('2y') ],
          [ DF.variable('c'), DF.namedNode('3z') ],
        ]));
      });

      it('should not contain non-matching concrete terms', () => {
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('NON') ],
          [ DF.variable('b'), DF.namedNode('NON') ],
          [ DF.variable('c'), DF.namedNode('NON') ],
        ]))).toBeFalsy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('NON') ],
          [ DF.variable('c'), DF.namedNode('NON') ],
        ]))).toBeFalsy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('2') ],
          [ DF.variable('c'), DF.namedNode('NON') ],
        ]))).toBeFalsy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('NON') ],
          [ DF.variable('c'), DF.namedNode('3') ],
        ]))).toBeFalsy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('NON') ],
          [ DF.variable('b'), DF.namedNode('NON') ],
          [ DF.variable('c'), DF.namedNode('3') ],
        ]))).toBeFalsy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('NON') ],
          [ DF.variable('b'), DF.namedNode('2') ],
          [ DF.variable('c'), DF.namedNode('3') ],
        ]))).toBeFalsy();
      });

      it('should contain matching concrete terms', () => {
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('2a') ],
          [ DF.variable('c'), DF.namedNode('3a') ],
        ]))).toBeTruthy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('2b') ],
          [ DF.variable('c'), DF.namedNode('3b') ],
        ]))).toBeTruthy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1x') ],
          [ DF.variable('b'), DF.namedNode('2y') ],
          [ DF.variable('c'), DF.namedNode('3z') ],
        ]))).toBeTruthy();
      });

      it('should handle variable, null or undefined terms', () => {
        expect(index.contains(BF.bindings())).toBeFalsy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.variable('b') ],
          [ DF.variable('b'), DF.variable('b') ],
          [ DF.variable('c'), DF.variable('b') ],
        ]))).toBeTruthy();
      });

      it('should contain partially matching concrete terms', () => {
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('2a') ],
        ]))).toBeTruthy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('2b') ],
        ]))).toBeTruthy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1x') ],
          [ DF.variable('b'), DF.namedNode('2y') ],
        ]))).toBeTruthy();

        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('c'), DF.namedNode('3a') ],
        ]))).toBeTruthy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('c'), DF.namedNode('3b') ],
        ]))).toBeTruthy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1x') ],
          [ DF.variable('c'), DF.namedNode('3z') ],
        ]))).toBeTruthy();

        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
        ]))).toBeTruthy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1x') ],
        ]))).toBeTruthy();

        expect(index.contains(BF.bindings([
          [ DF.variable('b'), DF.namedNode('2a') ],
        ]))).toBeTruthy();
        expect(index.contains(BF.bindings([
          [ DF.variable('b'), DF.namedNode('2b') ],
        ]))).toBeTruthy();
        expect(index.contains(BF.bindings([
          [ DF.variable('b'), DF.namedNode('2y') ],
        ]))).toBeTruthy();

        expect(index.contains(BF.bindings([
          [ DF.variable('c'), DF.namedNode('3a') ],
        ]))).toBeTruthy();
        expect(index.contains(BF.bindings([
          [ DF.variable('c'), DF.namedNode('3a') ],
        ]))).toBeTruthy();
        expect(index.contains(BF.bindings([
          [ DF.variable('c'), DF.namedNode('3z') ],
        ]))).toBeTruthy();
      });

      it('should not contain partially non-matching concrete terms', () => {
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('b'), DF.namedNode('2x') ],
        ]))).toBeFalsy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1') ],
          [ DF.variable('c'), DF.namedNode('3x') ],
        ]))).toBeFalsy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1y') ],
        ]))).toBeFalsy();
        expect(index.contains(BF.bindings([
          [ DF.variable('b'), DF.namedNode('2x') ],
        ]))).toBeFalsy();
        expect(index.contains(BF.bindings([
          [ DF.variable('c'), DF.namedNode('3x') ],
        ]))).toBeFalsy();
      });
    });
  });

  describe('with two keys', () => {
    beforeEach(() => {
      index = new BindingsIndex([ DF.variable('a'), DF.variable('b') ]);
    });

    describe('with mixed bindings', () => {
      beforeEach(() => {
        index.add(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1a') ],
          [ DF.variable('b'), DF.namedNode('2a') ],
        ]));
        index.add(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1a') ],
        ]));
        index.add(BF.bindings([
          [ DF.variable('b'), DF.namedNode('2b') ],
        ]));
        index.add(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1b') ],
          [ DF.variable('b'), DF.namedNode('2b') ],
        ]));
        index.add(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1d') ],
          [ DF.variable('b'), DF.namedNode('2d') ],
        ]));
      });

      it('should not contain non-matching concrete terms', () => {
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('NON') ],
          [ DF.variable('b'), DF.namedNode('NON') ],
        ]))).toBeFalsy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1a') ],
          [ DF.variable('b'), DF.namedNode('NON') ],
        ]))).toBeTruthy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1b') ],
          [ DF.variable('b'), DF.namedNode('NON') ],
        ]))).toBeFalsy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1d') ],
          [ DF.variable('b'), DF.namedNode('NON') ],
        ]))).toBeFalsy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('NON') ],
          [ DF.variable('b'), DF.namedNode('2d') ],
        ]))).toBeFalsy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('NON') ],
          [ DF.variable('b'), DF.namedNode('2b') ],
        ]))).toBeTruthy();
      });

      it('should contain matching concrete terms', () => {
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1a') ],
          [ DF.variable('b'), DF.namedNode('2a') ],
        ]))).toBeTruthy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1a') ],
          [ DF.variable('b'), DF.namedNode('ANY') ],
        ]))).toBeTruthy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('ANY') ],
          [ DF.variable('b'), DF.namedNode('2b') ],
        ]))).toBeTruthy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1b') ],
          [ DF.variable('b'), DF.namedNode('2b') ],
        ]))).toBeTruthy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1d') ],
          [ DF.variable('b'), DF.namedNode('2d') ],
        ]))).toBeTruthy();
      });

      it('should handle variable, null or undefined terms', () => {
        expect(index.contains(BF.bindings())).toBeFalsy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.variable('b') ],
          [ DF.variable('b'), DF.variable('b') ],
        ]))).toBeTruthy();
      });

      it('should contain partially matching concrete terms', () => {
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1a') ],
        ]))).toBeTruthy();
        expect(index.contains(BF.bindings([
          [ DF.variable('b'), DF.namedNode('2a') ],
        ]))).toBeTruthy();
        expect(index.contains(BF.bindings())).toBeFalsy();

        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1a') ],
        ]))).toBeTruthy();
        expect(index.contains(BF.bindings([
          [ DF.variable('b'), DF.namedNode('ANY') ],
        ]))).toBeTruthy();

        expect(index.contains(BF.bindings([
          [ DF.variable('b'), DF.namedNode('2b') ],
        ]))).toBeTruthy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('ANY') ],
        ]))).toBeTruthy();

        expect(index.contains(BF.bindings([
          [ DF.variable('b'), DF.namedNode('2d') ],
        ]))).toBeTruthy();
        expect(index.contains(BF.bindings([
          [ DF.variable('a'), DF.namedNode('1d') ],
        ]))).toBeTruthy();
      });
    });
  });

  describe('with three keys and one extra key', () => {
    // Based on spec test http://www.w3.org/2009/sparql/docs/tests/data-sparql11/negation/manifest#full-minuend
    beforeEach(() => {
      index = new BindingsIndex([ DF.variable('b'), DF.variable('c') ]);
      index.add(BF.bindings([
        [ DF.variable('d'), DF.namedNode('d0') ],
      ]));
      index.add(BF.bindings([
        [ DF.variable('b'), DF.namedNode('b1') ],
        [ DF.variable('c'), DF.namedNode('c1') ],
        [ DF.variable('d'), DF.namedNode('d1') ],
      ]));
      index.add(BF.bindings([
        [ DF.variable('b'), DF.namedNode('b2') ],
        [ DF.variable('d'), DF.namedNode('d2') ],
      ]));
      index.add(BF.bindings([
        [ DF.variable('b'), DF.namedNode('b3') ],
        [ DF.variable('c'), DF.namedNode('cx') ],
        [ DF.variable('d'), DF.namedNode('d3') ],
      ]));
    });

    it('should contain bindings according to the spec', () => {
      expect(index.contains(BF.bindings([
        [ DF.variable('a'), DF.namedNode('a0') ],
        [ DF.variable('b'), DF.namedNode('b0') ],
        [ DF.variable('c'), DF.namedNode('c0') ],
      ]))).toBeFalsy();
      expect(index.contains(BF.bindings([
        [ DF.variable('a'), DF.namedNode('a1') ],
        [ DF.variable('b'), DF.namedNode('b1') ],
        [ DF.variable('c'), DF.namedNode('c1') ],
      ]))).toBeTruthy();
      expect(index.contains(BF.bindings([
        [ DF.variable('a'), DF.namedNode('a2') ],
        [ DF.variable('b'), DF.namedNode('b2') ],
        [ DF.variable('c'), DF.namedNode('c2') ],
      ]))).toBeTruthy();
      expect(index.contains(BF.bindings([
        [ DF.variable('a'), DF.namedNode('a3') ],
        [ DF.variable('b'), DF.namedNode('b3') ],
        [ DF.variable('c'), DF.namedNode('c3') ],
      ]))).toBeFalsy();
    });
  });
});
