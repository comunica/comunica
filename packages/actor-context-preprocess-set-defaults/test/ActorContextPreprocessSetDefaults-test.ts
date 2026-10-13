import { KeysCore, KeysQuerySourceIdentify, KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import { DataFactory } from 'rdf-data-factory';
import { ActorContextPreprocessSetDefaults } from '../lib/ActorContextPreprocessSetDefaults';
import '@comunica/utils-jest';

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
      await expect(actor.test({ context: new ActionContext() })).resolves.toPassTestVoid();
    });

    describe('run', () => {
      it('with an empty context without initialize', async() => {
        const contextIn = new ActionContext();
        const { context: contextOut } = await actor.run({ context: contextIn });
        expect(contextOut).toEqual(new ActionContext({}));
      });

      it('with an empty context', async() => {
        const contextIn = new ActionContext();
        const { context: contextOut } = await actor.run({ context: contextIn, initialize: true });
        expect(contextOut).toEqual(new ActionContext({
          [KeysInitQuery.dataFactory.name]: expect.any(DataFactory),
          [KeysInitQuery.queryTimestamp.name]: expect.any(Date),
          [KeysInitQuery.queryTimestampHighResolution.name]: expect.anything(),
          [KeysQuerySourceIdentify.sourceIds.name]: new Map(),
          [KeysCore.log.name]: 'L',
          [KeysInitQuery.functionArgumentsCache.name]: {},
          [KeysInitQuery.queryFormat.name]: { language: 'sparql', version: '1.1' },
          [KeysInitQuery.extensionFunctionsAlwaysPushdown.name]: true,
        }));
      });

      it('with a non-empty context', async() => {
        const contextIn = new ActionContext({
          [KeysInitQuery.queryFormat.name]: { language: 'graphql', version: '1.1' },
          [KeysInitQuery.extensionFunctions.name]: {},
        });
        const { context: contextOut } = await actor.run({ context: contextIn, initialize: true });
        expect(contextOut).toEqual(new ActionContext({
          [KeysInitQuery.dataFactory.name]: expect.any(DataFactory),
          [KeysInitQuery.queryTimestamp.name]: expect.any(Date),
          [KeysInitQuery.queryTimestampHighResolution.name]: expect.anything(),
          [KeysQuerySourceIdentify.sourceIds.name]: new Map(),
          [KeysCore.log.name]: 'L',
          [KeysInitQuery.functionArgumentsCache.name]: {},
          [KeysInitQuery.queryFormat.name]: { language: 'graphql', version: '1.1' },
          [KeysInitQuery.graphqlSingularizeVariables.name]: {},
          [KeysInitQuery.extensionFunctions.name]: {},
        }));
      });

      it('with a non-empty context with sparql', async() => {
        const contextIn = new ActionContext({
          [KeysInitQuery.queryFormat.name]: { language: 'sparql', version: '1.1' },
          [KeysInitQuery.extensionFunctions.name]: {},
        });
        const { context: contextOut } = await actor.run({ context: contextIn, initialize: true });
        expect(contextOut).toEqual(new ActionContext({
          [KeysInitQuery.dataFactory.name]: expect.any(DataFactory),
          [KeysInitQuery.queryTimestamp.name]: expect.any(Date),
          [KeysInitQuery.queryTimestampHighResolution.name]: expect.anything(),
          [KeysQuerySourceIdentify.sourceIds.name]: new Map(),
          [KeysCore.log.name]: 'L',
          [KeysInitQuery.functionArgumentsCache.name]: {},
          [KeysInitQuery.queryFormat.name]: { language: 'sparql', version: '1.1' },
          [KeysInitQuery.extensionFunctions.name]: {},
        }));
      });
    });
  });
});
