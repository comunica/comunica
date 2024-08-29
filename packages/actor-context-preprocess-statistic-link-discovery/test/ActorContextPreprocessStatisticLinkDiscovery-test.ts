import { StatisticsHolder } from '@comunica/actor-context-preprocess-set-defaults';
import { KeysInitQuery, KeysTrackableStatistics } from '@comunica/context-entries';
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
    let logFunction: ((message: string, data?: (() => any)) => void);

    beforeEach(() => {
      actor = new ActorContextPreprocessStatisticLinkDiscovery({ name: 'actor', bus });
    });

    it('should test', async() => {
      await expect(actor.test({ context: new ActionContext() })).resolves.toBeTruthy();
    });

    describe('run', () => {
      it('with only a statisticsHolder', async() => {
        const contextIn = new ActionContext({ [KeysInitQuery.statistics.name]: new StatisticsHolder() });
        const { context: contextOut } = await actor.run({ context: contextIn });

        expect(contextOut.keys()).toEqual([ KeysInitQuery.statistics ]);

        const statHolderFromContext: StatisticsHolder = contextOut.get(KeysInitQuery.statistics)!;
        expect(statHolderFromContext.keys()).toEqual(
          [ KeysTrackableStatistics.discoveredLinks ],
        );

        expect(StatisticLinkDiscovery).toHaveBeenCalledTimes(1);
      });

      it('should error with empty context', async() => {
        await expect(actor.run({ context: new ActionContext() })).rejects.toThrow(new Error(
          'Context entry @comunica/actor-context-preprocess-set-default:statistics is required but not available',
        ));
      });
    });
  });
});
