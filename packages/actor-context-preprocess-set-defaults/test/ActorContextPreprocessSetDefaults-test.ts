import { KeysCore, KeysInitQuery, KeysQuerySourceIdentify } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import { ActorContextPreprocessSetDefaults } from '../lib/ActorContextPreprocessSetDefaults';

describe('ActorContextPreprocessSetDefaults', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorContextPreprocessSetDefaults instance', () => {
    let actor: ActorContextPreprocessSetDefaults;

    beforeEach(() => {
      actor = new ActorContextPreprocessSetDefaults({ name: 'actor', bus, logger: <any> 'L' });
    });

    it('should test', async() => {
      await expect(actor.test({ context: new ActionContext() })).resolves.toBeTruthy();
    });

    describe('run', () => {
      it('with an empty context', async() => {
        const contextIn = new ActionContext();
        const { context: contextOut } = await actor.run({ context: contextIn });
        expect(contextOut).toEqual(new ActionContext({
          [KeysInitQuery.queryTimestamp.name]: expect.any(Date),
          [KeysQuerySourceIdentify.sourceIds.name]: new Map(),
          [KeysCore.log.name]: 'L',
          [KeysInitQuery.functionArgumentsCache.name]: {},
          [KeysInitQuery.queryFormat.name]: { language: 'sparql', version: '1.1' },
          [KeysQuerySourceIdentify.hypermediaSourcesAggregatedStores.name]: new Map(),
        }));
      });

      it('with a non-empty context', async() => {
        const contextIn = new ActionContext({
          [KeysInitQuery.queryFormat.name]: { language: 'graphql', version: '1.1' },
        });
        const { context: contextOut } = await actor.run({ context: contextIn });
        expect(contextOut).toEqual(new ActionContext({
          [KeysInitQuery.queryTimestamp.name]: expect.any(Date),
          [KeysQuerySourceIdentify.sourceIds.name]: new Map(),
          [KeysCore.log.name]: 'L',
          [KeysInitQuery.functionArgumentsCache.name]: {},
          [KeysInitQuery.queryFormat.name]: { language: 'graphql', version: '1.1' },
          [KeysInitQuery.graphqlSingularizeVariables.name]: {},
          [KeysQuerySourceIdentify.hypermediaSourcesAggregatedStores.name]: new Map(),
        }));
      });
    });
  });
});
