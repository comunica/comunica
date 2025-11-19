import type { ActorHttpInvalidateListenable } from '@comunica/bus-http-invalidate';
import type { MediatorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import type { IActionQuerySourceIdentify, MediatorQuerySourceIdentify } from '@comunica/bus-query-source-identify';
import { KeysInitQuery, KeysQueryOperation, KeysStatistics }
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
        expect(mediatorQuerySourceIdentify.mediate)
          .toHaveBeenCalledWith({ querySourceUnidentified: { value: 'source1' }, context: expect.anything() });
        expect(mediatorQuerySourceIdentify.mediate)
          .toHaveBeenCalledWith({ querySourceUnidentified: { value: 'source2' }, context: expect.anything() });
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
        querySourceUnidentified: { type: 'sparql', value: 'source1' },
        context: expect.anything(),
      });
      expect(mediatorQuerySourceIdentify.mediate).toHaveBeenCalledWith({
        querySourceUnidentified: { type: 'sparql', value: 'source2' },
        context: expect.anything(),
      });
    });
  });
});
