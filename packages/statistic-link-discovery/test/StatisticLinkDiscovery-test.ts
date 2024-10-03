import type { ILink, IDiscoverEventData } from '@comunica/types';
import { StatisticLinkDiscovery } from '../lib/StatisticLinkDiscovery';

describe('StatisticLinkDiscovery', () => {
  let statisticLinkDiscovery: StatisticLinkDiscovery;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2021-01-01T00:00:00Z').getTime());
    statisticLinkDiscovery = new StatisticLinkDiscovery();
  });

  describe('An StatisticLinkDereference instance should', () => {
    let parent: ILink;
    let child: ILink;
    let cb: (arg0: IDiscoverEventData) => void;

    beforeEach(() => {
      parent = {
        url: 'parent',
        metadata: {
          key: 2,
        },
      };
      child = {
        url: 'child',
        metadata: {
          childkey: 5,
        },
      };
      cb = jest.fn(() => {});
    });

    it('update metadata links', () => {
      statisticLinkDiscovery.updateStatistic(child, parent);
      expect(statisticLinkDiscovery.metadata).toEqual({
        child: [{
          childkey: 5,
          discoveredTimestamp: performance.now(),
          discoverOrder: 0,
        }],
      });
    });

    it('correctly aggregate metadata', () => {
      const parent2: ILink = { url: 'parent2', metadata: {}};
      statisticLinkDiscovery.updateStatistic(child, parent);
      // Metadata upon second discovery from different parent can change
      child.metadata = { childkey: 10, extrakey: 'test' };
      statisticLinkDiscovery.updateStatistic(child, parent2);

      expect(statisticLinkDiscovery.metadata).toEqual(
        { child:
          [{
            childkey: 5,
            discoveredTimestamp: performance.now(),
            discoverOrder: 0,
          }, {
            childkey: 10,
            extrakey: 'test',
            discoveredTimestamp: performance.now(),
            discoverOrder: 1,
          }],
        },
      );
    });

    it('emit event on update', () => {
      // We first add parent to the statistic, as only child metadata is added on updateStatistic call
      statisticLinkDiscovery.updateStatistic(parent, child);
      statisticLinkDiscovery.on(cb);
      statisticLinkDiscovery.updateStatistic(child, parent);
      expect(cb).toHaveBeenCalledWith({
        edge: [ 'parent', 'child' ],
        metadataChild: [{ childkey: 5, discoverOrder: 1, discoveredTimestamp: performance.now() }],
        metadataParent: [{ key: 2, discoverOrder: 0, discoveredTimestamp: performance.now() }],
      });
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });
});
