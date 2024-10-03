import type { MediatorContextPreprocess } from '@comunica/bus-context-preprocess';
import type { ActorHttpInvalidateListenable } from '@comunica/bus-http-invalidate';
import type { IActionQuerySourceIdentify, MediatorQuerySourceIdentify } from '@comunica/bus-query-source-identify';
import { KeysInitQuery, KeysQueryOperation, KeysStatistics }
  from '@comunica/context-entries';
import type { IAction } from '@comunica/core';
import { ActionContext, ActionContextKey, Bus } from '@comunica/core';
import { StatisticLinkDereference } from '@comunica/statistic-link-dereference';
import type { IActionContext, IQuerySourceWrapper } from '@comunica/types';
import { RdfStore } from 'rdf-stores';
import { ActorContextPreprocessQuerySourceIdentify } from '../lib/ActorContextPreprocessQuerySourceIdentify';
import '@comunica/utils-jest';

describe('ActorContextPreprocessQuerySourceIdentify', () => {
  let bus: any;
  let mediatorContextPreprocess: MediatorContextPreprocess;
  let contextIn: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    mediatorContextPreprocess = <any> {
      async mediate(action: IAction) {
        return { context: action.context.set(new ActionContextKey('processed'), true) };
      },
    };
  });

  describe('An ActorContextPreprocessQuerySourceIdentify instance', () => {
    let actor: ActorContextPreprocessQuerySourceIdentify;
    let mediatorQuerySourceIdentify: MediatorQuerySourceIdentify;
    let httpInvalidator: ActorHttpInvalidateListenable;
    let listener: any = null;

    beforeEach(() => {
      mediatorQuerySourceIdentify = <any> {
        async mediate(action: IActionQuerySourceIdentify) {
          return { querySource: <any> { ofUnidentified: action.querySourceUnidentified }};
        },
      };
      httpInvalidator = <any>{
        addInvalidateListener: (l: any) => listener = l,
      };
      actor = new ActorContextPreprocessQuerySourceIdentify({
        name: 'actor',
        bus,
        cacheSize: 10,
        httpInvalidator,
        mediatorQuerySourceIdentify,
        mediatorContextPreprocess,
      });
    });

    it('should test', async() => {
      await expect(actor.test({ context: new ActionContext() })).resolves.toPassTestVoid();
    });

    describe('run', () => {
      beforeEach(() => {
        contextIn = new ActionContext({});
      });
      it('with an empty context', async() => {
        const { context: contextOut } = await actor.run({ context: contextIn });
        expect(contextOut).toBe(contextIn);
      });

      it('with zero unidentified sources', async() => {
        contextIn = contextIn.set(KeysInitQuery.querySourcesUnidentified, []);
        const { context: contextOut } = await actor.run({ context: contextIn });
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
        const { context: contextOut } = await actor.run({ context: contextIn });
        expect(contextOut).not.toBe(contextIn);
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
        const { context: contextOut } = await actor.run({ context: contextIn });
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
        const { context: contextOut1 } = await actor.run({ context: contextIn });
        const { context: contextOut2 } = await actor.run({ context: contextIn });
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

        const { context: contextOut1 } = await actor.run({ context: contextIn });
        expect(contextOut1.get(KeysQueryOperation.querySources)).toEqual([
          { ofUnidentified: { value: 'source1' }},
          { ofUnidentified: { value: 'source2' }},
        ]);

        listener({ url: 'source1' });

        const { context: contextOut2 } = await actor.run({ context: contextIn });
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

        const { context: contextOut1 } = await actor.run({ context: contextIn });
        expect(contextOut1.get(KeysQueryOperation.querySources)).toEqual([
          { ofUnidentified: { value: 'source1' }},
          { ofUnidentified: { value: 'source2' }},
        ]);

        listener({});

        const { context: contextOut2 } = await actor.run({ context: contextIn });
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
        const { context: contextOut } = await actor.run({ context: contextIn });
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
        const { context: contextOut } = await actor.run({ context: contextIn });
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
        actor = new ActorContextPreprocessQuerySourceIdentify({
          name: 'actor',
          bus,
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

        const { context: contextOut } = await actor.run({ context: contextIn });
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

  describe('An ActorContextPreprocessQuerySourceIdentify instance without cache', () => {
    let actor: ActorContextPreprocessQuerySourceIdentify;
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
      actor = new ActorContextPreprocessQuerySourceIdentify({
        name: 'actor',
        bus,
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
      const { context: contextOut } = await actor.run({ context: contextIn });
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
      const { context: contextOut1 } = await actor.run({ context: contextIn });
      const { context: contextOut2 } = await actor.run({ context: contextIn });
      expect(contextOut1.get<IQuerySourceWrapper[]>(KeysQueryOperation.querySources)![0])
        .not.toBe(contextOut2.get<IQuerySourceWrapper[]>(KeysQueryOperation.querySources)![0]);
    });
  });
});
