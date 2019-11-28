import {Bindings} from "@comunica/bus-query-operation";
import {blankNode, defaultGraph, literal, namedNode, quad, variable} from "@rdfjs/data-model";
import {ArrayIterator} from "asynciterator";
import * as RDF from "rdf-js";
import {BindingsToQuadsIterator} from "../lib/BindingsToQuadsIterator";

const arrayifyStream = require('arrayify-stream');

describe('BindingsToQuadsIterator', () => {
  describe('#bindTerm', () => {
    describe('with empty bindings', () => {
      const bindings = Bindings({});

      it('should not bind a literal', () => {
        return expect(BindingsToQuadsIterator.bindTerm(bindings, literal('abc')).termType).toEqual('Literal');
      });

      it('should not bind a blank node', () => {
        return expect(BindingsToQuadsIterator.bindTerm(bindings, blankNode()).termType).toEqual('BlankNode');
      });

      it('should not bind a named node', () => {
        return expect(BindingsToQuadsIterator.bindTerm(bindings, namedNode('abc')).termType).toEqual('NamedNode');
      });

      it('should not bind a default graph', () => {
        return expect(BindingsToQuadsIterator.bindTerm(bindings, defaultGraph()).termType).toEqual('DefaultGraph');
      });

      it('should fail to bind a variable', () => {
        return expect(BindingsToQuadsIterator.bindTerm(bindings, variable('abc'))).toBeFalsy();
      });
    });

    describe('with non-empty bindings', () => {
      const bindings = Bindings({ '?a': namedNode('a'), '?b': namedNode('b') });

      it('should not bind a literal', () => {
        return expect(BindingsToQuadsIterator.bindTerm(bindings, literal('abc')).termType).toEqual('Literal');
      });

      it('should not bind a blank node', () => {
        return expect(BindingsToQuadsIterator.bindTerm(bindings, blankNode()).termType).toEqual('BlankNode');
      });

      it('should not bind a named node', () => {
        return expect(BindingsToQuadsIterator.bindTerm(bindings, namedNode('abc')).termType).toEqual('NamedNode');
      });

      it('should not bind a default graph', () => {
        return expect(BindingsToQuadsIterator.bindTerm(bindings, defaultGraph()).termType).toEqual('DefaultGraph');
      });

      it('should bind variable ?a', () => {
        return expect(BindingsToQuadsIterator.bindTerm(bindings, variable('a'))).toEqual(namedNode('a'));
      });

      it('should bind variable ?b', () => {
        return expect(BindingsToQuadsIterator.bindTerm(bindings, variable('b'))).toEqual(namedNode('b'));
      });

      it('should fail to bind variable ?c', () => {
        return expect(BindingsToQuadsIterator.bindTerm(bindings, variable('c'))).toBeFalsy();
      });
    });
  });

  describe('#bindQuad', () => {
    describe('with empty bindings', () => {
      const bindings = Bindings({});

      it('should not bind a quad without variables', () => {
        return expect(BindingsToQuadsIterator.bindQuad(bindings, quad(
          blankNode('s'),
          namedNode('p'),
          literal('o'),
          defaultGraph(),
        ))).toEqual(quad(
          blankNode('s'),
          namedNode('p'),
          literal('o'),
          defaultGraph(),
        ));
      });

      it('should return falsy for a quad with an unbound subject variable', () => {
        return expect(BindingsToQuadsIterator.bindQuad(bindings, quad(
          variable('s'),
          namedNode('p'),
          literal('o'),
          defaultGraph(),
        ))).toBeFalsy();
      });

      it('should return falsy for a quad with an unbound predicate variable', () => {
        return expect(BindingsToQuadsIterator.bindQuad(bindings, quad(
          blankNode('s'),
          variable('p'),
          literal('o'),
          defaultGraph(),
        ))).toBeFalsy();
      });

      it('should return falsy for a quad with an unbound object variable', () => {
        return expect(BindingsToQuadsIterator.bindQuad(bindings, quad(
          blankNode('s'),
          namedNode('p'),
          variable('o'),
          defaultGraph(),
        ))).toBeFalsy();
      });

      it('should return falsy for a quad with an unbound graph variable', () => {
        return expect(BindingsToQuadsIterator.bindQuad(bindings, quad(
          blankNode('s'),
          namedNode('p'),
          literal('o'),
          variable('g'),
        ))).toBeFalsy();
      });
    });

    describe('with non-empty bindings', () => {
      const bindings = Bindings({'?a': namedNode('a'), '?b': namedNode('b')});

      it('should not bind a quad without variables', () => {
        return expect(BindingsToQuadsIterator.bindQuad(bindings, quad(
          blankNode('s'),
          namedNode('p'),
          literal('o'),
          defaultGraph(),
        ))).toEqual(quad(
          blankNode('s'),
          namedNode('p'),
          literal('o'),
          defaultGraph(),
        ));
      });

      it('should return falsy for a quad with an unbound subject variable', () => {
        return expect(BindingsToQuadsIterator.bindQuad(bindings, quad(
          variable('s'),
          namedNode('p'),
          literal('o'),
          defaultGraph(),
        ))).toBeFalsy();
      });

      it('should return falsy for a quad with an unbound predicate variable', () => {
        return expect(BindingsToQuadsIterator.bindQuad(bindings, quad(
          blankNode('s'),
          variable('p'),
          literal('o'),
          defaultGraph(),
        ))).toBeFalsy();
      });

      it('should return falsy for a quad with an unbound object variable', () => {
        return expect(BindingsToQuadsIterator.bindQuad(bindings, quad(
          blankNode('s'),
          namedNode('p'),
          variable('o'),
          defaultGraph(),
        ))).toBeFalsy();
      });

      it('should return falsy for a quad with an unbound graph variable', () => {
        return expect(BindingsToQuadsIterator.bindQuad(bindings, quad(
          blankNode('s'),
          namedNode('p'),
          literal('o'),
          variable('g'),
        ))).toBeFalsy();
      });

      it('should return a bound quad with a bound subject variable', () => {
        return expect(BindingsToQuadsIterator.bindQuad(bindings, quad(
          variable('a'),
          namedNode('p'),
          literal('o'),
          defaultGraph(),
        ))).toEqual(quad(
          namedNode('a'),
          namedNode('p'),
          literal('o'),
          defaultGraph(),
        ));
      });

      it('should return a bound quad with a bound predicate variable', () => {
        return expect(BindingsToQuadsIterator.bindQuad(bindings, quad(
          blankNode('s'),
          variable('b'),
          literal('o'),
          defaultGraph(),
        ))).toEqual(quad(
          blankNode('s'),
          namedNode('b'),
          literal('o'),
          defaultGraph(),
        ));
      });

      it('should return a bound quad with a bound object variable', () => {
        return expect(BindingsToQuadsIterator.bindQuad(bindings, quad(
          blankNode('s'),
          namedNode('p'),
          variable('a'),
          defaultGraph(),
        ))).toEqual(quad(
          blankNode('s'),
          namedNode('p'),
          namedNode('a'),
          defaultGraph(),
        ));
      });

      it('should return a bound quad with a bound graph variable', () => {
        return expect(BindingsToQuadsIterator.bindQuad(bindings, quad(
          blankNode('s'),
          namedNode('p'),
          literal('o'),
          variable('b'),
        ))).toEqual(quad(
          blankNode('s'),
          namedNode('p'),
          literal('o'),
          namedNode('b'),
        ));
      });
    });
  });

  describe('#localizeBlankNode', () => {
    it('should not localize a literal', () => {
      return expect(BindingsToQuadsIterator.localizeBlankNode(0, literal('abc')).termType)
        .toEqual('Literal');
    });

    it('should not localize a variable', () => {
      return expect(BindingsToQuadsIterator.localizeBlankNode(0, variable('abc')).termType)
        .toEqual('Variable');
    });

    it('should not localize a named node', () => {
      return expect(BindingsToQuadsIterator.localizeBlankNode(0, namedNode('abc')).termType)
        .toEqual('NamedNode');
    });

    it('should not localize a default graph', () => {
      return expect(BindingsToQuadsIterator.localizeBlankNode(0, defaultGraph()).termType)
        .toEqual('DefaultGraph');
    });

    it('should localize a blank node with a different counter', () => {
      expect(BindingsToQuadsIterator.localizeBlankNode(0, blankNode('abc')))
        .toEqual(blankNode('abc0'));
      return expect(BindingsToQuadsIterator.localizeBlankNode(1, blankNode('abc')))
        .toEqual(blankNode('abc1'));
    });

    it('should localize a blank node with the same counter', () => {
      expect(BindingsToQuadsIterator.localizeBlankNode(0, blankNode('abc')))
        .toEqual(blankNode('abc0'));
      return expect(BindingsToQuadsIterator.localizeBlankNode(0, blankNode('abc')))
        .toEqual(blankNode('abc0'));
    });

    it('should localize a blank node with mixed counters', () => {
      expect(BindingsToQuadsIterator.localizeBlankNode(0, blankNode('abc')))
        .toEqual(blankNode('abc0'));
      expect(BindingsToQuadsIterator.localizeBlankNode(0, blankNode('abc')))
        .toEqual(blankNode('abc0'));

      expect(BindingsToQuadsIterator.localizeBlankNode(1, blankNode('abc')))
        .toEqual(blankNode('abc1'));
      expect(BindingsToQuadsIterator.localizeBlankNode(1, blankNode('abc')))
        .toEqual(blankNode('abc1'));
    });
  });

  describe('#localizeQuad', () => {
    it('should not change a quad without blank nodes', () => {
      return expect(BindingsToQuadsIterator.localizeQuad(0, quad(
        variable('s'),
        namedNode('p'),
        literal('o'),
        defaultGraph(),
      ))).toEqual(quad(
        variable('s'),
        namedNode('p'),
        literal('o'),
        defaultGraph(),
      ));
    });

    it('should localize a quad with a subject blank node', () => {
      return expect(BindingsToQuadsIterator.localizeQuad(0, quad(
        blankNode('s'),
        namedNode('p'),
        literal('o'),
        defaultGraph(),
      ))).toEqual(quad(
        blankNode('s0'),
        namedNode('p'),
        literal('o'),
        defaultGraph(),
      ));
    });

    it('should localize a quad with a predicate blank node', () => {
      return expect(BindingsToQuadsIterator.localizeQuad(0, quad<RDF.BaseQuad>(
        variable('s'),
        blankNode('p'),
        literal('o'),
        defaultGraph(),
      ))).toEqual(quad<RDF.BaseQuad>(
        variable('s'),
        blankNode('p0'),
        literal('o'),
        defaultGraph(),
      ));
    });

    it('should localize a quad with a object blank node', () => {
      return expect(BindingsToQuadsIterator.localizeQuad(0, quad(
        variable('s'),
        namedNode('p'),
        blankNode('o'),
        defaultGraph(),
      ))).toEqual(quad(
        variable('s'),
        namedNode('p'),
        blankNode('o0'),
        defaultGraph(),
      ));
    });

    it('should localize a quad with a graph blank node', () => {
      return expect(BindingsToQuadsIterator.localizeQuad(0, quad(
        variable('s'),
        namedNode('p'),
        literal('o'),
        blankNode('g'),
      ))).toEqual(quad(
        variable('s'),
        namedNode('p'),
        literal('o'),
        blankNode('g0'),
      ));
    });

    it('should localize a quad with subject, predicate, object and graph blank nodes', () => {
      return expect(BindingsToQuadsIterator.localizeQuad(0, quad(
        blankNode('s'),
        blankNode('p'),
        blankNode('o'),
        blankNode('g'),
      ))).toEqual(quad<RDF.BaseQuad>(
        blankNode('s0'),
        blankNode('p0'),
        blankNode('o0'),
        blankNode('g0'),
      ));
    });

    it('should localize a quad with equal subject, predicate, object and graph blank nodes', () => {
      return expect(BindingsToQuadsIterator.localizeQuad(0, quad(
        blankNode('a'),
        blankNode('a'),
        blankNode('a'),
        blankNode('a'),
      ))).toEqual(quad<RDF.BaseQuad>(
        blankNode('a0'),
        blankNode('a0'),
        blankNode('a0'),
        blankNode('a0'),
      ));
    });

    it('should localize a quad multiple times with blank nodes with different counters', () => {
      expect(BindingsToQuadsIterator.localizeQuad(0, quad(
        blankNode('s'),
        blankNode('p'),
        blankNode('o'),
        blankNode('g'),
      ))).toEqual(quad<RDF.BaseQuad>(
        blankNode('s0'),
        blankNode('p0'),
        blankNode('o0'),
        blankNode('g0'),
      ));

      expect(BindingsToQuadsIterator.localizeQuad(1, quad(
        blankNode('s'),
        blankNode('p'),
        blankNode('o'),
        blankNode('g'),
      ))).toEqual(quad<RDF.BaseQuad>(
        blankNode('s1'),
        blankNode('p1'),
        blankNode('o1'),
        blankNode('g1'),
      ));

      expect(BindingsToQuadsIterator.localizeQuad(2, quad(
        blankNode('s'),
        blankNode('p'),
        blankNode('o'),
        blankNode('g'),
      ))).toEqual(quad<RDF.BaseQuad>(
        blankNode('s2'),
        blankNode('p2'),
        blankNode('o2'),
        blankNode('g2'),
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
        quad(namedNode('s1'), namedNode('p1'), namedNode('o1')),
        quad(namedNode('s2'), namedNode('p2'), namedNode('o2')),
        quad(namedNode('s3'), namedNode('p3'), namedNode('o3')),
      ], 0))
        .toEqual([
          quad(namedNode('s1'), namedNode('p1'), namedNode('o1')),
          quad(namedNode('s2'), namedNode('p2'), namedNode('o2')),
          quad(namedNode('s3'), namedNode('p3'), namedNode('o3')),
        ]);
    });

    it('should bind a template with variables and bindings and without blank nodes', () => {
      return expect(BindingsToQuadsIterator.bindTemplate(Bindings({ '?a': namedNode('a'), '?b': namedNode('b') }), [
        quad(variable('a'), namedNode('p1'), namedNode('o1')),
        quad(namedNode('s2'), variable('b'), namedNode('o2')),
        quad(namedNode('s3'), variable('a'), variable('b')),
      ], 0))
        .toEqual([
          quad(namedNode('a'), namedNode('p1'), namedNode('o1')),
          quad(namedNode('s2'), namedNode('b'), namedNode('o2')),
          quad(namedNode('s3'), namedNode('a'), namedNode('b')),
        ]);
    });

    it('should bind a template with variables and incomplete bindings and without blank nodes', () => {
      return expect(BindingsToQuadsIterator.bindTemplate(Bindings({ '?a': namedNode('a') }), [
        quad(variable('a'), namedNode('p1'), namedNode('o1')),
        quad(namedNode('s2'), variable('b'), namedNode('o2')),
        quad(namedNode('s3'), variable('a'), variable('b')),
      ], 0))
        .toEqual([
          quad(namedNode('a'), namedNode('p1'), namedNode('o1')),
        ]);
    });

    it('should bind a template with variables, bindings and blank nodes', () => {
      return expect(BindingsToQuadsIterator.bindTemplate(Bindings({ '?a': namedNode('a'), '?b': namedNode('b') }), [
        quad(variable('a'), namedNode('p1'), namedNode('o1')),
        quad(blankNode('bnode'), variable('b'), blankNode('bnode')),
        quad(blankNode('bnode'), variable('a'), variable('b')),
      ], 0))
        .toEqual([
          quad(namedNode('a'), namedNode('p1'), namedNode('o1')),
          quad(blankNode('bnode0'), namedNode('b'), blankNode('bnode0')),
          quad(blankNode('bnode0'), namedNode('a'), namedNode('b')),
        ]);
    });
  });

  describe('instantiated for a template', () => {
    let iterator: BindingsToQuadsIterator;
    beforeEach(() => {
      iterator = new BindingsToQuadsIterator([
        quad(variable('a'), namedNode('p1'), namedNode('o1')),
        quad(blankNode('bnode'), variable('b'), blankNode('bnode')),
        quad(blankNode('bnode'), variable('a'), variable('b')),
        quad(blankNode('bnode'), blankNode('otherbnode'), blankNode('otherbnode'), blankNode('otherbnode')),
      ], new ArrayIterator([
        Bindings({ '?a': namedNode('a1'), '?b': namedNode('b1') }),
        Bindings({ '?a': namedNode('a2'), '?b': namedNode('b2') }),
        Bindings({ '?a': namedNode('a3') }),
      ]));
    });

    it('should be transformed to a valid triple stream', async () => {
      return expect(await arrayifyStream(iterator)).toEqual([
        quad(namedNode('a1'), namedNode('p1'), namedNode('o1')),
        quad(blankNode('bnode0'), namedNode('b1'), blankNode('bnode0')),
        quad(blankNode('bnode0'), namedNode('a1'), namedNode('b1')),
        quad<RDF.BaseQuad>(blankNode('bnode0'), blankNode('otherbnode0'),
          blankNode('otherbnode0'), blankNode('otherbnode0')),

        quad(namedNode('a2'), namedNode('p1'), namedNode('o1')),
        quad(blankNode('bnode1'), namedNode('b2'), blankNode('bnode1')),
        quad(blankNode('bnode1'), namedNode('a2'), namedNode('b2')),
        quad<RDF.BaseQuad>(blankNode('bnode1'), blankNode('otherbnode1'),
          blankNode('otherbnode1'), blankNode('otherbnode1')),

        quad(namedNode('a3'), namedNode('p1'), namedNode('o1')),
        quad<RDF.BaseQuad>(blankNode('bnode2'), blankNode('otherbnode2'),
          blankNode('otherbnode2'), blankNode('otherbnode2')),
      ]);
    });
  });
});
