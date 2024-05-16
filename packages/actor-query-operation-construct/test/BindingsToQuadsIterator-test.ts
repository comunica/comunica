import { BindingsFactory } from '@comunica/bindings-factory';
import { BlankNodeBindingsScoped } from '@comunica/data-factory';
import type * as RDF from '@rdfjs/types';
import arrayifyStream from 'arrayify-stream';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { BindingsToQuadsIterator } from '../lib/BindingsToQuadsIterator';

const DF = new DataFactory();
const BF = new BindingsFactory();

describe('BindingsToQuadsIterator', () => {
  describe('#bindTerm', () => {
    describe('with empty bindings', () => {
      const bindings = BF.bindings();

      it('should not bind a literal', () => {
        expect(BindingsToQuadsIterator.bindTerm(bindings, DF.literal('abc'))!.termType).toBe('Literal');
      });

      it('should not bind a blank node', () => {
        expect(BindingsToQuadsIterator.bindTerm(bindings, DF.blankNode())!.termType).toBe('BlankNode');
      });

      it('should not bind a named node', () => {
        expect(BindingsToQuadsIterator.bindTerm(bindings, DF.namedNode('abc'))!.termType).toBe('NamedNode');
      });

      it('should not bind a default graph', () => {
        expect(BindingsToQuadsIterator.bindTerm(bindings, DF.defaultGraph())!.termType).toBe('DefaultGraph');
      });

      it('should fail to bind a variable', () => {
        expect(BindingsToQuadsIterator.bindTerm(bindings, DF.variable('abc'))).toBeFalsy();
      });
    });

    describe('with non-empty bindings', () => {
      const bindings = BF.bindings([
        [ DF.variable('a'), DF.namedNode('a') ],
        [ DF.variable('b'), DF.namedNode('b') ],
      ]);

      it('should not bind a literal', () => {
        expect(BindingsToQuadsIterator.bindTerm(bindings, DF.literal('abc'))!.termType).toBe('Literal');
      });

      it('should not bind a blank node', () => {
        expect(BindingsToQuadsIterator.bindTerm(bindings, DF.blankNode())!.termType).toBe('BlankNode');
      });

      it('should not bind a named node', () => {
        expect(BindingsToQuadsIterator.bindTerm(bindings, DF.namedNode('abc'))!.termType).toBe('NamedNode');
      });

      it('should not bind a default graph', () => {
        expect(BindingsToQuadsIterator.bindTerm(bindings, DF.defaultGraph())!.termType).toBe('DefaultGraph');
      });

      it('should bind variable ?a', () => {
        expect(BindingsToQuadsIterator.bindTerm(bindings, DF.variable('a'))).toEqual(DF.namedNode('a'));
      });

      it('should bind variable ?b', () => {
        expect(BindingsToQuadsIterator.bindTerm(bindings, DF.variable('b'))).toEqual(DF.namedNode('b'));
      });

      it('should fail to bind variable ?c', () => {
        expect(BindingsToQuadsIterator.bindTerm(bindings, DF.variable('c'))).toBeFalsy();
      });
    });
  });

  describe('#bindQuad', () => {
    describe('with empty bindings', () => {
      const bindings = BF.bindings();

      it('should not bind a quad without variables', () => {
        expect(BindingsToQuadsIterator.bindQuad(bindings, DF.quad(
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
        expect(BindingsToQuadsIterator.bindQuad(bindings, DF.quad(
          DF.variable('s'),
          DF.namedNode('p'),
          DF.literal('o'),
          DF.defaultGraph(),
        ))).toBeFalsy();
      });

      it('should return falsy for a quad with an unbound predicate variable', () => {
        expect(BindingsToQuadsIterator.bindQuad(bindings, DF.quad(
          DF.blankNode('s'),
          DF.variable('p'),
          DF.literal('o'),
          DF.defaultGraph(),
        ))).toBeFalsy();
      });

      it('should return falsy for a quad with an unbound object variable', () => {
        expect(BindingsToQuadsIterator.bindQuad(bindings, DF.quad(
          DF.blankNode('s'),
          DF.namedNode('p'),
          DF.variable('o'),
          DF.defaultGraph(),
        ))).toBeFalsy();
      });

      it('should return falsy for a quad with an unbound graph variable', () => {
        expect(BindingsToQuadsIterator.bindQuad(bindings, DF.quad(
          DF.blankNode('s'),
          DF.namedNode('p'),
          DF.literal('o'),
          DF.variable('g'),
        ))).toBeFalsy();
      });
    });

    describe('with non-empty bindings', () => {
      const bindings = BF.bindings([
        [ DF.variable('a'), DF.namedNode('a') ],
        [ DF.variable('b'), DF.namedNode('b') ],
      ]);

      it('should not bind a quad without variables', () => {
        expect(BindingsToQuadsIterator.bindQuad(bindings, DF.quad(
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
        expect(BindingsToQuadsIterator.bindQuad(bindings, DF.quad(
          DF.variable('s'),
          DF.namedNode('p'),
          DF.literal('o'),
          DF.defaultGraph(),
        ))).toBeFalsy();
      });

      it('should return falsy for a quad with an unbound predicate variable', () => {
        expect(BindingsToQuadsIterator.bindQuad(bindings, DF.quad(
          DF.blankNode('s'),
          DF.variable('p'),
          DF.literal('o'),
          DF.defaultGraph(),
        ))).toBeFalsy();
      });

      it('should return falsy for a quad with an unbound object variable', () => {
        expect(BindingsToQuadsIterator.bindQuad(bindings, DF.quad(
          DF.blankNode('s'),
          DF.namedNode('p'),
          DF.variable('o'),
          DF.defaultGraph(),
        ))).toBeFalsy();
      });

      it('should return falsy for a quad with an unbound graph variable', () => {
        expect(BindingsToQuadsIterator.bindQuad(bindings, DF.quad(
          DF.blankNode('s'),
          DF.namedNode('p'),
          DF.literal('o'),
          DF.variable('g'),
        ))).toBeFalsy();
      });

      it('should return a bound quad with a bound subject variable', () => {
        expect(BindingsToQuadsIterator.bindQuad(bindings, DF.quad(
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
        expect(BindingsToQuadsIterator.bindQuad(bindings, DF.quad(
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
        expect(BindingsToQuadsIterator.bindQuad(bindings, DF.quad(
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
        expect(BindingsToQuadsIterator.bindQuad(bindings, DF.quad(
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

      it('should return a bound quoted quad', () => {
        expect(BindingsToQuadsIterator.bindQuad(bindings, DF.quad(
          DF.quad(
            DF.variable('a'),
            DF.namedNode('p'),
            DF.literal('o'),
          ),
          DF.namedNode('p'),
          DF.quad(
            DF.variable('b'),
            DF.namedNode('p'),
            DF.literal('o'),
          ),
        ))).toEqual(DF.quad(
          DF.quad(
            DF.namedNode('a'),
            DF.namedNode('p'),
            DF.literal('o'),
          ),
          DF.namedNode('p'),
          DF.quad(
            DF.namedNode('b'),
            DF.namedNode('p'),
            DF.literal('o'),
          ),
        ));
      });
    });
  });

  describe('#localizeBlankNode', () => {
    it('should not localize a literal', () => {
      expect(BindingsToQuadsIterator.localizeBlankNode(0, DF.literal('abc')).termType)
        .toBe('Literal');
    });

    it('should not localize a variable', () => {
      expect(BindingsToQuadsIterator.localizeBlankNode(0, DF.variable('abc')).termType)
        .toBe('Variable');
    });

    it('should not localize a named node', () => {
      expect(BindingsToQuadsIterator.localizeBlankNode(0, DF.namedNode('abc')).termType)
        .toBe('NamedNode');
    });

    it('should not localize a default graph', () => {
      expect(BindingsToQuadsIterator.localizeBlankNode(0, DF.defaultGraph()).termType)
        .toBe('DefaultGraph');
    });

    it('should localize a blank node with a different counter', () => {
      expect(BindingsToQuadsIterator.localizeBlankNode(0, DF.blankNode('abc')))
        .toEqual(DF.blankNode('abc0'));
      expect(BindingsToQuadsIterator.localizeBlankNode(1, DF.blankNode('abc')))
        .toEqual(DF.blankNode('abc1'));
    });

    it('should localize a blank node with the same counter', () => {
      expect(BindingsToQuadsIterator.localizeBlankNode(0, DF.blankNode('abc')))
        .toEqual(DF.blankNode('abc0'));
      expect(BindingsToQuadsIterator.localizeBlankNode(0, DF.blankNode('abc')))
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

    it('should localize a blank node scoped to a single set of bindings', () => {
      expect(BindingsToQuadsIterator.localizeBlankNode(0, new BlankNodeBindingsScoped('abc')))
        .toEqual(DF.blankNode('abc0'));
    });
  });

  describe('#localizeQuad', () => {
    it('should not change a quad without blank nodes', () => {
      expect(BindingsToQuadsIterator.localizeQuad(0, DF.quad(
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
      expect(BindingsToQuadsIterator.localizeQuad(0, DF.quad(
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
      expect(BindingsToQuadsIterator.localizeQuad(0, <any> DF.quad(
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
      expect(BindingsToQuadsIterator.localizeQuad(0, DF.quad(
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
      expect(BindingsToQuadsIterator.localizeQuad(0, DF.quad(
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
    });

    it('should localize a quad with equal subject, predicate, object and graph blank nodes', () => {
      expect(BindingsToQuadsIterator.localizeQuad(0, DF.quad(
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

    it('should localize a quad with equal subject, predicate, object and graph blank nodes in quoted triples', () => {
      expect(BindingsToQuadsIterator.localizeQuad(0, DF.quad(
        DF.quad(
          DF.blankNode('a'),
          <any> DF.blankNode('a'),
          DF.blankNode('a'),
        ),
        <any> DF.blankNode('a'),
        DF.blankNode('a'),
        DF.blankNode('a'),
      ))).toEqual(DF.quad(
        DF.quad(
          DF.blankNode('a0'),
          <any> DF.blankNode('a0'),
          DF.blankNode('a0'),
        ),
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
      ], new ArrayIterator<RDF.Bindings>([
        BF.bindings([
          [ DF.variable('a'), DF.namedNode('a1') ],
          [ DF.variable('b'), DF.namedNode('b1') ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.namedNode('a2') ],
          [ DF.variable('b'), DF.namedNode('b2') ],
        ]),
        BF.bindings([
          [ DF.variable('a'), DF.namedNode('a3') ],
        ]),
      ], { autoStart: false }));
    });

    it('should be transformed to a valid triple stream', async() => {
      await expect(arrayifyStream(iterator)).resolves.toEqual([
        DF.quad(DF.namedNode('a1'), DF.namedNode('p1'), DF.namedNode('o1')),
        DF.quad(DF.blankNode('bnode0'), DF.namedNode('b1'), DF.blankNode('bnode0')),
        DF.quad(DF.blankNode('bnode0'), DF.namedNode('a1'), DF.namedNode('b1')),
        DF.quad(
          DF.blankNode('bnode0'),
<any> DF.blankNode('otherbnode0'),
DF.blankNode('otherbnode0'),
DF.blankNode('otherbnode0'),
        ),

        DF.quad(DF.namedNode('a2'), DF.namedNode('p1'), DF.namedNode('o1')),
        DF.quad(DF.blankNode('bnode1'), DF.namedNode('b2'), DF.blankNode('bnode1')),
        DF.quad(DF.blankNode('bnode1'), DF.namedNode('a2'), DF.namedNode('b2')),
        DF.quad(
          DF.blankNode('bnode1'),
<any> DF.blankNode('otherbnode1'),
DF.blankNode('otherbnode1'),
DF.blankNode('otherbnode1'),
        ),

        DF.quad(DF.namedNode('a3'), DF.namedNode('p1'), DF.namedNode('o1')),
        DF.quad(
          DF.blankNode('bnode2'),
<any> DF.blankNode('otherbnode2'),
DF.blankNode('otherbnode2'),
DF.blankNode('otherbnode2'),
        ),
      ]);
    });

    describe('#bindTemplate', () => {
      it('should bind an empty template without variables, blank nodes and bindings', async() => {
        expect(iterator.bindTemplate(BF.bindings(), [], 0))
          .toEqual([]);

        // Consume the iterator
        await expect(iterator.toArray()).resolves.toHaveLength(10);
      });

      it('should bind a template without variables, blank nodes and bindings', async() => {
        expect(iterator.bindTemplate(BF.bindings(), [
          DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
          DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2')),
          DF.quad(DF.namedNode('s3'), DF.namedNode('p3'), DF.namedNode('o3')),
        ], 0))
          .toEqual([
            DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1')),
            DF.quad(DF.namedNode('s2'), DF.namedNode('p2'), DF.namedNode('o2')),
            DF.quad(DF.namedNode('s3'), DF.namedNode('p3'), DF.namedNode('o3')),
          ]);

        // Consume the iterator
        await expect(iterator.toArray()).resolves.toHaveLength(10);
      });

      it('should bind a template with variables and bindings and without blank nodes', async() => {
        expect(iterator.bindTemplate(BF.bindings([
          [ DF.variable('a'), DF.namedNode('a') ],
          [ DF.variable('b'), DF.namedNode('b') ],
        ]), [
          DF.quad(DF.variable('a'), DF.namedNode('p1'), DF.namedNode('o1')),
          DF.quad(DF.namedNode('s2'), DF.variable('b'), DF.namedNode('o2')),
          DF.quad(DF.namedNode('s3'), DF.variable('a'), DF.variable('b')),
        ], 0))
          .toEqual([
            DF.quad(DF.namedNode('a'), DF.namedNode('p1'), DF.namedNode('o1')),
            DF.quad(DF.namedNode('s2'), DF.namedNode('b'), DF.namedNode('o2')),
            DF.quad(DF.namedNode('s3'), DF.namedNode('a'), DF.namedNode('b')),
          ]);

        // Consume the iterator
        await expect(iterator.toArray()).resolves.toHaveLength(10);
      });

      it('should bind a template with variables and incomplete bindings and without blank nodes', async() => {
        expect(iterator.bindTemplate(BF.bindings([
          [ DF.variable('a'), DF.namedNode('a') ],
        ]), [
          DF.quad(DF.variable('a'), DF.namedNode('p1'), DF.namedNode('o1')),
          DF.quad(DF.namedNode('s2'), DF.variable('b'), DF.namedNode('o2')),
          DF.quad(DF.namedNode('s3'), DF.variable('a'), DF.variable('b')),
        ], 0))
          .toEqual([
            DF.quad(DF.namedNode('a'), DF.namedNode('p1'), DF.namedNode('o1')),
          ]);

        // Consume the iterator
        await expect(iterator.toArray()).resolves.toHaveLength(10);
      });

      it('should bind a template with variables, bindings and blank nodes', async() => {
        expect(iterator.bindTemplate(BF.bindings([
          [ DF.variable('a'), DF.namedNode('a') ],
          [ DF.variable('b'), DF.namedNode('b') ],
        ]), [
          DF.quad(DF.variable('a'), DF.namedNode('p1'), DF.namedNode('o1')),
          DF.quad(DF.blankNode('bnode'), DF.variable('b'), DF.blankNode('bnode')),
          DF.quad(DF.blankNode('bnode'), DF.variable('a'), DF.variable('b')),
        ], 0))
          .toEqual([
            DF.quad(DF.namedNode('a'), DF.namedNode('p1'), DF.namedNode('o1')),
            DF.quad(DF.blankNode('bnode0'), DF.namedNode('b'), DF.blankNode('bnode0')),
            DF.quad(DF.blankNode('bnode0'), DF.namedNode('a'), DF.namedNode('b')),
          ]);

        // Consume the iterator
        await expect(iterator.toArray()).resolves.toHaveLength(10);
      });
    });
  });
});
