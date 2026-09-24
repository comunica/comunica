import type { ActorHttpInvalidateListenable } from '@comunica/bus-http-invalidate';
import type { MediatorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import type { IActionQuerySourceIdentify, MediatorQuerySourceIdentify } from '@comunica/bus-query-source-identify';
import { KeysDereference, KeysInitQuery, KeysQueryOperation, KeysStatistics }
  from '@comunica/context-entries';
import type { IAction } from '@comunica/core';
import { ActionContext, ActionContextKey, Bus } from '@comunica/core';
import { StatisticLinkDereference } from '@comunica/statistic-link-dereference';
import type { IActionContext, IQuerySourceWrapper } from '@comunica/types';
import type { Algebra } from '@comunica/utils-algebra';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { DataFactory } from 'rdf-data-factory';
import { RdfStore } from 'rdf-stores';
import { ActorOptimizeQueryOperationQuerySourceIdentify } from '../lib/ActorOptimizeQueryOperationQuerySourceIdentify';
import '@comunica/utils-jest';

const AF = new AlgebraFactory();
const DF = new DataFactory();

// The source context that SERVICE targets are identified with by default
const serviceContextBlocked = new ActionContext().set(KeysDereference.blockFileAccess, true);

describe('ActorOptimizeQueryOperationQuerySourceIdentify', () => {
  let bus: any;
  let mediatorContextPreprocess: MediatorOptimizeQueryOperation;
  let contextIn: IActionContext;
  let operation: Algebra.Operation;
  let operationService: Algebra.Operation;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorContextPreprocess = <any> {
      async mediate(action: IAction) {
        return { context: action.context.set(new ActionContextKey('processed'), true) };
      },
    };
    operation = <any> {};
    operationService = AF.createJoin([
      AF.createService(<any> {}, DF.namedNode('source1')),
      AF.createService(<any> {}, DF.namedNode('source2')),
      AF.createService(<any> {}, DF.variable('source3')),
    ]);
  });

  describe('An ActorOptimizeQueryOperationQuerySourceIdentify instance', () => {
    let actor: ActorOptimizeQueryOperationQuerySourceIdentify;
    let mediatorQuerySourceIdentify: MediatorQuerySourceIdentify;
    let httpInvalidator: ActorHttpInvalidateListenable;
    let listener: any = null;

    beforeEach(() => {
      mediatorQuerySourceIdentify = <any> {
        mediate: jest.fn(async(action: IActionQuerySourceIdentify) => {
          if (action.querySourceUnidentified.value === 'sourceSparql') {
            return { querySource: <any> {
              ofUnidentified: action.querySourceUnidentified,
              source: {
                getSelectorShape() {
                  return {
                    type: 'operation',
                    operation: { operationType: 'wildcard' },
                    joinBindings: true,
                  };
                },
              },
            }};
          }
          return { querySource: <any> { ofUnidentified: action.querySourceUnidentified }};
        }),
      };
      httpInvalidator = <any>{
        addInvalidateListener: (l: any) => listener = l,
      };
      actor = new ActorOptimizeQueryOperationQuerySourceIdentify({
        name: 'actor',
        bus,
        serviceForceSparqlEndpoint: false,
        cacheSize: 10,
        httpInvalidator,
        mediatorQuerySourceIdentify,
        mediatorContextPreprocess,
      });
    });

    it('should test', async() => {
      await expect(actor.test({ context: new ActionContext(), operation })).resolves.toPassTestVoid();
    });

    describe('run', () => {
      beforeEach(() => {
        contextIn = new ActionContext({});
      });
      it('with an empty context', async() => {
        const { context: contextOut } = await actor.run({ context: contextIn, operation });
        expect(contextOut).toBe(contextIn);
      });

      it('with zero unidentified sources', async() => {
        contextIn = contextIn.set(KeysInitQuery.querySourcesUnidentified, []);
        const { context: contextOut } = await actor.run({ context: contextIn, operation });
        expect(contextOut).not.toBe(contextIn);
        expect(contextOut.get(KeysQueryOperation.querySources)).toEqual([]);
      });

      it('with three unidentified sources', async() => {
        const source3 = RdfStore.createDefault();
        contextIn = contextIn.set(KeysInitQuery.querySourcesUnidentified, [
          'source1',
          { value: 'source2' },
          source3,
        ]);
        const { context: contextOut } = await actor.run({ context: contextIn, operation });
        expect(contextOut).not.toBe(contextIn);
        expect(contextOut.get(KeysQueryOperation.querySources)).toEqual([
          { ofUnidentified: expect.objectContaining({ value: 'source1' }) },
          { ofUnidentified: expect.objectContaining({ value: 'source2' }) },
          { ofUnidentified: expect.objectContaining({ value: source3 }) },
        ]);
      });

      it('with SERVICE clauses', async() => {
        const { context: contextOut } = await actor.run({ context: contextIn, operation: operationService });
        expect(contextOut).not.toBe(contextIn);
        expect(contextOut.get(KeysQueryOperation.serviceSources)).toEqual({
          source1: { ofUnidentified: expect.objectContaining({ value: 'source1' }) },
          source2: { ofUnidentified: expect.objectContaining({ value: 'source2' }) },
        });
        expect(mediatorQuerySourceIdentify.mediate).toHaveBeenCalledTimes(2);
        expect(mediatorQuerySourceIdentify.mediate).toHaveBeenCalledWith({
          querySourceUnidentified: { value: 'source1', context: serviceContextBlocked },
          context: expect.anything(),
        });
        expect(mediatorQuerySourceIdentify.mediate).toHaveBeenCalledWith({
          querySourceUnidentified: { value: 'source2', context: serviceContextBlocked },
          context: expect.anything(),
        });
      });

      it('with SERVICE clauses and allowed file targets', async() => {
        contextIn = contextIn.set(KeysInitQuery.serviceAllowFileTargets, true);
        await actor.run({ context: contextIn, operation: operationService });
        expect(mediatorQuerySourceIdentify.mediate).toHaveBeenCalledTimes(2);
        expect(mediatorQuerySourceIdentify.mediate).toHaveBeenCalledWith({
          querySourceUnidentified: { value: 'source1', context: undefined },
          context: expect.anything(),
        });
        expect(mediatorQuerySourceIdentify.mediate).toHaveBeenCalledWith({
          querySourceUnidentified: { value: 'source2', context: undefined },
          context: expect.anything(),
        });
      });

      it('should not reuse cache entries of SERVICE targets for regular sources', async() => {
        const { context: contextOutService } = await actor.run({
          context: contextIn,
          operation: operationService,
        });
        const { context: contextOutSource } = await actor.run({
          context: contextIn.set(KeysInitQuery.querySourcesUnidentified, [ 'source1' ]),
          operation,
        });
        expect(contextOutService.get<Record<string, IQuerySourceWrapper>>(KeysQueryOperation.serviceSources)!.source1)
          .not.toBe(contextOutSource.get<IQuerySourceWrapper[]>(KeysQueryOperation.querySources)![0]);
      });

      it('should allow cache invalidation of SERVICE targets for a specific url', async() => {
        const { context: contextOut1 } = await actor.run({ context: contextIn, operation: operationService });

        listener({ url: 'source1' });

        const { context: contextOut2 } = await actor.run({ context: contextIn, operation: operationService });

        const services1 = contextOut1.get<Record<string, IQuerySourceWrapper>>(KeysQueryOperation.serviceSources)!;
        const services2 = contextOut2.get<Record<string, IQuerySourceWrapper>>(KeysQueryOperation.serviceSources)!;
        expect(services1.source1).not.toBe(services2.source1);
        expect(services1.source2).toBe(services2.source2);
      });

      it('with SERVICE clauses but the single source accepts the full query', async() => {
        contextIn = contextIn.set(KeysInitQuery.querySourcesUnidentified, [
          'sourceSparql',
        ]);
        const { context: contextOut } = await actor.run({ context: contextIn, operation: operationService });
        expect(contextOut).not.toBe(contextIn);
        expect(contextOut.has(KeysQueryOperation.serviceSources)).toBeFalsy();
        expect(contextOut.get(KeysQueryOperation.querySources)).toEqual([
          { ofUnidentified: expect.objectContaining({ value: 'sourceSparql' }), source: expect.anything() },
        ]);
      });

      it('with SERVICE clauses and multiple sources', async() => {
        const source3 = RdfStore.createDefault();
        contextIn = contextIn.set(KeysInitQuery.querySourcesUnidentified, [
          'source1',
          { value: 'source2' },
          source3,
        ]);
        const { context: contextOut } = await actor.run({ context: contextIn, operation: operationService });
        expect(contextOut).not.toBe(contextIn);
        expect(contextOut.get(KeysQueryOperation.serviceSources)).toEqual({
          source1: { ofUnidentified: expect.objectContaining({ value: 'source1' }) },
          source2: { ofUnidentified: expect.objectContaining({ value: 'source2' }) },
        });
        expect(contextOut.get(KeysQueryOperation.querySources)).toEqual([
          { ofUnidentified: expect.objectContaining({ value: 'source1' }) },
          { ofUnidentified: expect.objectContaining({ value: 'source2' }) },
          { ofUnidentified: expect.objectContaining({ value: source3 }) },
        ]);
      });

      it('should cache 2 identical sources in one call', async() => {
        const source1 = 'source1';
        contextIn = contextIn.set(KeysInitQuery.querySourcesUnidentified, [
          source1,
          source1,
        ]);
        const { context: contextOut } = await actor.run({ context: contextIn, operation });
        expect(contextOut).not.toBe(contextIn);
        expect(contextOut.get(KeysQueryOperation.querySources)).toEqual([
          { ofUnidentified: { value: 'source1' }},
          { ofUnidentified: { value: 'source1' }},
        ]);
        expect(contextOut.get<IQuerySourceWrapper[]>(KeysQueryOperation.querySources)![0])
          .toBe(contextOut.get<IQuerySourceWrapper[]>(KeysQueryOperation.querySources)![1]);
      });

      it('should cache identical sources in separate calls', async() => {
        const source1 = 'source1';
        contextIn = contextIn
          .set(KeysInitQuery.querySourcesUnidentified, [
            source1,
          ]);
        const { context: contextOut1 } = await actor.run({ context: contextIn, operation });
        const { context: contextOut2 } = await actor.run({ context: contextIn, operation });
        expect(contextOut1.get<IQuerySourceWrapper[]>(KeysQueryOperation.querySources)![0])
          .toBe(contextOut2.get<IQuerySourceWrapper[]>(KeysQueryOperation.querySources)![0]);
      });

      it('should allow cache invalidation for a specific url', async() => {
        const source1 = 'source1';
        const source2 = 'source2';
        contextIn = contextIn
          .set(KeysInitQuery.querySourcesUnidentified, [
            source1,
            source2,
          ]);

        const { context: contextOut1 } = await actor.run({ context: contextIn, operation });
        expect(contextOut1.get(KeysQueryOperation.querySources)).toEqual([
          { ofUnidentified: { value: 'source1' }},
          { ofUnidentified: { value: 'source2' }},
        ]);

        listener({ url: 'source1' });

        const { context: contextOut2 } = await actor.run({ context: contextIn, operation });
        expect(contextOut2.get(KeysQueryOperation.querySources)).toEqual([
          { ofUnidentified: { value: 'source1' }},
          { ofUnidentified: { value: 'source2' }},
        ]);

        expect(contextOut1.get<IQuerySourceWrapper[]>(KeysQueryOperation.querySources)![0])
          .not.toBe(contextOut2.get<IQuerySourceWrapper[]>(KeysQueryOperation.querySources)![0]);
        expect(contextOut1.get<IQuerySourceWrapper[]>(KeysQueryOperation.querySources)![1])
          .toBe(contextOut2.get<IQuerySourceWrapper[]>(KeysQueryOperation.querySources)![1]);
      });

      it('should not reuse cache entries of named-graph sources for plain sources', async() => {
        const namedGraphSource = {
          value: 'source1',
          context: new ActionContext()
            .set(KeysQueryOperation.sourceAsNamedGraph, DF.namedNode('source1')),
        };
        contextIn = contextIn.set(KeysInitQuery.querySourcesUnidentified, [ 'source1', namedGraphSource ]);

        const { context: contextOut } = await actor.run({ context: contextIn, operation });
        const sources = contextOut.get<IQuerySourceWrapper[]>(KeysQueryOperation.querySources)!;
        expect(sources[0]).not.toBe(sources[1]);
      });

      it('should not reuse cache entries of named-graph sources across distinct named graphs', async() => {
        const sourceInG1 = {
          value: 'source1',
          context: new ActionContext().set(KeysQueryOperation.sourceAsNamedGraph, DF.namedNode('g1')),
        };
        const sourceInG2 = {
          value: 'source1',
          context: new ActionContext().set(KeysQueryOperation.sourceAsNamedGraph, DF.namedNode('g2')),
        };
        contextIn = contextIn.set(KeysInitQuery.querySourcesUnidentified, [ sourceInG1, sourceInG2 ]);

        const { context: contextOut } = await actor.run({ context: contextIn, operation });
        const sources = contextOut.get<IQuerySourceWrapper[]>(KeysQueryOperation.querySources)!;
        expect(sources[0]).not.toBe(sources[1]);
      });

      it('should cache identical named-graph sources in separate calls', async() => {
        const namedGraphSource = {
          value: 'source1',
          context: new ActionContext()
            .set(KeysQueryOperation.sourceAsNamedGraph, DF.namedNode('source1')),
        };
        contextIn = contextIn.set(KeysInitQuery.querySourcesUnidentified, [ namedGraphSource ]);

        const { context: contextOut1 } = await actor.run({ context: contextIn, operation });
        const { context: contextOut2 } = await actor.run({ context: contextIn, operation });
        expect(contextOut1.get<IQuerySourceWrapper[]>(KeysQueryOperation.querySources)![0])
          .toBe(contextOut2.get<IQuerySourceWrapper[]>(KeysQueryOperation.querySources)![0]);
      });

      it('should only flag the cache as holding qualified sources once one is cached', async() => {
        contextIn = contextIn.set(KeysInitQuery.querySourcesUnidentified, [ 'source1' ]);
        await actor.run({ context: contextIn, operation });
        expect(actor.cacheHasQualifiedSources).toBeFalsy();

        contextIn = contextIn.set(KeysInitQuery.querySourcesUnidentified, [{
          value: 'source2',
          context: new ActionContext().set(KeysQueryOperation.sourceAsNamedGraph, DF.namedNode('source2')),
        }]);
        await actor.run({ context: contextIn, operation });
        expect(actor.cacheHasQualifiedSources).toBeTruthy();

        listener({});
        expect(actor.cacheHasQualifiedSources).toBeFalsy();
      });

      it('should allow cache invalidation of named-graph sources for a specific url', async() => {
        const namedGraphSource = {
          value: 'source1',
          context: new ActionContext()
            .set(KeysQueryOperation.sourceAsNamedGraph, DF.namedNode('source1')),
        };
        contextIn = contextIn
          .set(KeysInitQuery.querySourcesUnidentified, [ namedGraphSource, 'source2' ]);

        const { context: contextOut1 } = await actor.run({ context: contextIn, operation });

        listener({ url: 'source1' });

        const { context: contextOut2 } = await actor.run({ context: contextIn, operation });

        const sources1 = contextOut1.get<IQuerySourceWrapper[]>(KeysQueryOperation.querySources)!;
        const sources2 = contextOut2.get<IQuerySourceWrapper[]>(KeysQueryOperation.querySources)!;
        expect(sources1[0]).not.toBe(sources2[0]);
        expect(sources1[1]).toBe(sources2[1]);
      });

      it('should not reuse cache entries of sources with a forced type for plain sources', async() => {
        contextIn = contextIn.set(KeysInitQuery.querySourcesUnidentified, [
          'source1',
          { type: 'sparql', value: 'source1' },
        ]);

        const { context: contextOut } = await actor.run({ context: contextIn, operation });
        const sources = contextOut.get<IQuerySourceWrapper[]>(KeysQueryOperation.querySources)!;
        expect(sources[0]).not.toBe(sources[1]);
        expect(mediatorQuerySourceIdentify.mediate).toHaveBeenCalledTimes(2);
      });

      it('should not reuse cache entries of sources across distinct forced types', async() => {
        contextIn = contextIn.set(KeysInitQuery.querySourcesUnidentified, [{ type: 'file', value: 'source1' }]);
        const { context: contextOut1 } = await actor.run({ context: contextIn, operation });
        contextIn = contextIn.set(KeysInitQuery.querySourcesUnidentified, [{ type: 'sparql', value: 'source1' }]);
        const { context: contextOut2 } = await actor.run({ context: contextIn, operation });

        const source1 = contextOut1.get<IQuerySourceWrapper[]>(KeysQueryOperation.querySources)![0];
        const source2 = contextOut2.get<IQuerySourceWrapper[]>(KeysQueryOperation.querySources)![0];
        expect(source1).not.toBe(source2);
        expect(source2).toEqual({ ofUnidentified: expect.objectContaining({ type: 'sparql', value: 'source1' }) });
      });

      it('should cache identical sources with a forced type in separate calls', async() => {
        contextIn = contextIn.set(KeysInitQuery.querySourcesUnidentified, [{ type: 'sparql', value: 'source1' }]);

        const { context: contextOut1 } = await actor.run({ context: contextIn, operation });
        const { context: contextOut2 } = await actor.run({ context: contextIn, operation });
        expect(contextOut1.get<IQuerySourceWrapper[]>(KeysQueryOperation.querySources)![0])
          .toBe(contextOut2.get<IQuerySourceWrapper[]>(KeysQueryOperation.querySources)![0]);
        expect(mediatorQuerySourceIdentify.mediate).toHaveBeenCalledTimes(1);
      });

      it('should not reuse cache entries of sources across distinct source contexts', async() => {
        const keyAuth = new ActionContextKey<string>('@comunica/bus-http:auth');
        contextIn = contextIn.set(KeysInitQuery.querySourcesUnidentified, [
          'source1',
          { value: 'source1', context: new ActionContext().set(keyAuth, 'user:secret') },
          { value: 'source1', context: new ActionContext().set(keyAuth, 'other:secret') },
        ]);

        const { context: contextOut } = await actor.run({ context: contextIn, operation });
        const sources = contextOut.get<IQuerySourceWrapper[]>(KeysQueryOperation.querySources)!;
        expect(sources[0]).not.toBe(sources[1]);
        expect(sources[0]).not.toBe(sources[2]);
        expect(sources[1]).not.toBe(sources[2]);
        expect(mediatorQuerySourceIdentify.mediate).toHaveBeenCalledTimes(3);
      });

      it('should cache identical sources with a source context in separate calls', async() => {
        const keyAuth = new ActionContextKey<string>('@comunica/bus-http:auth');
        contextIn = contextIn.set(KeysInitQuery.querySourcesUnidentified, [
          { value: 'source1', context: new ActionContext().set(keyAuth, 'user:secret') },
        ]);

        const { context: contextOut1 } = await actor.run({ context: contextIn, operation });
        const { context: contextOut2 } = await actor.run({ context: contextIn, operation });
        expect(contextOut1.get<IQuerySourceWrapper[]>(KeysQueryOperation.querySources)![0])
          .toBe(contextOut2.get<IQuerySourceWrapper[]>(KeysQueryOperation.querySources)![0]);
        expect(mediatorQuerySourceIdentify.mediate).toHaveBeenCalledTimes(1);
      });

      it('should not cache sources with a source context value that has no string representation', async() => {
        const keyFetch = new ActionContextKey<typeof fetch>('@comunica/bus-http:fetch');
        contextIn = contextIn.set(KeysInitQuery.querySourcesUnidentified, [
          { value: 'source1', context: new ActionContext().set(keyFetch, fetch) },
        ]);

        const { context: contextOut1 } = await actor.run({ context: contextIn, operation });
        const { context: contextOut2 } = await actor.run({ context: contextIn, operation });
        expect(contextOut1.get<IQuerySourceWrapper[]>(KeysQueryOperation.querySources)![0])
          .not.toBe(contextOut2.get<IQuerySourceWrapper[]>(KeysQueryOperation.querySources)![0]);
        expect(mediatorQuerySourceIdentify.mediate).toHaveBeenCalledTimes(2);
        expect(actor.cache!.size).toBe(0);
      });

      it('should allow cache invalidation of sources with a forced type for a specific url', async() => {
        contextIn = contextIn.set(KeysInitQuery.querySourcesUnidentified, [
          { type: 'sparql', value: 'source1' },
          { type: 'sparql', value: 'source2' },
        ]);

        const { context: contextOut1 } = await actor.run({ context: contextIn, operation });

        listener({ url: 'source1' });

        const { context: contextOut2 } = await actor.run({ context: contextIn, operation });

        const sources1 = contextOut1.get<IQuerySourceWrapper[]>(KeysQueryOperation.querySources)!;
        const sources2 = contextOut2.get<IQuerySourceWrapper[]>(KeysQueryOperation.querySources)!;
        expect(sources1[0]).not.toBe(sources2[0]);
        expect(sources1[1]).toBe(sources2[1]);
      });

      it('should allow cache invalidation for all url', async() => {
        const source1 = 'source1';
        const source2 = 'source2';
        contextIn = contextIn
          .set(KeysInitQuery.querySourcesUnidentified, [
            source1,
            source2,
          ]);

        const { context: contextOut1 } = await actor.run({ context: contextIn, operation });
        expect(contextOut1.get(KeysQueryOperation.querySources)).toEqual([
          { ofUnidentified: { value: 'source1' }},
          { ofUnidentified: { value: 'source2' }},
        ]);

        listener({});

        const { context: contextOut2 } = await actor.run({ context: contextIn, operation });
        expect(contextOut2.get(KeysQueryOperation.querySources)).toEqual([
          { ofUnidentified: { value: 'source1' }},
          { ofUnidentified: { value: 'source2' }},
        ]);

        expect(contextOut1.get<IQuerySourceWrapper[]>(KeysQueryOperation.querySources)![0])
          .not.toBe(contextOut2.get<IQuerySourceWrapper[]>(KeysQueryOperation.querySources)![0]);
        expect(contextOut1.get<IQuerySourceWrapper[]>(KeysQueryOperation.querySources)![1])
          .not.toBe(contextOut2.get<IQuerySourceWrapper[]>(KeysQueryOperation.querySources)![1]);
      });

      it('with an unidentified source with proper context', async() => {
        const contextSource = new ActionContext({ a: 'b' });
        contextIn = contextIn
          .set(KeysInitQuery.querySourcesUnidentified, [
            { value: 'source2', context: contextSource },
          ]);
        const { context: contextOut } = await actor.run({ context: contextIn, operation });
        expect(contextOut).not.toBe(contextIn);
        expect(contextOut.get(KeysQueryOperation.querySources)).toEqual([
          {
            ofUnidentified: {
              value: 'source2',
              context: contextSource.set(new ActionContextKey('processed'), true),
            },
          },
        ]);
      });

      it('with an unidentified source with raw context', async() => {
        const contextSource = { a: 'b' };
        contextIn = contextIn
          .set(KeysInitQuery.querySourcesUnidentified, [
            { value: 'source2', context: contextSource },
          ]);
        const { context: contextOut } = await actor.run({ context: contextIn, operation });
        expect(contextOut).not.toBe(contextIn);
        expect(contextOut.get(KeysQueryOperation.querySources)).toEqual([
          {
            ofUnidentified: {
              value: 'source2',
              context: new ActionContext(contextSource).set(new ActionContextKey('processed'), true),
            },
          },
        ]);
      });

      it('should record dereference events when passed dereference statistic', async() => {
        const cb = jest.fn(() => {});
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2021-01-01T00:00:00Z').getTime());

        // Define actor that does return required field source with reference value
        mediatorQuerySourceIdentify = <any> {
          async mediate(action: IActionQuerySourceIdentify) {
            return {
              querySource: <any> { ofUnidentified: action.querySourceUnidentified, source: { referenceValue: 'mock' }},
            };
          },
        };
        actor = new ActorOptimizeQueryOperationQuerySourceIdentify({
          name: 'actor',
          bus,
          serviceForceSparqlEndpoint: false,
          cacheSize: 0,
          httpInvalidator,
          mediatorQuerySourceIdentify,
          mediatorContextPreprocess,
        });

        const statisticTracker: StatisticLinkDereference = new StatisticLinkDereference();

        contextIn = contextIn.set(KeysStatistics.dereferencedLinks, statisticTracker);
        statisticTracker.on(cb);

        const contextSource = { a: 'b' };
        contextIn = contextIn
          .set(KeysInitQuery.querySourcesUnidentified, [
            { value: 'source2', context: contextSource },
          ]);

        const { context: contextOut } = await actor.run({ context: contextIn, operation });
        expect(contextOut).not.toBe(contextIn);

        expect(cb).toHaveBeenCalledWith(
          {
            url: 'mock',
            metadata: {
              type: 'Object',
              dereferenceOrder: 0,
              dereferencedTimestamp: performance.now(),
              seed: true,
            },
            transform: undefined,
            context: undefined,
          },
        );

        jest.useRealTimers();
      });
    });

    describe('getCacheKey', () => {
      it('should be the url for plain sources', () => {
        expect(actor.getCacheKey({ value: 'http://ex.org/' }, '')).toBe('http://ex.org/');
        expect(actor.getCacheKey({ value: 'http://ex.org/', context: new ActionContext() }, '')).toBe('http://ex.org/');
      });

      it('should start with the given prefix', () => {
        expect(actor.getCacheKey({ value: 'http://ex.org/' }, 'service:')).toBe('service:http://ex.org/');
      });

      it('should be undefined for sources without url', () => {
        expect(actor.getCacheKey({ value: RdfStore.createDefault() }, '')).toBeUndefined();
      });

      it('should contain the forced type', () => {
        expect(actor.getCacheKey({ type: 'sparql', value: 'http://ex.org/' }, 'service:'))
          .toBe('service:["sparql",[]]\nhttp://ex.org/');
      });

      it('should contain the source context entries, independent of their order', () => {
        const context1 = new ActionContext()
          .set(new ActionContextKey('b'), 1)
          .set(new ActionContextKey('a'), true)
          .set(KeysQueryOperation.sourceAsNamedGraph, DF.namedNode('http://ex.org/g'))
          .set(new ActionContextKey('c'), DF.literal('l', 'en'));
        const context2 = new ActionContext()
          .set(new ActionContextKey('c'), DF.literal('l', 'en'))
          .set(KeysQueryOperation.sourceAsNamedGraph, DF.namedNode('http://ex.org/g'))
          .set(new ActionContextKey('a'), true)
          .set(new ActionContextKey('b'), 1);
        const key = '[null,[["@comunica/bus-query-operation:sourceAsNamedGraph","http://ex.org/g"],' +
          '["a",true],["b",1],["c","\\"l\\"@en"]]]\nhttp://ex.org/';
        expect(actor.getCacheKey({ value: 'http://ex.org/', context: context1 }, '')).toBe(key);
        expect(actor.getCacheKey({ value: 'http://ex.org/', context: context2 }, '')).toBe(key);
      });

      it('should be undefined for source context values without string representation', () => {
        for (const value of [ fetch, {}, [ 'a' ], null ]) {
          expect(actor.getCacheKey({
            value: 'http://ex.org/',
            context: new ActionContext().set(new ActionContextKey('a'), value),
          }, '')).toBeUndefined();
        }
      });
    });
  });

  describe('An ActorOptimizeQueryOperationQuerySourceIdentify instance without cache', () => {
    let actor: ActorOptimizeQueryOperationQuerySourceIdentify;
    let mediatorQuerySourceIdentify: MediatorQuerySourceIdentify;
    let httpInvalidator: ActorHttpInvalidateListenable;

    beforeEach(() => {
      mediatorQuerySourceIdentify = <any> {
        async mediate(action: IActionQuerySourceIdentify) {
          return { querySource: <any> { ofUnidentified: action.querySourceUnidentified }};
        },
      };
      httpInvalidator = <any>{
        addInvalidateListener: jest.fn(),
      };
      actor = new ActorOptimizeQueryOperationQuerySourceIdentify({
        name: 'actor',
        bus,
        serviceForceSparqlEndpoint: false,
        cacheSize: 0,
        httpInvalidator,
        mediatorQuerySourceIdentify,
        mediatorContextPreprocess,
      });
    });

    it('should not cache 2 identical sources in one call', async() => {
      const source1 = 'source1';
      const contextIn = new ActionContext()
        .set(KeysInitQuery.querySourcesUnidentified, [
          source1,
          source1,
        ]);
      const { context: contextOut } = await actor.run({ context: contextIn, operation });
      expect(contextOut).not.toBe(contextIn);
      expect(contextOut.get(KeysQueryOperation.querySources)).toEqual([
        { ofUnidentified: { value: 'source1' }},
        { ofUnidentified: { value: 'source1' }},
      ]);
      expect(contextOut.get<IQuerySourceWrapper[]>(KeysQueryOperation.querySources)![0])
        .not.toBe(contextOut.get<IQuerySourceWrapper[]>(KeysQueryOperation.querySources)![1]);
    });

    it('should not cache identical sources in separate calls', async() => {
      const source1 = 'source1';
      const contextIn = new ActionContext()
        .set(KeysInitQuery.querySourcesUnidentified, [
          source1,
        ]);
      const { context: contextOut1 } = await actor.run({ context: contextIn, operation });
      const { context: contextOut2 } = await actor.run({ context: contextIn, operation });
      expect(contextOut1.get<IQuerySourceWrapper[]>(KeysQueryOperation.querySources)![0])
        .not.toBe(contextOut2.get<IQuerySourceWrapper[]>(KeysQueryOperation.querySources)![0]);
    });
  });

  describe('An ActorOptimizeQueryOperationQuerySourceIdentify instance with serviceForceSparqlEndpoint', () => {
    let actor: ActorOptimizeQueryOperationQuerySourceIdentify;
    let mediatorQuerySourceIdentify: MediatorQuerySourceIdentify;
    let httpInvalidator: ActorHttpInvalidateListenable;

    beforeEach(() => {
      mediatorQuerySourceIdentify = <any> {
        mediate: jest.fn(async(action: IActionQuerySourceIdentify) => {
          return {
            querySource: <any> { ofUnidentified: action.querySourceUnidentified, source: { referenceValue: 'abc' }},
          };
        }),
      };
      httpInvalidator = <any>{
        addInvalidateListener: jest.fn(),
      };
      actor = new ActorOptimizeQueryOperationQuerySourceIdentify({
        name: 'actor',
        bus,
        serviceForceSparqlEndpoint: true,
        cacheSize: 0,
        httpInvalidator,
        mediatorQuerySourceIdentify,
        mediatorContextPreprocess,
      });
      contextIn = new ActionContext();
    });

    it('with SERVICE clauses', async() => {
      const { context: contextOut } = await actor.run({ context: contextIn, operation: operationService });
      expect(contextOut).not.toBe(contextIn);
      expect(contextOut.get(KeysQueryOperation.serviceSources)).toEqual({
        source1: { ofUnidentified: expect.objectContaining({ value: 'source1' }), source: { referenceValue: 'abc' }},
        source2: { ofUnidentified: expect.objectContaining({ value: 'source2' }), source: { referenceValue: 'abc' }},
      });
      expect(mediatorQuerySourceIdentify.mediate).toHaveBeenCalledTimes(2);
      expect(mediatorQuerySourceIdentify.mediate).toHaveBeenCalledWith({
        querySourceUnidentified: { type: 'sparql', value: 'source1', context: serviceContextBlocked },
        context: expect.anything(),
      });
      expect(mediatorQuerySourceIdentify.mediate).toHaveBeenCalledWith({
        querySourceUnidentified: { type: 'sparql', value: 'source2', context: serviceContextBlocked },
        context: expect.anything(),
      });
    });
  });
});
