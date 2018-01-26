import {Bindings} from "@comunica/bus-query-operation";
import {ArrayIterator} from "asynciterator";
import {blankNode, defaultGraph, literal, namedNode, quad, variable} from "rdf-data-model";
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
        return expect(BindingsToQuadsIterator.bindTerm(bindings, namedNode()).termType).toEqual('NamedNode');
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
        return expect(BindingsToQuadsIterator.bindTerm(bindings, namedNode()).termType).toEqual('NamedNode');
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
      const counter: {[blankNodeLabel: string]: number} = {};
      const blist: string[] = [];
      const cache: {[blankNodeLabel: string]: RDF.Term} = {};
      return expect(BindingsToQuadsIterator.localizeBlankNode(counter, blist, cache, literal('abc')).termType)
        .toEqual('Literal');
    });

    it('should not localize a variable', () => {
      const counter: {[blankNodeLabel: string]: number} = {};
      const blist: string[] = [];
      const cache: {[blankNodeLabel: string]: RDF.Term} = {};
      return expect(BindingsToQuadsIterator.localizeBlankNode(counter, blist, cache, variable('abc')).termType)
        .toEqual('Variable');
    });

    it('should not localize a named node', () => {
      const counter: {[blankNodeLabel: string]: number} = {};
      const blist: string[] = [];
      const cache: {[blankNodeLabel: string]: RDF.Term} = {};
      return expect(BindingsToQuadsIterator.localizeBlankNode(counter, blist, cache, namedNode('abc')).termType)
        .toEqual('NamedNode');
    });

    it('should not localize a default graph', () => {
      const counter: {[blankNodeLabel: string]: number} = {};
      const blist: string[] = [];
      const cache: {[blankNodeLabel: string]: RDF.Term} = {};
      return expect(BindingsToQuadsIterator.localizeBlankNode(counter, blist, cache, defaultGraph()).termType)
        .toEqual('DefaultGraph');
    });

    it('should localize a blank node without cache', () => {
      const counter: {[blankNodeLabel: string]: number} = {};
      const blist: string[] = ['abc'];
      expect(BindingsToQuadsIterator.localizeBlankNode(counter, blist, {}, blankNode('abc')))
        .toEqual(blankNode('abc0'));
      return expect(BindingsToQuadsIterator.localizeBlankNode(counter, blist, {}, blankNode('abc')))
        .toEqual(blankNode('abc1'));
    });

    it('should localize a blank node with cache', () => {
      const counter: {[blankNodeLabel: string]: number} = {};
      const blist: string[] = ['abc'];
      const cache: {[blankNodeLabel: string]: RDF.Term} = {};
      expect(BindingsToQuadsIterator.localizeBlankNode(counter, blist, cache, blankNode('abc')))
        .toEqual(blankNode('abc0'));
      return expect(BindingsToQuadsIterator.localizeBlankNode(counter, blist, cache, blankNode('abc')))
        .toEqual(blankNode('abc0'));
    });

    it('should localize a blank node with different caches', () => {
      const counter: {[blankNodeLabel: string]: number} = {};
      const blist: string[] = ['abc'];
      const cache1: {[blankNodeLabel: string]: RDF.Term} = {};
      const cache2: {[blankNodeLabel: string]: RDF.Term} = {};
      expect(BindingsToQuadsIterator.localizeBlankNode(counter, blist, cache1, blankNode('abc')))
        .toEqual(blankNode('abc0'));
      expect(BindingsToQuadsIterator.localizeBlankNode(counter, blist, cache1, blankNode('abc')))
        .toEqual(blankNode('abc0'));

      expect(BindingsToQuadsIterator.localizeBlankNode(counter, blist, cache2, blankNode('abc')))
        .toEqual(blankNode('abc1'));
      expect(BindingsToQuadsIterator.localizeBlankNode(counter, blist, cache2, blankNode('abc')))
        .toEqual(blankNode('abc1'));
    });

    it('should localize multiple blank nodes without cache', () => {
      const counter: {[blankNodeLabel: string]: number} = {};
      const blist: string[] = ['abc', 'def'];
      expect(BindingsToQuadsIterator.localizeBlankNode(counter, blist, {}, blankNode('abc')))
        .toEqual(blankNode('abc0'));
      expect(BindingsToQuadsIterator.localizeBlankNode(counter, blist, {}, blankNode('abc')))
        .toEqual(blankNode('abc1'));

      expect(BindingsToQuadsIterator.localizeBlankNode(counter, blist, {}, blankNode('def')))
        .toEqual(blankNode('def0'));
      expect(BindingsToQuadsIterator.localizeBlankNode(counter, blist, {}, blankNode('def')))
        .toEqual(blankNode('def1'));

      expect(BindingsToQuadsIterator.localizeBlankNode(counter, blist, {}, blankNode('abc')))
        .toEqual(blankNode('abc2'));
    });

    it('should localize multiple blank nodes with cache', () => {
      const counter: {[blankNodeLabel: string]: number} = {};
      const blist: string[] = ['abc', 'def'];
      const cache: {[blankNodeLabel: string]: RDF.Term} = {};
      expect(BindingsToQuadsIterator.localizeBlankNode(counter, blist, cache, blankNode('abc')))
        .toEqual(blankNode('abc0'));
      expect(BindingsToQuadsIterator.localizeBlankNode(counter, blist, cache, blankNode('abc')))
        .toEqual(blankNode('abc0'));

      expect(BindingsToQuadsIterator.localizeBlankNode(counter, blist, cache, blankNode('def')))
        .toEqual(blankNode('def0'));
      expect(BindingsToQuadsIterator.localizeBlankNode(counter, blist, cache, blankNode('def')))
        .toEqual(blankNode('def0'));

      expect(BindingsToQuadsIterator.localizeBlankNode(counter, blist, cache, blankNode('abc')))
        .toEqual(blankNode('abc0'));
    });

    it('should localize multiple blank nodes with different caches', () => {
      const counter: {[blankNodeLabel: string]: number} = {};
      const blist: string[] = ['abc', 'def'];
      const cache1: {[blankNodeLabel: string]: RDF.Term} = {};
      const cache2: {[blankNodeLabel: string]: RDF.Term} = {};
      expect(BindingsToQuadsIterator.localizeBlankNode(counter, blist, cache1, blankNode('abc')))
        .toEqual(blankNode('abc0'));
      expect(BindingsToQuadsIterator.localizeBlankNode(counter, blist, cache1, blankNode('abc')))
        .toEqual(blankNode('abc0'));

      expect(BindingsToQuadsIterator.localizeBlankNode(counter, blist, cache1, blankNode('def')))
        .toEqual(blankNode('def0'));
      expect(BindingsToQuadsIterator.localizeBlankNode(counter, blist, cache1, blankNode('def')))
        .toEqual(blankNode('def0'));

      expect(BindingsToQuadsIterator.localizeBlankNode(counter, blist, cache1, blankNode('abc')))
        .toEqual(blankNode('abc0'));

      expect(BindingsToQuadsIterator.localizeBlankNode(counter, blist, cache2, blankNode('abc')))
        .toEqual(blankNode('abc1'));
      expect(BindingsToQuadsIterator.localizeBlankNode(counter, blist, cache2, blankNode('abc')))
        .toEqual(blankNode('abc1'));

      expect(BindingsToQuadsIterator.localizeBlankNode(counter, blist, cache2, blankNode('def')))
        .toEqual(blankNode('def1'));
      expect(BindingsToQuadsIterator.localizeBlankNode(counter, blist, cache2, blankNode('def')))
        .toEqual(blankNode('def1'));

      expect(BindingsToQuadsIterator.localizeBlankNode(counter, blist, cache2, blankNode('abc')))
        .toEqual(blankNode('abc1'));
    });
  });

  describe('#localizeQuad', () => {
    it('should not change a quad without blank nodes', () => {
      const counter: {[blankNodeLabel: string]: number} = {};
      const blist: string[] = [];
      const cache: {[blankNodeLabel: string]: RDF.Term} = {};
      return expect(BindingsToQuadsIterator.localizeQuad(counter, blist, cache, quad(
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
      const counter: {[blankNodeLabel: string]: number} = {};
      const blist: string[] = ['s'];
      const cache: {[blankNodeLabel: string]: RDF.Term} = {};
      return expect(BindingsToQuadsIterator.localizeQuad(counter, blist, cache, quad(
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
      const counter: {[blankNodeLabel: string]: number} = {};
      const blist: string[] = ['p'];
      const cache: {[blankNodeLabel: string]: RDF.Term} = {};
      return expect(BindingsToQuadsIterator.localizeQuad(counter, blist, cache, quad(
        variable('s'),
        blankNode('p'),
        literal('o'),
        defaultGraph(),
      ))).toEqual(quad(
        variable('s'),
        blankNode('p0'),
        literal('o'),
        defaultGraph(),
      ));
    });

    it('should localize a quad with a object blank node', () => {
      const counter: {[blankNodeLabel: string]: number} = {};
      const blist: string[] = ['o'];
      const cache: {[blankNodeLabel: string]: RDF.Term} = {};
      return expect(BindingsToQuadsIterator.localizeQuad(counter, blist, cache, quad(
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
      const counter: {[blankNodeLabel: string]: number} = {};
      const blist: string[] = ['g'];
      const cache: {[blankNodeLabel: string]: RDF.Term} = {};
      return expect(BindingsToQuadsIterator.localizeQuad(counter, blist, cache, quad(
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
      const counter: {[blankNodeLabel: string]: number} = {};
      const blist: string[] = ['s', 'p', 'o', 'g'];
      const cache: {[blankNodeLabel: string]: RDF.Term} = {};
      return expect(BindingsToQuadsIterator.localizeQuad(counter, blist, cache, quad(
        blankNode('s'),
        blankNode('p'),
        blankNode('o'),
        blankNode('g'),
      ))).toEqual(quad(
        blankNode('s0'),
        blankNode('p0'),
        blankNode('o0'),
        blankNode('g0'),
      ));
    });

    it('should localize a quad with equal subject, predicate, object and graph blank nodes', () => {
      const counter: {[blankNodeLabel: string]: number} = {};
      const blist: string[] = ['a'];
      const cache: {[blankNodeLabel: string]: RDF.Term} = {};
      return expect(BindingsToQuadsIterator.localizeQuad(counter, blist, cache, quad(
        blankNode('a'),
        blankNode('a'),
        blankNode('a'),
        blankNode('a'),
      ))).toEqual(quad(
        blankNode('a0'),
        blankNode('a0'),
        blankNode('a0'),
        blankNode('a0'),
      ));
    });

    it('should localize a quad multiple times with subject, predicate, object and graph blank nodes without cache',
      () => {
        const counter: {[blankNodeLabel: string]: number} = {};
        const blist: string[] = ['s', 'p', 'o', 'g'];
        expect(BindingsToQuadsIterator.localizeQuad(counter, blist, {}, quad(
          blankNode('s'),
          blankNode('p'),
          blankNode('o'),
          blankNode('g'),
        ))).toEqual(quad(
          blankNode('s0'),
          blankNode('p0'),
          blankNode('o0'),
          blankNode('g0'),
        ));

        expect(BindingsToQuadsIterator.localizeQuad(counter, blist, {}, quad(
          blankNode('s'),
          blankNode('p'),
          blankNode('o'),
          blankNode('g'),
        ))).toEqual(quad(
          blankNode('s1'),
          blankNode('p1'),
          blankNode('o1'),
          blankNode('g1'),
        ));

        expect(BindingsToQuadsIterator.localizeQuad(counter, blist, {}, quad(
          blankNode('s'),
          blankNode('p'),
          blankNode('o'),
          blankNode('g'),
        ))).toEqual(quad(
          blankNode('s2'),
          blankNode('p2'),
          blankNode('o2'),
          blankNode('g2'),
        ));
      });

    it('should localize a quad multiple times with subject, predicate, object and graph blank nodes with cache', () => {
      const counter: {[blankNodeLabel: string]: number} = {};
      const blist: string[] = ['s', 'p', 'o', 'g'];
      const cache: {[blankNodeLabel: string]: RDF.Term} = {};
      expect(BindingsToQuadsIterator.localizeQuad(counter, blist, cache, quad(
        blankNode('s'),
        blankNode('p'),
        blankNode('o'),
        blankNode('g'),
      ))).toEqual(quad(
        blankNode('s0'),
        blankNode('p0'),
        blankNode('o0'),
        blankNode('g0'),
      ));

      expect(BindingsToQuadsIterator.localizeQuad(counter, blist, cache, quad(
        blankNode('s'),
        blankNode('p'),
        blankNode('o'),
        blankNode('g'),
      ))).toEqual(quad(
        blankNode('s0'),
        blankNode('p0'),
        blankNode('o0'),
        blankNode('g0'),
      ));

      expect(BindingsToQuadsIterator.localizeQuad(counter, blist, cache, quad(
        blankNode('s'),
        blankNode('p'),
        blankNode('o'),
        blankNode('g'),
      ))).toEqual(quad(
        blankNode('s0'),
        blankNode('p0'),
        blankNode('o0'),
        blankNode('g0'),
      ));
    });
  });

  describe('#bindTemplate', () => {
    it('should bind an empty template without variables, blank nodes and bindings', () => {
      return expect(BindingsToQuadsIterator.bindTemplate(Bindings({}), [], {}, [], {}))
        .toEqual([]);
    });

    it('should bind a template without variables, blank nodes and bindings', () => {
      return expect(BindingsToQuadsIterator.bindTemplate(Bindings({}), [
        quad(namedNode('s1'), namedNode('p1'), namedNode('o1')),
        quad(namedNode('s2'), namedNode('p2'), namedNode('o2')),
        quad(namedNode('s3'), namedNode('p3'), namedNode('o3')),
      ], {}, [], {}))
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
      ], {}, [], {}))
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
      ], {}, [], {}))
        .toEqual([
          quad(namedNode('a'), namedNode('p1'), namedNode('o1')),
        ]);
    });

    it('should bind a template with variables, bindings and blank nodes', () => {
      return expect(BindingsToQuadsIterator.bindTemplate(Bindings({ '?a': namedNode('a'), '?b': namedNode('b') }), [
        quad(variable('a'), namedNode('p1'), namedNode('o1')),
        quad(blankNode('bnode'), variable('b'), blankNode('bnode')),
        quad(blankNode('bnode'), variable('a'), variable('b')),
      ], {}, ['bnode'], {}))
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
        quad(blankNode('bnode0'), blankNode('otherbnode0'), blankNode('otherbnode0'), blankNode('otherbnode0')),

        quad(namedNode('a2'), namedNode('p1'), namedNode('o1')),
        quad(blankNode('bnode1'), namedNode('b2'), blankNode('bnode1')),
        quad(blankNode('bnode1'), namedNode('a2'), namedNode('b2')),
        quad(blankNode('bnode1'), blankNode('otherbnode1'), blankNode('otherbnode1'), blankNode('otherbnode1')),

        quad(namedNode('a3'), namedNode('p1'), namedNode('o1')),
        quad(blankNode('bnode2'), blankNode('otherbnode2'), blankNode('otherbnode2'), blankNode('otherbnode2')),
      ]);
    });
  });
});
