import {Bindings} from "@comunica/bus-query-operation";
import {namedNode, variable} from "@rdfjs/data-model";
import {BindingsIndex} from "../lib/BindingsIndex";

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
          a: namedNode('b'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: variable('b'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: null,
        }))).toBeFalsy();
      });
    });

    describe('with one bindings', () => {
      beforeEach(() => {
        index.add(Bindings({
          x: namedNode('b'),
        }));
      });

      it('should contain nothing', () => {
        expect(index.contains(Bindings({
          a: namedNode('b'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({}))).toBeFalsy();
        expect(index.contains(Bindings({
          a: variable('b'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: null,
        }))).toBeFalsy();
      });
    });
  });

  describe('with one key', () => {
    beforeEach(() => {
      index = new BindingsIndex(['a']);
    });

    describe('without bindings', () => {
      it('should not contain concrete terms', () => {
        expect(index.contains(Bindings({
          a: namedNode('b'),
        }))).toBeFalsy();
      });

      it('should handle variable, null or undefined terms', () => {
        expect(index.contains(Bindings({}))).toBeFalsy();
        expect(index.contains(Bindings({
          a: variable('b'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: null,
        }))).toBeFalsy();
      });
    });

    describe('with one bindings', () => {
      beforeEach(() => {
        index.add(Bindings({
          a: namedNode('b'),
        }));
      });

      it('should not contain non-matching concrete terms', () => {
        expect(index.contains(Bindings({
          a: namedNode('NON'),
        }))).toBeFalsy();
      });

      it('should contain matching concrete terms', () => {
        expect(index.contains(Bindings({
          a: namedNode('b'),
        }))).toBeTruthy();
      });

      it('should handle variable, null or undefined terms', () => {
        expect(index.contains(Bindings({}))).toBeFalsy();
        expect(index.contains(Bindings({
          a: variable('b'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: null,
        }))).toBeFalsy();
      });
    });
  });

  describe('with three keys', () => {
    beforeEach(() => {
      index = new BindingsIndex(['a', 'b', 'c']);
    });

    describe('without bindings', () => {
      it('should not contain concrete terms', () => {
        expect(index.contains(Bindings({
          a: namedNode('1'),
          b: namedNode('2'),
          c: namedNode('3'),
        }))).toBeFalsy();
      });

      it('should handle variable, null or undefined terms', () => {
        expect(index.contains(Bindings({}))).toBeFalsy();
        expect(index.contains(Bindings({
          a: variable('1'),
          b: variable('2'),
          c: variable('3'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: null,
          b: null,
          c: null,
        }))).toBeFalsy();
      });

      it('should not contain partially concrete terms', () => {
        expect(index.contains(Bindings({
          a: variable('1'),
          b: namedNode('2'),
          c: variable('3'),
        }))).toBeFalsy();
      });
    });

    describe('with one bindings', () => {
      beforeEach(() => {
        index.add(Bindings({
          a: namedNode('1'),
          b: namedNode('2'),
          c: namedNode('3'),
        }));
      });

      it('should not contain non-matching concrete terms', () => {
        expect(index.contains(Bindings({
          a: namedNode('NON'),
          b: namedNode('NON'),
          c: namedNode('NON'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: namedNode('1'),
          b: namedNode('NON'),
          c: namedNode('NON'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: namedNode('1'),
          b: namedNode('2'),
          c: namedNode('NON'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: namedNode('1'),
          b: namedNode('NON'),
          c: namedNode('3'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: namedNode('NON'),
          b: namedNode('NON'),
          c: namedNode('3'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: namedNode('NON'),
          b: namedNode('2'),
          c: namedNode('3'),
        }))).toBeFalsy();
      });

      it('should contain matching concrete terms', () => {
        expect(index.contains(Bindings({
          a: namedNode('1'),
          b: namedNode('2'),
          c: namedNode('3'),
        }))).toBeTruthy();
      });

      it('should handle variable, null or undefined terms', () => {
        expect(index.contains(Bindings({}))).toBeFalsy();
        expect(index.contains(Bindings({
          a: variable('b'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: null,
        }))).toBeFalsy();
      });

      it('should contain partially matching concrete terms', () => {
        expect(index.contains(Bindings({
          a: namedNode('1'),
          b: namedNode('2'),
          c: null,
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: namedNode('1'),
          b: null,
          c: namedNode('3'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: namedNode('1'),
          b: null,
          c: null,
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: null,
          b: namedNode('2'),
          c: null,
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: null,
          b: null,
          c: namedNode('3'),
        }))).toBeTruthy();
      });

      it('should not contain partially non-matching concrete terms', () => {
        expect(index.contains(Bindings({
          a: namedNode('1'),
          b: namedNode('2x'),
          c: null,
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: namedNode('1x'),
          b: null,
          c: namedNode('3x'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: namedNode('1x'),
          b: null,
          c: null,
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: null,
          b: namedNode('2x'),
          c: null,
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: null,
          b: null,
          c: namedNode('3x'),
        }))).toBeFalsy();
      });
    });

    describe('with one bindings with variables', () => {
      beforeEach(() => {
        index.add(Bindings({
          a: namedNode('1'),
          b: variable('V'),
          c: namedNode('3'),
        }));
      });

      it('should not contain non-matching concrete terms', () => {
        expect(index.contains(Bindings({
          a: namedNode('NON'),
          b: namedNode('NON'),
          c: namedNode('NON'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: namedNode('1'),
          b: namedNode('NON'),
          c: namedNode('NON'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: namedNode('1'),
          b: namedNode('2'),
          c: namedNode('NON'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: namedNode('1'),
          b: namedNode('NON'),
          c: namedNode('3'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: namedNode('NON'),
          b: namedNode('NON'),
          c: namedNode('3'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: namedNode('NON'),
          b: namedNode('2'),
          c: namedNode('3'),
        }))).toBeFalsy();
      });

      it('should contain matching concrete terms', () => {
        expect(index.contains(Bindings({
          a: namedNode('1'),
          b: namedNode('2'),
          c: namedNode('3'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: namedNode('1'),
          b: namedNode('ABC'),
          c: namedNode('3'),
        }))).toBeTruthy();
      });

      it('should handle variable, null or undefined terms', () => {
        expect(index.contains(Bindings({}))).toBeFalsy();
        expect(index.contains(Bindings({
          a: variable('b'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: null,
        }))).toBeFalsy();
      });

      it('should contain partially matching concrete terms', () => {
        expect(index.contains(Bindings({
          a: namedNode('1'),
          b: namedNode('ABC'),
          c: null,
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: namedNode('1'),
          b: null,
          c: namedNode('3'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: namedNode('1'),
          b: null,
          c: null,
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: null,
          b: namedNode('ABC'),
          c: null,
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: null,
          b: null,
          c: namedNode('3'),
        }))).toBeTruthy();
      });

      it('should not contain partially non-matching concrete terms', () => {
        expect(index.contains(Bindings({
          a: namedNode('1x'),
          b: namedNode('2'),
          c: null,
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: namedNode('1x'),
          b: null,
          c: namedNode('3x'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: namedNode('1x'),
          b: null,
          c: null,
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: null,
          b: namedNode('2x'),
          c: null,
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: null,
          b: null,
          c: namedNode('3x'),
        }))).toBeFalsy();
      });
    });

    describe('with three bindings', () => {
      beforeEach(() => {
        index.add(Bindings({
          a: namedNode('1'),
          b: namedNode('2a'),
          c: namedNode('3a'),
        }));
        index.add(Bindings({
          a: namedNode('1'),
          b: namedNode('2b'),
          c: namedNode('3b'),
        }));
        index.add(Bindings({
          a: namedNode('1x'),
          b: namedNode('2y'),
          c: namedNode('3z'),
        }));
      });

      it('should not contain non-matching concrete terms', () => {
        expect(index.contains(Bindings({
          a: namedNode('NON'),
          b: namedNode('NON'),
          c: namedNode('NON'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: namedNode('1'),
          b: namedNode('NON'),
          c: namedNode('NON'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: namedNode('1'),
          b: namedNode('2'),
          c: namedNode('NON'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: namedNode('1'),
          b: namedNode('NON'),
          c: namedNode('3'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: namedNode('NON'),
          b: namedNode('NON'),
          c: namedNode('3'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: namedNode('NON'),
          b: namedNode('2'),
          c: namedNode('3'),
        }))).toBeFalsy();
      });

      it('should contain matching concrete terms', () => {
        expect(index.contains(Bindings({
          a: namedNode('1'),
          b: namedNode('2a'),
          c: namedNode('3a'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: namedNode('1'),
          b: namedNode('2b'),
          c: namedNode('3b'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: namedNode('1x'),
          b: namedNode('2y'),
          c: namedNode('3z'),
        }))).toBeTruthy();
      });

      it('should handle variable, null or undefined terms', () => {
        expect(index.contains(Bindings({}))).toBeFalsy();
        expect(index.contains(Bindings({
          a: variable('b'),
          b: variable('b'),
          c: variable('b'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: null,
          b: null,
          c: null,
        }))).toBeFalsy();
      });

      it('should contain partially matching concrete terms', () => {
        expect(index.contains(Bindings({
          a: namedNode('1'),
          b: namedNode('2a'),
          c: null,
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: namedNode('1'),
          b: namedNode('2b'),
          c: null,
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: namedNode('1x'),
          b: namedNode('2y'),
          c: null,
        }))).toBeTruthy();

        expect(index.contains(Bindings({
          a: namedNode('1'),
          b: null,
          c: namedNode('3a'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: namedNode('1'),
          b: null,
          c: namedNode('3a'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: namedNode('1x'),
          b: null,
          c: namedNode('3z'),
        }))).toBeTruthy();

        expect(index.contains(Bindings({
          a: namedNode('1'),
          b: null,
          c: null,
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: namedNode('1x'),
          b: null,
          c: null,
        }))).toBeTruthy();

        expect(index.contains(Bindings({
          a: null,
          b: namedNode('2a'),
          c: null,
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: null,
          b: namedNode('2b'),
          c: null,
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: null,
          b: namedNode('2y'),
          c: null,
        }))).toBeTruthy();

        expect(index.contains(Bindings({
          a: null,
          b: null,
          c: namedNode('3a'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: null,
          b: null,
          c: namedNode('3a'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: null,
          b: null,
          c: namedNode('3z'),
        }))).toBeTruthy();
      });

      it('should not contain partially non-matching concrete terms', () => {
        expect(index.contains(Bindings({
          a: namedNode('1'),
          b: namedNode('2x'),
          c: null,
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: namedNode('1x'),
          b: null,
          c: namedNode('3x'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: namedNode('1y'),
          b: null,
          c: null,
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: null,
          b: namedNode('2x'),
          c: null,
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: null,
          b: null,
          c: namedNode('3x'),
        }))).toBeFalsy();
      });
    });
  });

  describe('with two keys', () => {
    beforeEach(() => {
      index = new BindingsIndex(['a', 'b']);
    });

    describe('with mixed bindings', () => {
      beforeEach(() => {
        index.add(Bindings({
          a: namedNode('1a'),
          b: namedNode('2a'),
        }));
        index.add(Bindings({
          a: namedNode('1a'),
        }));
        index.add(Bindings({
          b: namedNode('2b'),
        }));
        index.add(Bindings({
          a: namedNode('1b'),
          b: namedNode('2b'),
        }));
        index.add(Bindings({
          a: namedNode('1d'),
          b: namedNode('2d'),
        }));
      });

      it('should not contain non-matching concrete terms', () => {
        expect(index.contains(Bindings({
          a: namedNode('NON'),
          b: namedNode('NON'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: namedNode('1a'),
          b: namedNode('NON'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: namedNode('1b'),
          b: namedNode('NON'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: namedNode('1d'),
          b: namedNode('NON'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: namedNode('NON'),
          b: namedNode('2d'),
        }))).toBeFalsy();
        expect(index.contains(Bindings({
          a: namedNode('NON'),
          b: namedNode('2b'),
        }))).toBeTruthy();
      });

      it('should contain matching concrete terms', () => {
        expect(index.contains(Bindings({
          a: namedNode('1a'),
          b: namedNode('2a'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: namedNode('1a'),
          b: namedNode('ANY'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: namedNode('ANY'),
          b: namedNode('2b'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: namedNode('1b'),
          b: namedNode('2b'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: namedNode('1d'),
          b: namedNode('2d'),
        }))).toBeTruthy();
      });

      it('should handle variable, null or undefined terms', () => {
        expect(index.contains(Bindings({}))).toBeFalsy();
        expect(index.contains(Bindings({
          a: variable('b'),
          b: variable('b'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: null,
          b: null,
        }))).toBeFalsy();
      });

      it('should contain partially matching concrete terms', () => {
        expect(index.contains(Bindings({
          a: namedNode('1a'),
          b: null,
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: null,
          b: namedNode('2a'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: null,
          b: null,
        }))).toBeFalsy();

        expect(index.contains(Bindings({
          a: namedNode('1a'),
          b: null,
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: null,
          b: namedNode('ANY'),
        }))).toBeTruthy();

        expect(index.contains(Bindings({
          a: null,
          b: namedNode('2b'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: namedNode('ANY'),
          b: null,
        }))).toBeTruthy();

        expect(index.contains(Bindings({
          a: null,
          b: namedNode('2d'),
        }))).toBeTruthy();
        expect(index.contains(Bindings({
          a: namedNode('1d'),
          b: null,
        }))).toBeTruthy();
      });

    });

  });

  describe('with three keys and one extra key', () => {
    // Based on spec test http://www.w3.org/2009/sparql/docs/tests/data-sparql11/negation/manifest#full-minuend
    beforeEach(() => {
      index = new BindingsIndex(['b', 'c']);
      index.add(Bindings({
        d: namedNode('d0'),
      }));
      index.add(Bindings({
        b: namedNode('b1'),
        c: namedNode('c1'),
        d: namedNode('d1'),
      }));
      index.add(Bindings({
        b: namedNode('b2'),
        d: namedNode('d2'),
      }));
      index.add(Bindings({
        b: namedNode('b3'),
        c: namedNode('cx'),
        d: namedNode('d3'),
      }));
    });

    it('should contain bindings according to the spec', () => {
      expect(index.contains(Bindings({
        a: namedNode('a0'),
        b: namedNode('b0'),
        c: namedNode('c0'),
      }))).toBeFalsy();
      expect(index.contains(Bindings({
        a: namedNode('a1'),
        b: namedNode('b1'),
        c: namedNode('c1'),
      }))).toBeTruthy();
      expect(index.contains(Bindings({
        a: namedNode('a2'),
        b: namedNode('b2'),
        c: namedNode('c2'),
      }))).toBeTruthy();
      expect(index.contains(Bindings({
        a: namedNode('a3'),
        b: namedNode('b3'),
        c: namedNode('c3'),
      }))).toBeFalsy();
    });
  });

});
