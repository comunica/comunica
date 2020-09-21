import { Bindings } from '@comunica/bus-query-operation';
import { DataFactory } from 'rdf-data-factory';
import { BindingsIndex } from '../lib/BindingsIndex';
const DF = new DataFactory();

describe('BindingsIndex', () => {
  let index: BindingsIndex;

  describe('without keys', () => {
    beforeEach(() => {
      index = new BindingsIndex([]);
    });

    describe('without bindings', () => {
      it('should contain nothing', () => {
        expect(index.contains(Bindings({}))).toBeFalsy();
        expect(index.contains(Bindings({
          a: DF.namedNode('b'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: DF.variable('b'),
        }))).toBeFalsy();
      });
    });

    describe('with one bindings', () => {
      beforeEach(() => {
        index.add(Bindings({
          x: DF.namedNode('b'),
        }));
      });

      it('should contain nothing', () => {
        expect(index.contains(Bindings({
          a: DF.namedNode('b'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({}))).toBeFalsy();
        expect(index.contains(Bindings({
          a: DF.variable('b'),
        }))).toBeFalsy();
      });
    });
  });

  describe('with one key', () => {
    beforeEach(() => {
      index = new BindingsIndex([ 'a' ]);
    });

    describe('without bindings', () => {
      it('should not contain concrete terms', () => {
        expect(index.contains(Bindings({
          a: DF.namedNode('b'),
        }))).toBeFalsy();
      });

      it('should handle variable, null or undefined terms', () => {
        expect(index.contains(Bindings({}))).toBeFalsy();
        expect(index.contains(Bindings({
          a: DF.variable('b'),
        }))).toBeTruthy();
      });
    });

    describe('with one bindings', () => {
      beforeEach(() => {
        index.add(Bindings({
          a: DF.namedNode('b'),
        }));
      });

      it('should not contain non-matching concrete terms', () => {
        expect(index.contains(Bindings({
          a: DF.namedNode('NON'),
        }))).toBeFalsy();
      });

      it('should contain matching concrete terms', () => {
        expect(index.contains(Bindings({
          a: DF.namedNode('b'),
        }))).toBeTruthy();
      });

      it('should handle variable, null or undefined terms', () => {
        expect(index.contains(Bindings({}))).toBeFalsy();
        expect(index.contains(Bindings({
          a: DF.variable('b'),
        }))).toBeTruthy();
      });
    });
  });

  describe('with three keys', () => {
    beforeEach(() => {
      index = new BindingsIndex([ 'a', 'b', 'c' ]);
    });

    describe('without bindings', () => {
      it('should not contain concrete terms', () => {
        expect(index.contains(Bindings({
          a: DF.namedNode('1'),
          b: DF.namedNode('2'),
          c: DF.namedNode('3'),
        }))).toBeFalsy();
      });

      it('should handle variable, null or undefined terms', () => {
        expect(index.contains(Bindings({}))).toBeFalsy();
        expect(index.contains(Bindings({
          a: DF.variable('1'),
          b: DF.variable('2'),
          c: DF.variable('3'),
        }))).toBeTruthy();
      });

      it('should not contain partially concrete terms', () => {
        expect(index.contains(Bindings({
          a: DF.variable('1'),
          b: DF.namedNode('2'),
          c: DF.variable('3'),
        }))).toBeFalsy();
      });
    });

    describe('with one bindings', () => {
      beforeEach(() => {
        index.add(Bindings({
          a: DF.namedNode('1'),
          b: DF.namedNode('2'),
          c: DF.namedNode('3'),
        }));
      });

      it('should not contain non-matching concrete terms', () => {
        expect(index.contains(Bindings({
          a: DF.namedNode('NON'),
          b: DF.namedNode('NON'),
          c: DF.namedNode('NON'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: DF.namedNode('1'),
          b: DF.namedNode('NON'),
          c: DF.namedNode('NON'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: DF.namedNode('1'),
          b: DF.namedNode('2'),
          c: DF.namedNode('NON'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: DF.namedNode('1'),
          b: DF.namedNode('NON'),
          c: DF.namedNode('3'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: DF.namedNode('NON'),
          b: DF.namedNode('NON'),
          c: DF.namedNode('3'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: DF.namedNode('NON'),
          b: DF.namedNode('2'),
          c: DF.namedNode('3'),
        }))).toBeFalsy();
      });

      it('should contain matching concrete terms', () => {
        expect(index.contains(Bindings({
          a: DF.namedNode('1'),
          b: DF.namedNode('2'),
          c: DF.namedNode('3'),
        }))).toBeTruthy();
      });

      it('should handle variable, null or undefined terms', () => {
        expect(index.contains(Bindings({}))).toBeFalsy();
        expect(index.contains(Bindings({
          a: DF.variable('b'),
        }))).toBeTruthy();
      });

      it('should contain partially matching concrete terms', () => {
        expect(index.contains(Bindings({
          a: DF.namedNode('1'),
          b: DF.namedNode('2'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: DF.namedNode('1'),
          c: DF.namedNode('3'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: DF.namedNode('1'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          b: DF.namedNode('2'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          c: DF.namedNode('3'),
        }))).toBeTruthy();
      });

      it('should not contain partially non-matching concrete terms', () => {
        expect(index.contains(Bindings({
          a: DF.namedNode('1'),
          b: DF.namedNode('2x'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: DF.namedNode('1x'),
          c: DF.namedNode('3x'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: DF.namedNode('1x'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          b: DF.namedNode('2x'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          c: DF.namedNode('3x'),
        }))).toBeFalsy();
      });
    });

    describe('with one bindings with variables', () => {
      beforeEach(() => {
        index.add(Bindings({
          a: DF.namedNode('1'),
          b: DF.variable('V'),
          c: DF.namedNode('3'),
        }));
      });

      it('should not contain non-matching concrete terms', () => {
        expect(index.contains(Bindings({
          a: DF.namedNode('NON'),
          b: DF.namedNode('NON'),
          c: DF.namedNode('NON'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: DF.namedNode('1'),
          b: DF.namedNode('NON'),
          c: DF.namedNode('NON'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: DF.namedNode('1'),
          b: DF.namedNode('2'),
          c: DF.namedNode('NON'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: DF.namedNode('1'),
          b: DF.namedNode('NON'),
          c: DF.namedNode('3'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: DF.namedNode('NON'),
          b: DF.namedNode('NON'),
          c: DF.namedNode('3'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: DF.namedNode('NON'),
          b: DF.namedNode('2'),
          c: DF.namedNode('3'),
        }))).toBeFalsy();
      });

      it('should contain matching concrete terms', () => {
        expect(index.contains(Bindings({
          a: DF.namedNode('1'),
          b: DF.namedNode('2'),
          c: DF.namedNode('3'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: DF.namedNode('1'),
          b: DF.namedNode('ABC'),
          c: DF.namedNode('3'),
        }))).toBeTruthy();
      });

      it('should handle variable, null or undefined terms', () => {
        expect(index.contains(Bindings({}))).toBeFalsy();
        expect(index.contains(Bindings({
          a: DF.variable('b'),
        }))).toBeTruthy();
      });

      it('should contain partially matching concrete terms', () => {
        expect(index.contains(Bindings({
          a: DF.namedNode('1'),
          b: DF.namedNode('ABC'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: DF.namedNode('1'),
          c: DF.namedNode('3'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: DF.namedNode('1'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          b: DF.namedNode('ABC'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          c: DF.namedNode('3'),
        }))).toBeTruthy();
      });

      it('should not contain partially non-matching concrete terms', () => {
        expect(index.contains(Bindings({
          a: DF.namedNode('1x'),
          b: DF.namedNode('2'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: DF.namedNode('1x'),
          c: DF.namedNode('3x'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: DF.namedNode('1x'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          b: DF.namedNode('2x'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          c: DF.namedNode('3x'),
        }))).toBeFalsy();
      });
    });

    describe('with three bindings', () => {
      beforeEach(() => {
        index.add(Bindings({
          a: DF.namedNode('1'),
          b: DF.namedNode('2a'),
          c: DF.namedNode('3a'),
        }));
        index.add(Bindings({
          a: DF.namedNode('1'),
          b: DF.namedNode('2b'),
          c: DF.namedNode('3b'),
        }));
        index.add(Bindings({
          a: DF.namedNode('1x'),
          b: DF.namedNode('2y'),
          c: DF.namedNode('3z'),
        }));
      });

      it('should not contain non-matching concrete terms', () => {
        expect(index.contains(Bindings({
          a: DF.namedNode('NON'),
          b: DF.namedNode('NON'),
          c: DF.namedNode('NON'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: DF.namedNode('1'),
          b: DF.namedNode('NON'),
          c: DF.namedNode('NON'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: DF.namedNode('1'),
          b: DF.namedNode('2'),
          c: DF.namedNode('NON'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: DF.namedNode('1'),
          b: DF.namedNode('NON'),
          c: DF.namedNode('3'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: DF.namedNode('NON'),
          b: DF.namedNode('NON'),
          c: DF.namedNode('3'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: DF.namedNode('NON'),
          b: DF.namedNode('2'),
          c: DF.namedNode('3'),
        }))).toBeFalsy();
      });

      it('should contain matching concrete terms', () => {
        expect(index.contains(Bindings({
          a: DF.namedNode('1'),
          b: DF.namedNode('2a'),
          c: DF.namedNode('3a'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: DF.namedNode('1'),
          b: DF.namedNode('2b'),
          c: DF.namedNode('3b'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: DF.namedNode('1x'),
          b: DF.namedNode('2y'),
          c: DF.namedNode('3z'),
        }))).toBeTruthy();
      });

      it('should handle variable, null or undefined terms', () => {
        expect(index.contains(Bindings({}))).toBeFalsy();
        expect(index.contains(Bindings({
          a: DF.variable('b'),
          b: DF.variable('b'),
          c: DF.variable('b'),
        }))).toBeTruthy();
      });

      it('should contain partially matching concrete terms', () => {
        expect(index.contains(Bindings({
          a: DF.namedNode('1'),
          b: DF.namedNode('2a'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: DF.namedNode('1'),
          b: DF.namedNode('2b'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: DF.namedNode('1x'),
          b: DF.namedNode('2y'),
        }))).toBeTruthy();

        expect(index.contains(Bindings({
          a: DF.namedNode('1'),
          c: DF.namedNode('3a'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: DF.namedNode('1'),
          c: DF.namedNode('3a'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: DF.namedNode('1x'),
          c: DF.namedNode('3z'),
        }))).toBeTruthy();

        expect(index.contains(Bindings({
          a: DF.namedNode('1'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: DF.namedNode('1x'),
        }))).toBeTruthy();

        expect(index.contains(Bindings({
          b: DF.namedNode('2a'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          b: DF.namedNode('2b'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          b: DF.namedNode('2y'),
        }))).toBeTruthy();

        expect(index.contains(Bindings({
          c: DF.namedNode('3a'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          c: DF.namedNode('3a'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          c: DF.namedNode('3z'),
        }))).toBeTruthy();
      });

      it('should not contain partially non-matching concrete terms', () => {
        expect(index.contains(Bindings({
          a: DF.namedNode('1'),
          b: DF.namedNode('2x'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: DF.namedNode('1x'),
          c: DF.namedNode('3x'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: DF.namedNode('1y'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          b: DF.namedNode('2x'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          c: DF.namedNode('3x'),
        }))).toBeFalsy();
      });
    });
  });

  describe('with two keys', () => {
    beforeEach(() => {
      index = new BindingsIndex([ 'a', 'b' ]);
    });

    describe('with mixed bindings', () => {
      beforeEach(() => {
        index.add(Bindings({
          a: DF.namedNode('1a'),
          b: DF.namedNode('2a'),
        }));
        index.add(Bindings({
          a: DF.namedNode('1a'),
        }));
        index.add(Bindings({
          b: DF.namedNode('2b'),
        }));
        index.add(Bindings({
          a: DF.namedNode('1b'),
          b: DF.namedNode('2b'),
        }));
        index.add(Bindings({
          a: DF.namedNode('1d'),
          b: DF.namedNode('2d'),
        }));
      });

      it('should not contain non-matching concrete terms', () => {
        expect(index.contains(Bindings({
          a: DF.namedNode('NON'),
          b: DF.namedNode('NON'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: DF.namedNode('1a'),
          b: DF.namedNode('NON'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: DF.namedNode('1b'),
          b: DF.namedNode('NON'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: DF.namedNode('1d'),
          b: DF.namedNode('NON'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: DF.namedNode('NON'),
          b: DF.namedNode('2d'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: DF.namedNode('NON'),
          b: DF.namedNode('2b'),
        }))).toBeTruthy();
      });

      it('should contain matching concrete terms', () => {
        expect(index.contains(Bindings({
          a: DF.namedNode('1a'),
          b: DF.namedNode('2a'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: DF.namedNode('1a'),
          b: DF.namedNode('ANY'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: DF.namedNode('ANY'),
          b: DF.namedNode('2b'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: DF.namedNode('1b'),
          b: DF.namedNode('2b'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: DF.namedNode('1d'),
          b: DF.namedNode('2d'),
        }))).toBeTruthy();
      });

      it('should handle variable, null or undefined terms', () => {
        expect(index.contains(Bindings({}))).toBeFalsy();
        expect(index.contains(Bindings({
          a: DF.variable('b'),
          b: DF.variable('b'),
        }))).toBeTruthy();
      });

      it('should contain partially matching concrete terms', () => {
        expect(index.contains(Bindings({
          a: DF.namedNode('1a'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          b: DF.namedNode('2a'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
        }))).toBeFalsy();

        expect(index.contains(Bindings({
          a: DF.namedNode('1a'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          b: DF.namedNode('ANY'),
        }))).toBeTruthy();

        expect(index.contains(Bindings({
          b: DF.namedNode('2b'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: DF.namedNode('ANY'),
        }))).toBeTruthy();

        expect(index.contains(Bindings({
          b: DF.namedNode('2d'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: DF.namedNode('1d'),
        }))).toBeTruthy();
      });
    });
  });

  describe('with three keys and one extra key', () => {
    // Based on spec test http://www.w3.org/2009/sparql/docs/tests/data-sparql11/negation/manifest#full-minuend
    beforeEach(() => {
      index = new BindingsIndex([ 'b', 'c' ]);
      index.add(Bindings({
        d: DF.namedNode('d0'),
      }));
      index.add(Bindings({
        b: DF.namedNode('b1'),
        c: DF.namedNode('c1'),
        d: DF.namedNode('d1'),
      }));
      index.add(Bindings({
        b: DF.namedNode('b2'),
        d: DF.namedNode('d2'),
      }));
      index.add(Bindings({
        b: DF.namedNode('b3'),
        c: DF.namedNode('cx'),
        d: DF.namedNode('d3'),
      }));
    });

    it('should contain bindings according to the spec', () => {
      expect(index.contains(Bindings({
        a: DF.namedNode('a0'),
        b: DF.namedNode('b0'),
        c: DF.namedNode('c0'),
      }))).toBeFalsy();
      expect(index.contains(Bindings({
        a: DF.namedNode('a1'),
        b: DF.namedNode('b1'),
        c: DF.namedNode('c1'),
      }))).toBeTruthy();
      expect(index.contains(Bindings({
        a: DF.namedNode('a2'),
        b: DF.namedNode('b2'),
        c: DF.namedNode('c2'),
      }))).toBeTruthy();
      expect(index.contains(Bindings({
        a: DF.namedNode('a3'),
        b: DF.namedNode('b3'),
        c: DF.namedNode('c3'),
      }))).toBeFalsy();
    });
  });
});
