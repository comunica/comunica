import { Readable } from 'node:stream';
import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { BindingsStream, DereferenceFromNamedConflictMode, IActionContext } from '@comunica/types';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import { streamifyArray } from 'streamify-array';
import {
  ActorQuerySourceIdentifyHypermediaNone,
} from '../lib/ActorQuerySourceIdentifyHypermediaNone';
import '@comunica/utils-jest';

const quad = require('rdf-quad');

const DF = new DataFactory();
const AF = new AlgebraFactory();
const BF = new BindingsFactory(DF);
const v1 = DF.variable('v1');
const v2 = DF.variable('v2');
const v3 = DF.variable('v3');

const mediatorMergeBindingsContext: any = {
  mediate: () => ({}),
};

const mediatorTermComparatorFactory: any = {
  mediate: () => ({
    orderTypes: (termA: any, termB: any) => {
      if (termA.value === termB.value) {
        return 0;
      }
      return termA.value < termB.value ? -1 : 1;
    },
  }),
};

describe('ActorQuerySourceIdentifyHypermediaNone', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorQuerySourceIdentifyHypermediaNone instance', () => {
    let actor: ActorQuerySourceIdentifyHypermediaNone;
    let context: IActionContext;

    beforeEach(() => {
      actor = new ActorQuerySourceIdentifyHypermediaNone({
        name: 'actor',
        bus,
        mediatorMergeBindingsContext,
        mediatorTermComparatorFactory,
      });
      context = new ActionContext({ [KeysInitQuery.dataFactory.name]: DF });
    });

    it('should test', async() => {
      await expect(actor.test({ metadata: <any> null, quads: <any> null, url: '', context }))
        .resolves.toPassTest({ filterFactor: 0 });
    });

    it('should run', async() => {
      const quads = streamifyArray([
        quad('s1', 'p1', 'o1'),
        quad('s2', 'p2', 'o2'),
      ]);
      const { source } = await actor.run({ metadata: <any> null, quads, url: 'URL', context });
      expect(source.queryBindings).toBeTruthy();
      expect(source.toString()).toBe(`QuerySourceRdfJs(URL)`);
      const stream: BindingsStream = source.queryBindings(AF.createPattern(v1, v2, v3), new ActionContext());
      await expect(new Promise((resolve, reject) => {
        stream.getProperty('metadata', resolve);
        stream.on('error', reject);
      })).resolves.toEqual({
        state: expect.any(MetadataValidationState),
        cardinality: { type: 'exact', value: 2 },
        availableOrders: undefined,
        order: undefined,
        variables: [
          { variable: v1, canBeUndef: false },
          { variable: v2, canBeUndef: false },
          { variable: v3, canBeUndef: false },
        ],
        requestTime: 0,
      });
      await expect(stream).toEqualBindingsStream([
        BF.fromRecord({
          v1: DF.namedNode('s1'),
          v2: DF.namedNode('p1'),
          v3: DF.namedNode('o1'),
        }),
        BF.fromRecord({
          v1: DF.namedNode('s2'),
          v2: DF.namedNode('p2'),
          v3: DF.namedNode('o2'),
        }),
      ]);
    });

    it('should run with common variables', async() => {
      const quads = streamifyArray([
        quad('s1', 'p1', 'o1'),
        quad('s2', 'p2', 's2'),
      ]);
      const { source } = await actor.run({ metadata: <any> null, quads, url: '', context });
      expect(source.queryBindings).toBeTruthy();
      const stream: BindingsStream = source.queryBindings(AF.createPattern(v1, v2, v1), new ActionContext());
      await expect(new Promise((resolve, reject) => {
        stream.getProperty('metadata', resolve);
        stream.on('error', reject);
      })).resolves.toEqual({
        state: expect.any(MetadataValidationState),
        cardinality: { type: 'estimate', value: 2 },
        availableOrders: undefined,
        order: undefined,
        variables: [
          { variable: v1, canBeUndef: false },
          { variable: v2, canBeUndef: false },
        ],
        requestTime: 0,
      });
      await expect(stream).toEqualBindingsStream([
        BF.fromRecord({
          v1: DF.namedNode('s2'),
          v2: DF.namedNode('p2'),
        }),
      ]);
    });

    it('selects the index set to build from COMUNICA_STORE_INDEXES', () => {
      const join = (): string => ActorQuerySourceIdentifyHypermediaNone.indexCombinations()
        .map(order => order.map((component: string) => component[0]).join('')).join(' ');
      try {
        process.env.COMUNICA_STORE_INDEXES = '3';
        expect(join()).toBe('gspo gpos gosp');
        process.env.COMUNICA_STORE_INDEXES = '4gpos';
        expect(join()).toBe('gspo gpos gosp gpso');
        delete process.env.COMUNICA_STORE_INDEXES;
        expect(join()).toBe('gspo gpso gosp gpos');
      } finally {
        delete process.env.COMUNICA_STORE_INDEXES;
      }
    });

    it('should order the store with COMUNICA_SORTED_STORE, using the SPARQL comparator', async() => {
      process.env.COMUNICA_SORTED_STORE = '1';
      try {
        const quads = streamifyArray([
          quad('s2', 'p1', 'o1'),
          quad('s1', 'p1', 'o2'),
        ]);
        const { source } = await actor.run({ metadata: <any> null, quads, url: '', context });
        const store: any = (<any> source).source;

        // Four indexes, so that a bound-predicate scan is answered by one that walks subjects.
        expect(store.indexesWrapped.map((index: any) => index.componentOrder.join(',')))
          .toEqual([
            'graph,subject,predicate,object',
            'graph,predicate,subject,object',
            'graph,object,subject,predicate',
            'graph,predicate,object,subject',
          ]);

        // And that scan comes back in subject order, rather than in insertion order.
        const bindings = await source.queryBindings(
          AF.createPattern(DF.variable('s'), DF.namedNode('p1'), DF.variable('o')),
          new ActionContext(),
        ).toArray();
        expect(bindings.map(b => b.get(DF.variable('s'))!.value)).toEqual([ 's1', 's2' ]);
      } finally {
        delete process.env.COMUNICA_SORTED_STORE;
      }
    });

    it('says so when asked to order its store without a term comparator', async() => {
      process.env.COMUNICA_SORTED_STORE = '1';
      try {
        const unconfigured = new ActorQuerySourceIdentifyHypermediaNone({
          name: 'actor',
          bus,
          mediatorMergeBindingsContext,
        });
        const quads = streamifyArray([ quad('s1', 'p1', 'o1') ]);
        await expect(unconfigured.run({ metadata: <any> null, quads, url: '', context })).rejects
          .toThrow('actor can only order its store when a term comparator mediator is configured');
      } finally {
        delete process.env.COMUNICA_SORTED_STORE;
      }
    });

    it('releases the ranking tables with COMUNICA_STORE_SORT=drop', async() => {
      process.env.COMUNICA_SORTED_STORE = '1';
      process.env.COMUNICA_STORE_SORT = 'drop';
      try {
        const quads = streamifyArray([ quad('s2', 'p1', 'o1'), quad('s1', 'p1', 'o2') ]);
        const { source } = await actor.run({ metadata: <any> null, quads, url: '', context });
        const store: any = (<any> source).source;
        // The indexes stay in the order they were put into, without the tables that only skipping needs.
        for (const field of [ 'sortedEncodings', 'sortedDecoded', 'termRank' ]) {
          expect(store[field]).toBeUndefined();
        }
        const bindings = await source.queryBindings(
          AF.createPattern(DF.variable('s'), DF.namedNode('p1'), DF.variable('o')),
          new ActionContext(),
        ).toArray();
        expect(bindings.map(b => b.get(DF.variable('s'))!.value)).toEqual([ 's1', 's2' ]);
      } finally {
        delete process.env.COMUNICA_SORTED_STORE;
        delete process.env.COMUNICA_STORE_SORT;
      }
    });

    it('should run and delegate error events', async() => {
      const quads = streamifyArray([
        quad('s1', 'p1', 'o1'),
        quad('s2', 'p2', 'o2'),
      ]);
      // eslint-disable-next-line no-async-promise-executor,ts/no-misused-promises
      await expect(new Promise(async(resolve, reject) => {
        const { source } = await actor.run({ metadata: <any> null, quads, url: '', context });
        (<any> source).source.matchBindings = () => {
          const str = new Readable();
          str._read = () => {
            str.emit('error', new Error('Dummy error'));
          };
          return str;
        };
        const stream = source.queryBindings(AF.createPattern(v1, v2, v3), new ActionContext());
        stream.on('error', resolve);
        stream.on('data', () => {
          // Do nothing
        });
        stream.on('end', () => reject(new Error('Got no error event.')));
      })).resolves.toEqual(new Error('Dummy error'));
    });

    describe('with a sourceAsNamedGraph-tagged context', () => {
      const namedGraph = DF.namedNode('http://example.org/g');

      beforeEach(() => {
        context = context.set(KeysQueryOperation.sourceAsNamedGraph, namedGraph);
      });

      it('should rewrite default-graph quads to the tagged named graph', async() => {
        const quads = streamifyArray([
          quad('s1', 'p1', 'o1'),
          quad('s2', 'p2', 'o2'),
        ]);
        const { source } = await actor.run({ metadata: <any> null, quads, url: 'URL', context });

        // Hidden from plain (default graph) patterns.
        await expect(source.queryBindings(AF.createPattern(v1, v2, v3), new ActionContext()))
          .toEqualBindingsStream([]);

        // Visible through GRAPH <namedGraph> { ... }.
        await expect(source.queryBindings(AF.createPattern(v1, v2, v3, namedGraph), new ActionContext()))
          .toEqualBindingsStream([
            BF.fromRecord({ v1: DF.namedNode('s1'), v2: DF.namedNode('p1'), v3: DF.namedNode('o1') }),
            BF.fromRecord({ v1: DF.namedNode('s2'), v2: DF.namedNode('p2'), v3: DF.namedNode('o2') }),
          ]);
      });

      it('should reject when the source already contains a named graph (default conflict mode)', async() => {
        const quads = streamifyArray([
          quad('s1', 'p1', 'o1'),
          quad('s2', 'p2', 'o2', 'http://example.org/existing-graph'),
        ]);
        await expect(actor.run({ metadata: <any> null, quads, url: 'URL', context }))
          .rejects.toThrow(/existing named graph 'http:\/\/example\.org\/existing-graph'/u);
      });

      describe('with dereferenceFromNamedConflictMode resolving to "error"', () => {
        beforeEach(() => {
          context = context.set(KeysInitQuery.dereferenceFromNamedConflictMode, () => 'error');
        });

        it('should reject when the source already contains a named graph', async() => {
          const quads = streamifyArray([
            quad('s1', 'p1', 'o1'),
            quad('s2', 'p2', 'o2', 'http://example.org/existing-graph'),
          ]);
          await expect(actor.run({ metadata: <any> null, quads, url: 'URL', context }))
            .rejects.toThrow(/existing named graph 'http:\/\/example\.org\/existing-graph'/u);
        });
      });

      describe('with dereferenceFromNamedConflictMode resolving to "preferNamed"', () => {
        beforeEach(() => {
          context = context.set(KeysInitQuery.dereferenceFromNamedConflictMode, () => 'preferNamed');
        });

        it('should rewrite an existing named graph to the tagged named graph too', async() => {
          const existingGraph = DF.namedNode('http://example.org/existing-graph');
          const quads = streamifyArray([
            quad('s1', 'p1', 'o1'),
            quad('s2', 'p2', 'o2', existingGraph.value),
          ]);
          const { source } = await actor.run({ metadata: <any> null, quads, url: 'URL', context });

          // Both quads now live under the tagged named graph.
          await expect(source.queryBindings(AF.createPattern(v1, v2, v3, namedGraph), new ActionContext()))
            .toEqualBindingsStream([
              BF.fromRecord({ v1: DF.namedNode('s1'), v2: DF.namedNode('p1'), v3: DF.namedNode('o1') }),
              BF.fromRecord({ v1: DF.namedNode('s2'), v2: DF.namedNode('p2'), v3: DF.namedNode('o2') }),
            ]);

          // Nothing is left under the original named graph.
          await expect(source.queryBindings(AF.createPattern(v1, v2, v3, existingGraph), new ActionContext()))
            .toEqualBindingsStream([]);
        });
      });

      describe('with dereferenceFromNamedConflictMode resolving to "keepSource"', () => {
        beforeEach(() => {
          context = context.set(KeysInitQuery.dereferenceFromNamedConflictMode, () => 'keepSource');
        });

        it('should rewrite default-graph quads but leave an existing named graph untouched', async() => {
          const existingGraph = DF.namedNode('http://example.org/existing-graph');
          const quads = streamifyArray([
            quad('s1', 'p1', 'o1'),
            quad('s2', 'p2', 'o2', existingGraph.value),
          ]);
          const { source } = await actor.run({ metadata: <any> null, quads, url: 'URL', context });

          // The default-graph quad moved to the tagged named graph.
          await expect(source.queryBindings(AF.createPattern(v1, v2, v3, namedGraph), new ActionContext()))
            .toEqualBindingsStream([
              BF.fromRecord({ v1: DF.namedNode('s1'), v2: DF.namedNode('p1'), v3: DF.namedNode('o1') }),
            ]);

          // The already-named-graph quad stayed under its own, original graph.
          await expect(source.queryBindings(AF.createPattern(v1, v2, v3, existingGraph), new ActionContext()))
            .toEqualBindingsStream([
              BF.fromRecord({ v1: DF.namedNode('s2'), v2: DF.namedNode('p2'), v3: DF.namedNode('o2') }),
            ]);
        });
      });

      describe('with a resolver that differentiates per quad', () => {
        it('should apply a different conflict mode to each existing named graph', async() => {
          const graphA = DF.namedNode('http://example.org/graph-a');
          const graphB = DF.namedNode('http://example.org/graph-b');
          const resolveConflictMode = jest.fn(
            (quad: RDF.Quad): DereferenceFromNamedConflictMode =>
              quad.graph.equals(graphA) ? 'keepSource' : 'preferNamed',
          );
          context = context.set(KeysInitQuery.dereferenceFromNamedConflictMode, resolveConflictMode);

          const quads = streamifyArray([
            quad('s1', 'p1', 'o1', graphA.value),
            quad('s2', 'p2', 'o2', graphA.value),
            quad('s3', 'p3', 'o3', graphB.value),
            quad('s4', 'p4', 'o4', graphB.value),
          ]);
          const { source } = await actor.run({ metadata: <any> null, quads, url: 'URL', context });

          // GraphA's quads stay under their own graph.
          await expect(source.queryBindings(AF.createPattern(v1, v2, v3, graphA), new ActionContext()))
            .toEqualBindingsStream([
              BF.fromRecord({ v1: DF.namedNode('s1'), v2: DF.namedNode('p1'), v3: DF.namedNode('o1') }),
              BF.fromRecord({ v1: DF.namedNode('s2'), v2: DF.namedNode('p2'), v3: DF.namedNode('o2') }),
            ]);

          // GraphB's quads are rewritten into the tagged named graph instead.
          await expect(source.queryBindings(AF.createPattern(v1, v2, v3, namedGraph), new ActionContext()))
            .toEqualBindingsStream([
              BF.fromRecord({ v1: DF.namedNode('s3'), v2: DF.namedNode('p3'), v3: DF.namedNode('o3') }),
              BF.fromRecord({ v1: DF.namedNode('s4'), v2: DF.namedNode('p4'), v3: DF.namedNode('o4') }),
            ]);

          // GraphB no longer exists on its own.
          await expect(source.queryBindings(AF.createPattern(v1, v2, v3, graphB), new ActionContext()))
            .toEqualBindingsStream([]);

          // The resolver is invoked for every quad that has a named graph of its own.
          expect(resolveConflictMode).toHaveBeenCalledTimes(4);
        });
      });
    });
  });
});
