import { KeysStatistics } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import { ActorContextPreprocessStatisticLinkDereference } from '../lib/ActorContextPreprocessStatisticLinkDereference';
import { StatisticLinkDereference } from '../lib/StatisticLinkDereference';

jest.mock('../lib/StatisticLinkDereference');

describe('ActorContextPreprocessStatisticLinkDereference', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorContextPreprocessStatisticLinkDereference instance', () => {
    let actor: ActorContextPreprocessStatisticLinkDereference;

    beforeEach(() => {
      actor = new ActorContextPreprocessStatisticLinkDereference({ name: 'actor', bus });
    });

    it('should test', async() => {
      await expect(actor.test({ context: new ActionContext() })).resolves.toBeTruthy();
    });

    describe('run', () => {
      it('and add statistic to context', async() => {
        const contextIn = new ActionContext({});
        const { context: contextOut } = await actor.run({ context: contextIn });

        expect(contextOut.keys()).toEqual([ KeysStatistics.dereferencedLinks ]);

        expect(StatisticLinkDereference).toHaveBeenCalledTimes(1);
      });
    });
  });
});
