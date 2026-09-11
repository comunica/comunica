import { Readable } from 'node:stream';
import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { BindingsStream, IActionContext } from '@comunica/types';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
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

describe('ActorQuerySourceIdentifyHypermediaNone', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorQuerySourceIdentifyHypermediaNone instance', () => {
    let actor: ActorQuerySourceIdentifyHypermediaNone;
    let context: IActionContext;

    beforeEach(() => {
      actor = new ActorQuerySourceIdentifyHypermediaNone({ name: 'actor', bus, mediatorMergeBindingsContext });
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

      describe('with dereferenceFromNamedConflictMode set to "error"', () => {
        beforeEach(() => {
          context = context.set(KeysQueryOperation.dereferenceFromNamedConflictMode, 'error');
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

      describe('with dereferenceFromNamedConflictMode set to "overwrite"', () => {
        beforeEach(() => {
          context = context.set(KeysQueryOperation.dereferenceFromNamedConflictMode, 'overwrite');
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

      describe('with dereferenceFromNamedConflictMode set to "merge"', () => {
        beforeEach(() => {
          context = context.set(KeysQueryOperation.dereferenceFromNamedConflictMode, 'merge');
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
    });
  });
});
