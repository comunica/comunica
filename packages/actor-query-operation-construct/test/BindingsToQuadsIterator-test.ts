import { Bindings } from '@comunica/bus-query-operation';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';

import { BindingsToQuadsIterator } from '../lib/BindingsToQuadsIterator';
const DF = new DataFactory();

const arrayifyStream = require('arrayify-stream');

describe('BindingsToQuadsIterator', () => {
  describe('#bindTerm', () => {
    describe('with empty bindings', () => {
      const bindings = Bindings({});

      it('should not bind a literal', () => {
        return expect(BindingsToQuadsIterator.bindTerm(bindings, DF.literal('abc')).termType).toEqual('Literal');
      });

      it('should not bind a blank node', () => {
        return expect(BindingsToQuadsIterator.bindTerm(bindings, DF.blankNode()).termType).toEqual('BlankNode');
      });

      it('should not bind a named node', () => {
        return expect(BindingsToQuadsIterator.bindTerm(bindings, DF.namedNode('abc')).termType).toEqual('NamedNode');
      });

      it('should not bind a default graph', () => {
        return expect(BindingsToQuadsIterator.bindTerm(bindings, DF.defaultGraph()).termType).toEqual('DefaultGraph');
      });

      it('should fail to bind a variable', () => {
        return expect(BindingsToQuadsIterator.bindTerm(bindings, DF.variable('abc'))).toBeFalsy();
      });
    });

    describe('with non-empty bindings', () => {
      const bindings = Bindings({ '?a': DF.namedNode('a'), '?b': DF.namedNode('b') });

      it('should not bind a literal', () => {
        return expect(BindingsToQuadsIterator.bindTerm(bindings, DF.literal('abc')).termType).toEqual('Literal');
      });

      it('should not bind a blank node', () => {
        return expect(BindingsToQuadsIterator.bindTerm(bindings, DF.blankNode()).termType).toEqual('BlankNode');
      });

      it('should not bind a named node', () => {
        return expect(BindingsToQuadsIterator.bindTerm(bindings, DF.namedNode('abc')).termType).toEqual('NamedNode');
      });

      it('should not bind a default graph', () => {
        return expect(BindingsToQuadsIterator.bindTerm(bindings, DF.defaultGraph()).termType).toEqual('DefaultGraph');
      });

      it('should bind variable ?a', () => {
        return expect(BindingsToQuadsIterator.bindTerm(bindings, DF.variable('a'))).toEqual(DF.namedNode('a'));
      });

      it('should bind variable ?b', () => {
        return expect(BindingsToQuadsIterator.bindTerm(bindings, DF.variable('b'))).toEqual(DF.namedNode('b'));
      });

      it('should fail to bind variable ?c', () => {
        return expect(BindingsToQuadsIterator.bindTerm(bindings, DF.variable('c'))).toBeFalsy();
      });
    });
  });

  describe('#bindQuad', () => {
    describe('with empty bindings', () => {
      const bindings = Bindings({});

      it('should not bind a quad without variables', () => {
        return expect(BindingsToQuadsIterator.bindQuad(bindings, DF.quad(
          DF.blankNode('s'),
          DF.namedNode('p'),
          DF.literal('o'),
          DF.defaultGraph(),
        ))).toEqual(DF.quad(
          DF.blankNode('s'),
          DF.namedNode('p'),
          DF.literal('o'),
          DF.defaultGraph(),
        ));
      });

      it('should return falsy for a quad with an unbound subject variable', () => {
        return expect(BindingsToQuadsIterator.bindQuad(bindings, DF.quad(
          DF.variable('s'),
          DF.namedNode('p'),
          DF.literal('o'),
          DF.defaultGraph(),
        ))).toBeFalsy();
      });

      it('should return falsy for a quad with an unbound predicate variable', () => {
        return expect(BindingsToQuadsIterator.bindQuad(bindings, DF.quad(
          DF.blankNode('s'),
          DF.variable('p'),
          DF.literal('o'),
          DF.defaultGraph(),
        ))).toBeFalsy();
      });

      it('should return falsy for a quad with an unbound object variable', () => {
        return expect(BindingsToQuadsIterator.bindQuad(bindings, DF.quad(
          DF.blankNode('s'),
          DF.namedNode('p'),
          DF.variable('o'),
          DF.defaultGraph(),
        ))).toBeFalsy();
      });

      it('should return falsy for a quad with an unbound graph variable', () => {
        return expect(BindingsToQuadsIterator.bindQuad(bindings, DF.quad(
          DF.blankNode('s'),
          DF.namedNode('p'),
          DF.literal('o'),
          DF.variable('g'),
        ))).toBeFalsy();
      });
    });

    describe('with non-empty bindings', () => {
      const bindings = Bindings({ '?a': DF.namedNode('a'), '?b': DF.namedNode('b') });

      it('should not bind a quad without variables', () => {
        return expect(BindingsToQuadsIterator.bindQuad(bindings, DF.quad(
          DF.blankNode('s'),
          DF.namedNode('p'),
          DF.literal('o'),
          DF.defaultGraph(),
        ))).toEqual(DF.quad(
          DF.blankNode('s'),
          DF.namedNode('p'),
          DF.literal('o'),
          DF.defaultGraph(),
        ));
      });

      it('should return falsy for a quad with an unbound subject variable', () => {
        return expect(BindingsToQuadsIterator.bindQuad(bindings, DF.quad(
          DF.variable('s'),
          DF.namedNode('p'),
          DF.literal('o'),
          DF.defaultGraph(),
        ))).toBeFalsy();
      });

      it('should return falsy for a quad with an unbound predicate variable', () => {
        return expect(BindingsToQuadsIterator.bindQuad(bindings, DF.quad(
          DF.blankNode('s'),
          DF.variable('p'),
          DF.literal('o'),
          DF.defaultGraph(),
        ))).toBeFalsy();
      });

      it('should return falsy for a quad with an unbound object variable', () => {
        return expect(BindingsToQuadsIterator.bindQuad(bindings, DF.quad(
          DF.blankNode('s'),
          DF.namedNode('p'),
          DF.variable('o'),
          DF.defaultGraph(),
        ))).toBeFalsy();
      });

      it('should return falsy for a quad with an unbound graph variable', () => {
        return expect(BindingsToQuadsIterator.bindQuad(bindings, DF.quad(
          DF.blankNode('s'),
          DF.namedNode('p'),
          DF.literal('o'),
          DF.variable('g'),
        ))).toBeFalsy();
      });

      it('should return a bound quad with a bound subject variable', () => {
        return expect(BindingsToQuadsIterator.bindQuad(bindings, DF.quad(
          DF.variable('a'),
          DF.namedNode('p'),
          DF.literal('o'),
          DF.defaultGraph(),
        ))).toEqual(DF.quad(
          DF.namedNode('a'),
          DF.namedNode('p'),
          DF.literal('o'),
          DF.defaultGraph(),
        ));
      });

      it('should return a bound quad with a bound predicate variable', () => {
        return expect(BindingsToQuadsIterator.bindQuad(bindings, DF.quad(
          DF.blankNode('s'),
          DF.variable('b'),
          DF.literal('o'),
          DF.defaultGraph(),
        ))).toEqual(DF.quad(
          DF.blankNode('s'),
          DF.namedNode('b'),
          DF.literal('o'),
          DF.defaultGraph(),
        ));
      });

      it('should return a bound quad with a bound object variable', () => {
        return expect(BindingsToQuadsIterator.bindQuad(bindings, DF.quad(
          DF.blankNode('s'),
          DF.namedNode('p'),
          DF.variable('a'),
          DF.defaultGraph(),
        ))).toEqual(DF.quad(
          DF.blankNode('s'),
          DF.namedNode('p'),
          DF.namedNode('a'),
          DF.defaultGraph(),
        ));
      });

      it('should return a bound quad with a bound graph variable', () => {
        return expect(BindingsToQuadsIterator.bindQuad(bindings, DF.quad(
          DF.blankNode('s'),
          DF.namedNode('p'),
          DF.literal('o'),
          DF.variable('b'),
        ))).toEqual(DF.quad(
          DF.blankNode('s'),
          DF.namedNode('p'),
          DF.literal('o'),
          DF.namedNode('b'),
        ));
      });
    });
  });

  describe('#localizeBlankNode', () => {
    it('should not localize a literal', () => {
      return expect(BindingsToQuadsIterator.localizeBlankNode(0, DF.literal('abc')).termType)
        .toEqual('Literal');
    });

    it('should not localize a variable', () => {
      return expect(BindingsToQuadsIterator.localizeBlankNode(0, DF.variable('abc')).termType)
        .toEqual('Variable');
    });

    it('should not localize a named node', () => {
      return expect(BindingsToQuadsIterator.localizeBlankNode(0, DF.namedNode('abc')).termType)
        .toEqual('NamedNode');
    });

    it('should not localize a default graph', () => {
      return expect(BindingsToQuadsIterator.localizeBlankNode(0, DF.defaultGraph()).termType)
        .toEqual('DefaultGraph');
    });

    it('should localize a blank node with a different counter', () => {
      expect(BindingsToQuadsIterator.localizeBlankNode(0, DF.blankNode('abc')))
        .toEqual(DF.blankNode('abc0'));
      return expect(BindingsToQuadsIterator.localizeBlankNode(1, DF.blankNode('abc')))
        .toEqual(DF.blankNode('abc1'));
    });

    it('should localize a blank node with the same counter', () => {
      expect(BindingsToQuadsIterator.localizeBlankNode(0, DF.blankNode('abc')))
        .toEqual(DF.blankNode('abc0'));
      return expect(BindingsToQuadsIterator.localizeBlankNode(0, DF.blankNode('abc')))
        .toEqual(DF.blankNode('abc0'));
    });

    it('should localize a blank node with mixed counters', () => {
      expect(BindingsToQuadsIterator.localizeBlankNode(0, DF.blankNode('abc')))
        .toEqual(DF.blankNode('abc0'));
      expect(BindingsToQuadsIterator.localizeBlankNode(0, DF.blankNode('abc')))
        .toEqual(DF.blankNode('abc0'));

      expect(BindingsToQuadsIterator.localizeBlankNode(1, DF.blankNode('abc')))
        .toEqual(DF.blankNode('abc1'));
      expect(BindingsToQuadsIterator.localizeBlankNode(1, DF.blankNode('abc')))
        .toEqual(DF.blankNode('abc1'));
    });
  });

  describe('#localizeQuad', () => {
    it('should not change a quad without blank nodes', () => {
      return expect(BindingsToQuadsIterator.localizeQuad(0, DF.quad(
        DF.variable('s'),
        DF.namedNode('p'),
        DF.literal('o'),
        DF.defaultGraph(),
      ))).toEqual(DF.quad(
        DF.variable('s'),
        DF.namedNode('p'),
        DF.literal('o'),
        DF.defaultGraph(),
      ));
    });

    it('should localize a quad with a subject blank node', () => {
      return expect(BindingsToQuadsIterator.localizeQuad(0, DF.quad(
        DF.blankNode('s'),
        DF.namedNode('p'),
        DF.literal('o'),
        DF.defaultGraph(),
      ))).toEqual(DF.quad(
        DF.blankNode('s0'),
        DF.namedNode('p'),
        DF.literal('o'),
        DF.defaultGraph(),
      ));
    });

    it('should localize a quad with a predicate blank node', () => {
      return expect(BindingsToQuadsIterator.localizeQuad(0, <any> DF.quad(
        DF.variable('s'),
        <any> DF.blankNode('p'),
        DF.literal('o'),
        DF.defaultGraph(),
      ))).toEqual(DF.quad(
        DF.variable('s'),
        <any> DF.blankNode('p0'),
        DF.literal('o'),
        DF.defaultGraph(),
      ));
    });

    it('should localize a quad with a object blank node', () => {
      return expect(BindingsToQuadsIterator.localizeQuad(0, DF.quad(
        DF.variable('s'),
        DF.namedNode('p'),
        DF.blankNode('o'),
        DF.defaultGraph(),
      ))).toEqual(DF.quad(
        DF.variable('s'),
        DF.namedNode('p'),
        DF.blankNode('o0'),
        DF.defaultGraph(),
      ));
    });

    it('should localize a quad with a graph blank node', () => {
      return expect(BindingsToQuadsIterator.localizeQuad(0, DF.quad(
        DF.variable('s'),
        DF.namedNode('p'),
        DF.literal('o'),
        DF.blankNode('g'),
      ))).toEqual(DF.quad(
        DF.variable('s'),
        DF.namedNode('p'),
        DF.literal('o'),
        DF.blankNode('g0'),
      ));
    });

    it('should localize a quad with subject, predicate, object and graph blank nodes', () => {
      return expect(BindingsToQuadsIterator.localizeQuad(0, DF.quad(
        DF.blankNode('s'),
        <any> DF.blankNode('p'),
        DF.blankNode('o'),
        DF.blankNode('g'),
      ))).toEqual(DF.quad(
        DF.blankNode('s0'),
        <any> DF.blankNode('p0'),
        DF.blankNode('o0'),
        DF.blankNode('g0'),
      ));
    });

    it('should localize a quad with equal subject, predicate, object and graph blank nodes', () => {
      return expect(BindingsToQuadsIterator.localizeQuad(0, DF.quad(
        DF.blankNode('a'),
        <any> DF.blankNode('a'),
        DF.blankNode('a'),
        DF.blankNode('a'),
      ))).toEqual(DF.quad(
        DF.blankNode('a0'),
        <any> DF.blankNode('a0'),
        DF.blankNode('a0'),
        DF.blankNode('a0'),
      ));
    });

    it('should localize a quad multiple times with blank nodes with different counters', () => {
      expect(BindingsToQuadsIterator.localizeQuad(0, DF.quad(
        DF.blankNode('s'),
        <any> DF.blankNode('p'),
        DF.blankNode('o'),
        DF.blankNode('g'),
      ))).toEqual(DF.quad(
        DF.blankNode('s0'),
        <any> DF.blankNode('p0'),
        DF.blankNode('o0'),
        DF.blankNode('g0'),
      ));

      expect(BindingsToQuadsIterator.localizeQuad(1, DF.quad(
        DF.blankNode('s'),
        <any> DF.blankNode('p'),
        DF.blankNode('o'),
        DF.blankNode('g'),
      ))).toEqual(DF.quad(
        DF.blankNode('s1'),
        <any> DF.blankNode('p1'),
        DF.blankNode('o1'),
        DF.blankNode('g1'),
      ));

      expect(BindingsToQuadsIterator.localizeQuad(2, DF.quad(
        DF.blankNode('s'),
        <any> DF.blankNode('p'),
        DF.blankNode('o'),
        DF.blankNode('g'),
      ))).toEqual(DF.quad(
        DF.blankNode('s2'),
        <any> DF.blankNode('p2'),
        DF.blankNode('o2'),
        DF.blankNode('g2'),
      ));
    });
  });

  describe('#bindTemplate', () => {
    it('should bind an empty template without variables, blank nodes and bindings', () => {
      return expect(BindingsToQuadsIterator.bindTemplate(Bindings({}), [], 0))
        .toEqual([]);
    });

    it('should bind a template without variables, blank nodes and bindings', () => {
      return expect(BindingsToQuadsIterator.bindTemplate(Bindings({}), [
        DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
        DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2')),
        DF.quad(DF.namedNode('s3'), DF.namedNode('p3'), DF.namedNode('o3')),
      ], 0))
        .toEqual([
          DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
          DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2')),
          DF.quad(DF.namedNode('s3'), DF.namedNode('p3'), DF.namedNode('o3')),
        ]);
    });

    it('should bind a template with variables and bindings and without blank nodes', () => {
      return expect(BindingsToQuadsIterator.bindTemplate(Bindings({
        '?a': DF.namedNode('a'),
        '?b': DF.namedNode('b'),
      }), [
        DF.quad(DF.variable('a'), DF.namedNode('p1'), DF.namedNode('o1')),
        DF.quad(DF.namedNode('s2'), DF.variable('b'), DF.namedNode('o2')),
        DF.quad(DF.namedNode('s3'), DF.variable('a'), DF.variable('b')),
      ], 0))
        .toEqual([
          DF.quad(DF.namedNode('a'), DF.namedNode('p1'), DF.namedNode('o1')),
          DF.quad(DF.namedNode('s2'), DF.namedNode('b'), DF.namedNode('o2')),
          DF.quad(DF.namedNode('s3'), DF.namedNode('a'), DF.namedNode('b')),
        ]);
    });

    it('should bind a template with variables and incomplete bindings and without blank nodes', () => {
      return expect(BindingsToQuadsIterator.bindTemplate(Bindings({ '?a': DF.namedNode('a') }), [
        DF.quad(DF.variable('a'), DF.namedNode('p1'), DF.namedNode('o1')),
        DF.quad(DF.namedNode('s2'), DF.variable('b'), DF.namedNode('o2')),
        DF.quad(DF.namedNode('s3'), DF.variable('a'), DF.variable('b')),
      ], 0))
        .toEqual([
          DF.quad(DF.namedNode('a'), DF.namedNode('p1'), DF.namedNode('o1')),
        ]);
    });

    it('should bind a template with variables, bindings and blank nodes', () => {
      return expect(BindingsToQuadsIterator.bindTemplate(Bindings({
        '?a': DF.namedNode('a'),
        '?b': DF.namedNode('b'),
      }), [
        DF.quad(DF.variable('a'), DF.namedNode('p1'), DF.namedNode('o1')),
        DF.quad(DF.blankNode('bnode'), DF.variable('b'), DF.blankNode('bnode')),
        DF.quad(DF.blankNode('bnode'), DF.variable('a'), DF.variable('b')),
      ], 0))
        .toEqual([
          DF.quad(DF.namedNode('a'), DF.namedNode('p1'), DF.namedNode('o1')),
          DF.quad(DF.blankNode('bnode0'), DF.namedNode('b'), DF.blankNode('bnode0')),
          DF.quad(DF.blankNode('bnode0'), DF.namedNode('a'), DF.namedNode('b')),
        ]);
    });
  });

  describe('instantiated for a template', () => {
    let iterator: BindingsToQuadsIterator;
    beforeEach(() => {
      iterator = new BindingsToQuadsIterator([
        DF.quad(DF.variable('a'), DF.namedNode('p1'), DF.namedNode('o1')),
        DF.quad(DF.blankNode('bnode'), DF.variable('b'), DF.blankNode('bnode')),
        DF.quad(DF.blankNode('bnode'), DF.variable('a'), DF.variable('b')),
        DF.quad(
          DF.blankNode('bnode'),
          <any> DF.blankNode('otherbnode'),
          DF.blankNode('otherbnode'),
          DF.blankNode('otherbnode'),
        ),
      ], new ArrayIterator([
        Bindings({ '?a': DF.namedNode('a1'), '?b': DF.namedNode('b1') }),
        Bindings({ '?a': DF.namedNode('a2'), '?b': DF.namedNode('b2') }),
        Bindings({ '?a': DF.namedNode('a3') }),
      ]));
    });

    it('should be transformed to a valid triple stream', async() => {
      expect(await arrayifyStream(iterator)).toEqual([
        DF.quad(DF.namedNode('a1'), DF.namedNode('p1'), DF.namedNode('o1')),
        DF.quad(DF.blankNode('bnode0'), DF.namedNode('b1'), DF.blankNode('bnode0')),
        DF.quad(DF.blankNode('bnode0'), DF.namedNode('a1'), DF.namedNode('b1')),
        DF.quad(DF.blankNode('bnode0'),
          <any> DF.blankNode('otherbnode0'),
          DF.blankNode('otherbnode0'),
          DF.blankNode('otherbnode0')),

        DF.quad(DF.namedNode('a2'), DF.namedNode('p1'), DF.namedNode('o1')),
        DF.quad(DF.blankNode('bnode1'), DF.namedNode('b2'), DF.blankNode('bnode1')),
        DF.quad(DF.blankNode('bnode1'), DF.namedNode('a2'), DF.namedNode('b2')),
        DF.quad(DF.blankNode('bnode1'),
          <any> DF.blankNode('otherbnode1'),
          DF.blankNode('otherbnode1'),
          DF.blankNode('otherbnode1')),

        DF.quad(DF.namedNode('a3'), DF.namedNode('p1'), DF.namedNode('o1')),
        DF.quad(DF.blankNode('bnode2'),
          <any> DF.blankNode('otherbnode2'),
          DF.blankNode('otherbnode2'),
          DF.blankNode('otherbnode2')),
      ]);
    });
  });
});
