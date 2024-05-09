import type { MediatorContextPreprocess } from '@comunica/bus-context-preprocess';
import type { ActorHttpInvalidateListenable } from '@comunica/bus-http-invalidate';
import type { IActionQuerySourceIdentify, MediatorQuerySourceIdentify } from '@comunica/bus-query-source-identify';
import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import type { IAction } from '@comunica/core';
import { ActionContext, ActionContextKey, Bus } from '@comunica/core';
import type { IQuerySourceWrapper } from '@comunica/types';
import { RdfStore } from 'rdf-stores';
import { ActorContextPreprocessQuerySourceIdentify } from '../lib/ActorContextPreprocessQuerySourceIdentify';

describe('ActorContextPreprocessQuerySourceIdentify', () => {
  let bus: any;
  let mediatorContextPreprocess: MediatorContextPreprocess;

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
      await expect(actor.test({ context: new ActionContext() })).resolves.toBeTruthy();
    });

    describe('run', () => {
      it('with an empty context', async() => {
        const contextIn = new ActionContext();
        const { context: contextOut } = await actor.run({ context: contextIn });
        expect(contextOut).toBe(contextIn);
      });

      it('with zero unidentified sources', async() => {
        const contextIn = new ActionContext()
          .set(KeysInitQuery.querySourcesUnidentified, []);
        const { context: contextOut } = await actor.run({ context: contextIn });
        expect(contextOut).not.toBe(contextIn);
        expect(contextOut.get(KeysQueryOperation.querySources)).toEqual([]);
      });

      it('with three unidentified sources', async() => {
        const source3 = RdfStore.createDefault();
        const contextIn = new ActionContext()
          .set(KeysInitQuery.querySourcesUnidentified, [
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
          .toBe(contextOut.get<IQuerySourceWrapper[]>(KeysQueryOperation.querySources)![1]);
      });

      it('should cache identical sources in separate calls', async() => {
        const source1 = 'source1';
        const contextIn = new ActionContext()
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
        const contextIn = new ActionContext()
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
        const contextIn = new ActionContext()
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
        const contextIn = new ActionContext()
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
        const contextIn = new ActionContext()
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
    });
  });

  describe('An ActorContextPreprocessQuerySourceIdentify instance without cache', () => {
    let actor: ActorContextPreprocessQuerySourceIdentify;
    let mediatorQuerySourceIdentify: MediatorQuerySourceIdentify;
    let httpInvalidator: ActorHttpInvalidateListenable;
    let listener = null;

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
