import { KeysQueryOperation, KeysQuerySourceIdentify } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import { ActorContextPreprocessQuerySourceBindingsSourceAttribution } from '../lib/ActorContextPreprocessQuerySourceBindingsSourceAttribution';
import { QuerySourceAddSourceAttribution } from '../lib/QuerySourceAddSourceAttribution';

describe('ActorContextPreprocessQuerySourceSkolemize', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorContextPreprocessQuerySourceSkolemize instance', () => {
    let actor: ActorContextPreprocessQuerySourceBindingsSourceAttribution;

    beforeEach(() => {
      actor = new ActorContextPreprocessQuerySourceBindingsSourceAttribution({ name: 'actor', bus });
    });

    it('should test', async() => {
      await expect(actor.test({ context: new ActionContext() })).resolves.toBeTruthy();
    });

    describe('run', () => {
      it('with an empty context', async() => {
        const contextIn = new ActionContext();
        const { context: contextOut } = await actor.run({ context: contextIn });
        expect(contextOut).toEqual(new ActionContext({
          [KeysQuerySourceIdentify.sourceIds.name]: new Map(),
        }));
      });

      it('with sources', async() => {
        const source1: any = {
          source: { referenceValue: 'S0' },
        };
        const source2: any = {
          source: { referenceValue: 'S1' },
          context: new ActionContext({ a: 'b' }),
        };
        const contextIn = new ActionContext({
          [KeysQueryOperation.querySources.name]: [
            source1,
            source2,
          ],
        });
        const { context: contextOut } = await actor.run({ context: contextIn });

        expect(contextOut).toEqual(new ActionContext({
          [KeysQuerySourceIdentify.sourceIds.name]: new Map([
            [ 'S0', '0' ],
            [ 'S1', '1' ],
          ]),
          [KeysQueryOperation.querySources.name]: [
            {
              source: new QuerySourceAddSourceAttribution(source1.source, '0'),
            },
            {
              source: new QuerySourceAddSourceAttribution(source2.source, '1'),
              context: new ActionContext({ a: 'b' }),
            },
          ],
        }));
      });
    });
  });
});
