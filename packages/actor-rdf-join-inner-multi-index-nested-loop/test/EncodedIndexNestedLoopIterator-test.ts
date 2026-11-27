import { QuerySourceRdfJs } from '@comunica/actor-query-source-identify-rdfjs';
import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import type { Bindings, IActionContext, IQuerySource, IQuerySourceWrapper, MetadataVariable } from '@comunica/types';
import type { Algebra } from '@comunica/utils-algebra';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { assignOperationSource } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator, BufferedIterator } from 'asynciterator';
import { Store } from 'n3';
import { DataFactory } from 'rdf-data-factory';
import { RdfStore } from 'rdf-stores';
import { termToString } from 'rdf-string';
import type { IEncodedIndexNestedLoopOptions } from '../lib/EncodedIndexNestedLoopIterator';
import { EncodedIndexNestedLoopIterator } from '../lib/EncodedIndexNestedLoopIterator';
import type { IIndexNestedLoopLookup } from '../lib/IndexNestedLoopIterator';

const DF = new DataFactory();
const AF = new AlgebraFactory(DF);
const BF = new BindingsFactory(DF);
const OPTIONS: IEncodedIndexNestedLoopOptions = { unionsAndPaths: true, adaptive: true };

/**
 * Turn a short string into a term: ?x is a variable, _:x a blank node, "x" a literal, and others named nodes.
 */
function t(value: string): any {
  if (value.startsWith('?')) {
    return DF.variable(value.slice(1));
  }
  if (value.startsWith('_:')) {
    return DF.blankNode(value.slice(2));
  }
  if (value.startsWith('"')) {
    return DF.literal(value.slice(1, -1));
  }
  return DF.namedNode(`ex:${value}`);
}

describe('EncodedIndexNestedLoopIterator', () => {
  let context: IActionContext;
  let store: RdfStore;
  let wrapper: IQuerySourceWrapper;
  const quoted = DF.quad(t('a'), t('p'), t('b'));

  function pattern(s: string, p: string, o: string, source = wrapper, g?: RDF.Term): Algebra.Pattern {
    return assignOperationSource(AF.createPattern(t(s), t(p), t(o), <any> g), source);
  }

  function lookup(operation: Algebra.Operation, optional?: boolean): IIndexNestedLoopLookup {
    return { operation, source: wrapper.source, context, optional };
  }

  function path(
    s: string,
    predicate: string,
    o: string,
    kind: 'zero' | 'one' = 'zero',
    inverse = false,
    graph?: RDF.Term,
  ): Algebra.Path {
    let link: Algebra.Operation = assignOperationSource(AF.createLink(<RDF.NamedNode> t(predicate)), wrapper);
    if (inverse) {
      link = AF.createInv(link);
    }
    return AF.createPath(
      t(s),
      kind === 'zero' ? AF.createZeroOrMorePath(link) : AF.createOneOrMorePath(link),
      t(o),
      graph,
    );
  }

  function union(...inputs: Algebra.Pattern[]): Algebra.Union {
    return AF.createUnion(inputs);
  }

  function variables(...names: string[]): MetadataVariable[] {
    return names.map(name => ({ variable: DF.variable(name.replace('?', '')), canBeUndef: name.startsWith('?') }));
  }

  function input(...bindings: Record<string, string>[]): Bindings[] {
    return bindings.map(record => BF.bindings(Object.entries(record)
      .map(([ key, value ]) => [ DF.variable(key), t(value) ])));
  }

  async function run(
    lookups: IIndexNestedLoopLookup[],
    inputs: Bindings[],
    inputVariables: MetadataVariable[],
    options = OPTIONS,
    first?: IIndexNestedLoopLookup,
  ): Promise<string[]> {
    const plan = EncodedIndexNestedLoopIterator.compile(lookups, inputVariables, context, options, first);
    expect(plan).toBeDefined();
    const iterator = new EncodedIndexNestedLoopIterator(
      new ArrayIterator(inputs, { autoStart: false }),
      plan!,
      BF,
      DF,
    );
    const results = await iterator.toArray();
    return results.map(bindings => [ ...bindings ]
      .map(([ key, value ]) => `${key.value}=${termToString(value).replaceAll('ex:', '')}`).sort().join(' ')).sort();
  }

  // Adds a node with many outgoing p steps, so that lookups from it are worth replacing by cheaper ones.
  function addHub(): void {
    const quads: RDF.Quad[] = [ DF.quad(t('hub'), t('type'), t('H')), DF.quad(t('hub'), t('r2'), t('c')) ];
    for (let i = 0; i < 20; i++) {
      quads.push(DF.quad(t('hub'), t('p'), t(`n${i}`)));
    }
    store.addQuads(quads);
  }

  beforeEach(() => {
    context = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });
    store = RdfStore.createOrdered();
    store.addQuads([
      [ 'a', 'p', 'b' ],
      [ 'b', 'p', 'c' ],
      [ 'c', 'p', 'a' ],
      [ 'c', 'p', 'd' ],
      [ 'd', 'p', '_:x' ],
      [ '_:x', 'p', 'e' ],
      [ 'e', 'q', '"lit"' ],
      [ 'a', 'type', 'T' ],
      [ 'd', 'type', 'T' ],
      [ 'e', 'type', 'U' ],
      [ 'f', 'type', 'T' ],
      [ 'f', 'p', 'f' ],
      [ 'a', 'r1', 'd' ],
      [ 'b', 'r2', 'e' ],
      [ 'a', 'r2', 'a' ],
    ].map(([ s, p, o ]) => DF.quad(<RDF.Quad_Subject> t(s), <RDF.Quad_Predicate> t(p), <RDF.Quad_Object> t(o))));
    store.addQuads([
      DF.quad(t('g'), t('p'), quoted),
      DF.quad(quoted, t('p'), t('h')),
    ]);
    wrapper = { source: new QuerySourceRdfJs(store, DF, BF) };
  });

  describe('getEncodedOnlySource', () => {
    it('should get the source of unions of patterns over the same source', () => {
      expect(EncodedIndexNestedLoopIterator
        .getEncodedOnlySource(union(pattern('?s', 'p', '?o'), pattern('?s', 'q', '?o'))))
        .toBe(wrapper);
    });

    it('should get no source for other unions', () => {
      const other = { source: new QuerySourceRdfJs(RdfStore.createOrdered(), DF, BF) };
      expect(EncodedIndexNestedLoopIterator.getEncodedOnlySource(union())).toBeUndefined();
      expect(EncodedIndexNestedLoopIterator
        .getEncodedOnlySource(union(pattern('?s', 'p', '?o'), pattern('?s', 'q', '?o', other)))).toBeUndefined();
      expect(EncodedIndexNestedLoopIterator
        .getEncodedOnlySource(union(pattern('?s', 'p', '?o'), AF.createPattern(t('?s'), t('q'), t('?o')))))
        .toBeUndefined();
      expect(EncodedIndexNestedLoopIterator
        .getEncodedOnlySource(AF.createUnion([ AF.createBgp([]) ]))).toBeUndefined();
    });

    it('should get the source of the predicate of closures', () => {
      expect(EncodedIndexNestedLoopIterator.getEncodedOnlySource(path('?s', 'p', '?o'))).toBe(wrapper);
      expect(EncodedIndexNestedLoopIterator.getEncodedOnlySource(path('?s', 'p', '?o', 'one', true))).toBe(wrapper);
    });

    it('should get no source for other operations', () => {
      expect(EncodedIndexNestedLoopIterator.getEncodedOnlySource(pattern('?s', 'p', '?o'))).toBeUndefined();
      expect(EncodedIndexNestedLoopIterator.getEncodedOnlySource(AF.createPath(
        t('?s'),
        AF.createZeroOrOnePath(AF.createLink(<RDF.NamedNode> t('p'))),
        t('?o'),
      ))).toBeUndefined();
      expect(EncodedIndexNestedLoopIterator.getEncodedOnlySource(AF.createPath(
        t('?s'),
        AF.createOneOrMorePath(AF.createSeq([
          AF.createLink(<RDF.NamedNode> t('p')),
          AF.createLink(<RDF.NamedNode> t('q')),
        ])),
        t('?o'),
      ))).toBeUndefined();
    });
  });

  describe('compile', () => {
    function compile(lookups: IIndexNestedLoopLookup[], inputVariables = variables('s'), options = OPTIONS) {
      return EncodedIndexNestedLoopIterator.compile(lookups, inputVariables, context, options);
    }

    it('should compile patterns, unions and paths', () => {
      expect(compile([
        lookup(pattern('?s', 'type', '?t')),
        lookup(union(pattern('?s', 'r1', '?o'), pattern('?s', 'r2', '?o'))),
        lookup(path('?o', 'p', '?z')),
      ])).toBeDefined();
    });

    it('should not compile in union default graph mode', () => {
      context = context.set(KeysQueryOperation.unionDefaultGraph, true);
      expect(compile([ lookup(pattern('?s', 'type', '?t')) ])).toBeUndefined();
    });

    it('should not compile without lookups or with too many', () => {
      expect(compile([])).toBeUndefined();
      expect(compile(Array.from({ length: 31 }, () => lookup(pattern('?s', 'type', '?t'))))).toBeUndefined();
    });

    it('should not compile with too many variables', () => {
      expect(compile(Array.from({ length: 16 }, (_, i) => lookup(pattern(`?a${i}`, 'type', `?b${i}`)))))
        .toBeUndefined();
    });

    it('should not compile optional lookups that are not last', () => {
      expect(compile([ lookup(pattern('?s', 'type', '?t'), true), lookup(pattern('?s', 'p', '?o')) ]))
        .toBeUndefined();
    });

    it('should not compile other operations', () => {
      expect(compile([ lookup(AF.createBgp([])) ])).toBeUndefined();
    });

    it('should not compile unions and paths if disabled', () => {
      const options = { unionsAndPaths: false, adaptive: true };
      expect(compile([ lookup(union(pattern('?s', 'r1', '?o'))) ], undefined, options)).toBeUndefined();
      expect(compile([ lookup(path('?s', 'p', '?o')) ], undefined, options)).toBeUndefined();
    });

    it('should not compile lookups over sources without encoded access', () => {
      wrapper = { source: new QuerySourceRdfJs(new Store(), DF, BF) };
      expect(compile([ lookup(pattern('?s', 'type', '?t')) ])).toBeUndefined();
    });

    it('should not compile lookups over different encodings', () => {
      const first = lookup(pattern('?s', 'type', '?t'));
      wrapper = { source: new QuerySourceRdfJs(RdfStore.createOrdered(), DF, BF) };
      expect(compile([ first, lookup(pattern('?s', 'p', '?o')) ])).toBeUndefined();
    });

    it('should not compile patterns with variable graphs or quoted triples', () => {
      expect(compile([ lookup(pattern('?s', 'type', '?t', wrapper, DF.variable('g'))) ])).toBeUndefined();
      expect(compile([ lookup(assignOperationSource(AF.createPattern(t('?s'), t('p'), quoted), wrapper)) ]))
        .toBeUndefined();
      expect(compile([ lookup(union(pattern('?s', 'type', '?t', wrapper, DF.variable('g')))) ])).toBeUndefined();
    });

    it('should not compile unions of which branches assign different variables', () => {
      expect(compile([ lookup(union(pattern('?s', 'r1', '?o'), pattern('?s', 'r2', '?z'))) ])).toBeUndefined();
      expect(compile([ lookup(union(pattern('?s', 'r1', '?o'), pattern('?s', '?x', '?o'))) ])).toBeUndefined();
    });

    it('should not compile unsupported paths', () => {
      expect(compile([ lookup(path('?s', 'p', '?o', 'zero', false, DF.variable('g'))) ])).toBeUndefined();
      expect(compile([ lookup(path('?x', 'p', '?x')) ], variables('x'))).toBeUndefined();
      expect(compile([ lookup(path('?a', 'p', '?b')) ])).toBeUndefined();
      expect(compile([ lookup(AF.createPath(quoted, AF.createZeroOrMorePath(assignOperationSource(AF
        .createLink(<RDF.NamedNode> t('p')), wrapper)), t('?o'))) ])).toBeUndefined();
      expect(compile([ lookup(AF.createPath(t('?o'), AF.createZeroOrMorePath(assignOperationSource(AF
        .createLink(<RDF.NamedNode> t('p')), wrapper)), quoted)) ], variables('o'))).toBeUndefined();
      expect(compile([ lookup(path('?s', 'p', '?o')) ], variables('?s'))).toBeUndefined();
    });

    it('should not compile lookups that the source can not prepare', () => {
      const access = wrapper.source.getEncodedAccess!(context)!;
      const source: IQuerySource = <any> {
        getEncodedAccess: () => ({
          encoding: access.encoding,
          encode: (term: RDF.Term) => access.encode(term),
          decode: (id: number) => access.decode(id),
          prepareLookup: () => undefined,
        }),
      };
      wrapper = { source };
      expect(compile([ lookup(pattern('?s', 'type', '?t')) ])).toBeUndefined();
      expect(compile([ lookup(path('?s', 'p', '?o')) ])).toBeUndefined();
    });
  });

  describe('with patterns', () => {
    it('should join input bindings with patterns', async() => {
      await expect(run(
        [ lookup(pattern('?s', 'type', '?t')), lookup(pattern('?s', 'p', '?o')) ],
        input({ s: 'a' }, { s: 'd' }, { s: 'zz' }, { s: '"lit"' }),
        variables('s'),
      )).resolves.toEqual([
        's=a t=T o=b'.split(' ').sort().join(' '),
        's=d t=T o=_:x'.split(' ').sort().join(' '),
      ].sort());
    });

    it('should do lookups with many matches after cheaper ones', async() => {
      const quads: RDF.Quad[] = [ DF.quad(t('hub'), t('type'), t('H')) ];
      for (let i = 0; i < 20; i++) {
        quads.push(DF.quad(t('hub'), t('p'), t(`n${i}`)));
      }
      store.addQuads(quads);
      await expect(run(
        [ lookup(pattern('?s', 'p', '?o')), lookup(pattern('?s', 'type', '?t')) ],
        input({ s: 'hub' }),
        variables('s'),
      )).resolves.toHaveLength(20);
      await expect(run(
        [ lookup(pattern('?s', 'p', '?o')), lookup(pattern('?s', 'p', '?z')) ],
        input({ s: 'hub' }),
        variables('s'),
      )).resolves.toHaveLength(400);
    });

    it('should do lookups in the given order', async() => {
      await expect(run(
        [ lookup(pattern('?s', 'p', '?o')), lookup(pattern('?o', 'type', '?t')) ],
        input({ s: 'c' }),
        variables('s'),
        { unionsAndPaths: true, adaptive: false },
      )).resolves.toEqual([ 'o=a s=c t=T', 'o=d s=c t=T' ]);
    });

    it('should not match constants that do not occur in the source', async() => {
      await expect(run([ lookup(pattern('?s', 'nope', '?o')) ], input({ s: 'a' }), variables('s')))
        .resolves.toEqual([]);
    });

    it('should match repeated variables', async() => {
      await expect(run([ lookup(pattern('?x', 'p', '?x')) ], input({}), [])).resolves.toEqual([ 'x=f' ]);
    });

    it('should bind input variables that are unbound in an input binding', async() => {
      await expect(run(
        [ lookup(pattern('?s', 'r1', '?o')) ],
        input({ s: 'a' }, { o: 'd' }),
        variables('?s', '?o'),
      )).resolves.toEqual([ 'o=d s=a', 'o=d s=a' ]);
    });

    it('should bind input variables that are unexpectedly unbound', async() => {
      await expect(run([ lookup(pattern('?s', 'r1', '?o')) ], input({}), variables('s'))).resolves
        .toEqual([ 'o=d s=a' ]);
    });

    it('should keep input bindings without matches of an optional lookup', async() => {
      await expect(run(
        [ lookup(pattern('?s', 'r1', '?o'), true) ],
        input({ s: 'a' }, { s: 'b' }, { s: 'zz' }),
        variables('s'),
      )).resolves.toEqual([ 'o=d s=a', 's=b', 's=zz' ]);
    });

    it('should scan the first join entry', async() => {
      await expect(run(
        [ lookup(pattern('?s', 'p', '?o')) ],
        [],
        [],
        OPTIONS,
        lookup(pattern('?s', 'type', 'T')),
      )).resolves.toEqual([ 'o=_:x s=d', 'o=b s=a', 'o=f s=f' ]);
    });

    it('should join input bindings that are not created by a bindings factory', async() => {
      const bindings = Object.assign(Object.create(BF.bindings([[ DF.variable('s'), t('a') ]])), { extend: undefined });
      await expect(run([ lookup(pattern('?s', 'r1', '?o')) ], [ bindings ], variables('s')))
        .resolves.toEqual([ 'o=d s=a' ]);
    });

    it('should produce nothing after ending', async() => {
      const plan = EncodedIndexNestedLoopIterator
        .compile([ lookup(pattern('?s', 'r1', '?o')) ], variables('s'), context, OPTIONS)!;
      const inputStream = new ArrayIterator(input({ s: 'a' }), { autoStart: false });
      const iterator = new EncodedIndexNestedLoopIterator(inputStream, plan, BF, DF);
      await expect(iterator.toArray()).resolves.toHaveLength(1);
      expect(iterator.read()).toBeNull();
    });

    it('should wait for input bindings', async() => {
      const plan = EncodedIndexNestedLoopIterator
        .compile([ lookup(pattern('?s', 'r1', '?o')) ], variables('s'), context, OPTIONS)!;
      const inputStream = new BufferedIterator<Bindings>();
      const iterator = new EncodedIndexNestedLoopIterator(inputStream, plan, BF, DF);
      expect(iterator.read()).toBeNull();
      (<any> inputStream)._push(input({ s: 'a' })[0]);
      inputStream.close();
      await expect(iterator.toArray()).resolves.toHaveLength(1);
    });

    it('should forward input errors and destroy the input when ending', async() => {
      const plan = EncodedIndexNestedLoopIterator
        .compile([ lookup(pattern('?s', 'r1', '?o')) ], variables('s'), context, OPTIONS)!;
      const inputStream = new BufferedIterator<Bindings>();
      const iterator = new EncodedIndexNestedLoopIterator(inputStream, plan, BF, DF);
      const error = new Promise(resolve => iterator.on('error', resolve));
      inputStream.emit('error', new Error('input'));
      await expect(error).resolves.toEqual(new Error('input'));
      expect(inputStream.destroyed).toBe(true);
    });
  });

  describe('with unions', () => {
    it('should join with all branches of a union', async() => {
      await expect(run(
        [ lookup(union(pattern('?s', 'r1', '?o'), pattern('?s', 'r2', '?o'))) ],
        input({ s: 'a' }, { s: 'b' }, { s: 'zz' }),
        variables('s'),
      )).resolves.toEqual([ 'o=a s=a', 'o=d s=a', 'o=e s=b' ]);
    });

    it('should skip branches with constants that do not occur in the source', async() => {
      await expect(run(
        [ lookup(union(pattern('?s', 'nope', '?o'), pattern('?s', 'r2', '?o'))) ],
        input({ s: 'a' }),
        variables('s'),
      )).resolves.toEqual([ 'o=a s=a' ]);
    });

    it('should match repeated variables in branches', async() => {
      await expect(run(
        [ lookup(union(pattern('?x', 'r2', '?x'), pattern('?x', 'p', '?x'))) ],
        input({}),
        [],
      )).resolves.toEqual([ 'x=a', 'x=f' ]);
    });

    it('should stop counting unions that are not cheaper', async() => {
      addHub();
      await expect(run(
        [ lookup(pattern('?s', 'p', '?o')), lookup(union(pattern('?s', 'p', '?z'), pattern('?s', 'r2', '?z'))) ],
        input({ s: 'hub' }),
        variables('s'),
      )).resolves.toHaveLength(420);
    });

    it('should pick cheaper unions first', async() => {
      await expect(run(
        [ lookup(pattern('?s', 'p', '?o')), lookup(union(pattern('?s', 'r1', '?z'), pattern('?s', 'r2', '?z'))) ],
        input({ s: 'a' }, { s: 'c' }),
        variables('s'),
      )).resolves.toEqual([ 'o=b s=a z=a', 'o=b s=a z=d' ]);
    });
  });

  describe('with closures', () => {
    it('should walk zero or more steps from a bound subject', async() => {
      await expect(run([ lookup(path('?s', 'p', '?o')) ], input({ s: 'a' }), variables('s'))).resolves
        .toEqual([ 'o=_:x s=a', 'o=a s=a', 'o=b s=a', 'o=c s=a', 'o=d s=a', 'o=e s=a' ]);
    });

    it('should walk one or more steps from a bound subject', async() => {
      await expect(run([ lookup(path('?s', 'p', '?o', 'one')) ], input({ s: 'd' }), variables('s'))).resolves
        .toEqual([ 'o=_:x s=d', 'o=e s=d' ]);
    });

    it('should walk backwards from a bound object', async() => {
      await expect(run([ lookup(path('?s', 'p', '?o', 'one')) ], input({ o: 'b' }), variables('o'))).resolves
        .toEqual([ 'o=b s=a', 'o=b s=b', 'o=b s=c' ]);
    });

    it('should walk inverse predicates', async() => {
      await expect(run([ lookup(path('?s', 'p', '?o', 'one', true)) ], input({ s: 'b' }), variables('s'))).resolves
        .toEqual([ 'o=a s=b', 'o=b s=b', 'o=c s=b' ]);
      await expect(run([ lookup(path('?s', 'p', '?o', 'zero', true)) ], input({ o: 'e' }), variables('o'))).resolves
        .toEqual([ 'o=e s=e' ]);
    });

    it('should check if a bound object is reached', async() => {
      await expect(run(
        [ lookup(path('?s', 'p', '?o', 'one')) ],
        input({ s: 'a', o: 'e' }, { s: 'e', o: 'a' }, { s: 'f', o: 'f' }),
        variables('s', 'o'),
      )).resolves.toEqual([ 'o=e s=a', 'o=f s=f' ]);
      await expect(run(
        [ lookup(path('?s', 'p', '?o')) ],
        input({ s: 'e', o: 'e' }, { s: 'zz', o: 'zz' }, { s: 'zz', o: 'yy' }),
        variables('s', 'o'),
      )).resolves.toEqual([ 'o=e s=e' ]);
    });

    it('should match terms that do not occur in the source with zero steps from constants', async() => {
      await expect(run([ lookup(path('zz', 'p', '?o')) ], input({}), [])).resolves.toEqual([ 'o=zz' ]);
      await expect(run([ lookup(path('zz', 'p', '?o', 'one')) ], input({}), [])).resolves.toEqual([]);
      await expect(run([ lookup(path('?s', 'p', 'zz')) ], input({ s: 'zz' }, { s: 'a' }), variables('s')))
        .resolves.toEqual([ 's=zz' ]);
    });

    it('should only match nodes of the graph with zero steps between variables', async() => {
      await expect(run(
        [ lookup(path('?s', 'p', '?o')) ],
        input({ s: 'zz' }, { s: 'p' }, { s: '"lit"' }),
        variables('s'),
      )).resolves.toEqual([ 'o="lit" s="lit"' ]);
    });

    it('should not step along predicates or in graphs that do not occur in the source', async() => {
      await expect(run([ lookup(path('?s', 'nope', '?o')) ], input({ s: 'a' }), variables('s')))
        .resolves.toEqual([ 'o=a s=a' ]);
      await expect(run([ lookup(path('?s', 'p', '?o', 'zero', false, t('g2'))) ], input({ s: 'a' }), variables('s')))
        .resolves.toEqual([]);
      await expect(run([ lookup(path('a', 'p', '?o', 'zero', false, t('g2'))) ], input({}), []))
        .resolves.toEqual([ 'o=a' ]);
    });

    it('should walk through quoted triples', async() => {
      await expect(run([ lookup(path('?s', 'p', '?o', 'one')) ], input({ s: 'g' }), variables('s'))).resolves
        .toEqual([ 'o=<<a p b>> s=g', 'o=h s=g' ]);
      store.addQuad(DF.quad(t('h'), t('p'), quoted));
      await expect(run([ lookup(path('?s', 'p', '?o', 'one')) ], input({ s: 'g' }), variables('s'))).resolves
        .toEqual([ 'o=<<a p b>> s=g', 'o=h s=g' ]);
    });

    it('should not walk from starts that are unexpectedly unbound', async() => {
      await expect(run([ lookup(path('?s', 'p', '?o')) ], input({}), variables('s'))).resolves.toEqual([]);
      await expect(run(
        [ lookup(path('?s', 'p', '?o')), lookup(pattern('?s', 'type', '?t')) ],
        input({}),
        variables('s'),
        { unionsAndPaths: true, adaptive: false },
      )).resolves.toEqual([]);
    });

    it('should bind ends that are unexpectedly unbound', async() => {
      await expect(run([ lookup(path('d', 'p', '?o')) ], input({}), variables('o'))).resolves
        .toEqual([ 'o=_:x', 'o=d', 'o=e' ]);
    });

    it('should walk large graphs', async() => {
      const quads: RDF.Quad[] = [];
      for (let i = 0; i < 1500; i++) {
        quads.push(DF.quad(t('hub'), t('p'), t(`n${i}`)));
        quads.push(DF.quad(t(`n${i}`), t('p'), t(`m${i}`)));
      }
      store.addQuads(quads);
      await expect(run([ lookup(path('?s', 'p', '?o', 'one')) ], input({ s: 'hub' }), variables('s')))
        .resolves.toHaveLength(3000);
    });

    it('should estimate closures to pick cheaper lookups first', async() => {
      await expect(run(
        [ lookup(path('?s', 'p', '?o')), lookup(pattern('?s', 'type', '?t')), lookup(pattern('?o', 'q', '?l')) ],
        input({ s: 'a' }, { s: 'zz' }),
        variables('s'),
      )).resolves.toEqual([ 'l="lit" o=e s=a t=T' ]);
      await expect(run(
        [ lookup(path('?s', 'nope', '?o')), lookup(pattern('?s', 'type', '?t')) ],
        input({ s: 'a' }),
        variables('s'),
      )).resolves.toEqual([ 'o=a s=a t=T' ]);
      addHub();
      await expect(run(
        [ lookup(pattern('?s', 'p', '?z')), lookup(path('?s', 'p', '?o')) ],
        input({ s: 'hub', o: 'n3' }),
        variables('s', 'o'),
      )).resolves.toHaveLength(20);
    });

    it('should pick cheaper lookups first when the given first one is not possible', async() => {
      await expect(run(
        [ lookup(path('?s', 'p', '?o', 'one')), lookup(pattern('?s', 'type', 'U')) ],
        input({}),
        variables('s'),
      )).resolves.toEqual([ 'o=e s=e' ].slice(0, 0));
      await expect(run(
        [ lookup(path('?s', 'p', '?o')), lookup(pattern('?s', 'type', 'U')) ],
        input({}),
        variables('s'),
      )).resolves.toEqual([ 'o=e s=e' ]);
    });

    it('should estimate closures from constants', async() => {
      addHub();
      await expect(run(
        [ lookup(pattern('?x', 'p', '?o')), lookup(path('d', 'p', '?z', 'one')) ],
        input({ x: 'hub' }),
        variables('x'),
      )).resolves.toHaveLength(40);
    });

    it('should estimate closures from local terms and along predicates that do not occur', async() => {
      addHub();
      await expect(run(
        [ lookup(pattern('?x', 'p', '?o')), lookup(path('?s', 'p', '?z')) ],
        input({ x: 'hub', s: 'zz' }),
        variables('x', 's'),
      )).resolves.toEqual([]);
      await expect(run(
        [ lookup(pattern('?x', 'p', '?o')), lookup(path('?s', 'nope', '?z')) ],
        input({ x: 'hub', s: 'a' }),
        variables('x', 's'),
      )).resolves.toHaveLength(20);
    });

    it('should estimate patterns that can not match', async() => {
      addHub();
      await expect(run(
        [ lookup(pattern('?s', 'p', '?o')), lookup(pattern('?s', 'nope', '?x')) ],
        input({ s: 'hub' }),
        variables('s'),
      )).resolves.toEqual([]);
    });

    it('should look up unions and paths with a source context', async() => {
      wrapper = { source: wrapper.source, context: new ActionContext({}) };
      await expect(run(
        [ lookup(union(pattern('?s', 'r1', '?o'), pattern('?s', 'r2', '?o'))) ],
        input({ s: 'a' }),
        variables('s'),
      )).resolves.toEqual([ 'o=a s=a', 'o=d s=a' ]);
    });

    it('should skip lookups that are not possible yet when picking cheaper ones', async() => {
      addHub();
      await expect(run(
        [ lookup(pattern('?s', 'p', '?t')), lookup(path('?t', 'p', '?z')), lookup(pattern('?s', 'type', '?x')) ],
        input({ s: 'hub' }),
        variables('s'),
      )).resolves.toHaveLength(20);
    });
  });
});
