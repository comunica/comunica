import { KeysTrackableStatistics } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import { ActorContextPreprocessStatisticLinkDiscovery } from '../lib/ActorContextPreprocessStatisticLinkDiscovery';
import { StatisticLinkDiscovery } from '../lib/StatisticLinkDiscovery';

jest.mock('../lib/StatisticLinkDiscovery');

describe('ActorContextPreprocessStatisticLinkDiscovery', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorContextPreprocessStatisticLinkDiscovery instance', () => {
    let actor: ActorContextPreprocessStatisticLinkDiscovery;

    beforeEach(() => {
      actor = new ActorContextPreprocessStatisticLinkDiscovery({ name: 'actor', bus });
    });

    it('should test', async() => {
      await expect(actor.test({ context: new ActionContext() })).resolves.toBeTruthy();
    });

    describe('run', () => {
      it('and add statistic to context', async() => {
        const contextIn = new ActionContext({});
        const { context: contextOut } = await actor.run({ context: contextIn });

        expect(contextOut.keys()).toEqual([ KeysTrackableStatistics.discoveredLinks ]);

        expect(StatisticLinkDiscovery).toHaveBeenCalledTimes(1);
      });
    });
  });
});
