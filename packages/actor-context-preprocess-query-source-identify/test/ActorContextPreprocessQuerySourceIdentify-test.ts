import type { IActionQuerySourceIdentify, MediatorQuerySourceIdentify } from '@comunica/bus-query-source-identify';
import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import { RdfStore } from 'rdf-stores';
import { ActorContextPreprocessQuerySourceIdentify } from '../lib/ActorContextPreprocessQuerySourceIdentify';

describe('ActorContextPreprocessQuerySourceIdentify', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorContextPreprocessQuerySourceIdentify instance', () => {
    let actor: ActorContextPreprocessQuerySourceIdentify;
    let mediatorQuerySourceIdentify: MediatorQuerySourceIdentify;

    beforeEach(() => {
      mediatorQuerySourceIdentify = <any> {
        async mediate(action: IActionQuerySourceIdentify) {
          return { querySource: <any> { ofUnidentified: action.querySourceUnidentified }};
        },
      };
      actor = new ActorContextPreprocessQuerySourceIdentify({ name: 'actor', bus, mediatorQuerySourceIdentify });
    });

    it('should test', () => {
      return expect(actor.test({ context: new ActionContext() })).resolves.toBeTruthy();
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
          { ofUnidentified: { value: 'source1' }},
          { ofUnidentified: { value: 'source2' }},
          { ofUnidentified: { value: source3 }},
        ]);
      });
    });
  });
});
