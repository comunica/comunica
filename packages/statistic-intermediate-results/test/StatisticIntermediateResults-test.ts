import { BindingsFactory } from '@comunica/bindings-factory';
import { Bus } from '@comunica/core';
import type { ILink, IPartialResult } from '@comunica/types';
import { DataFactory } from 'rdf-data-factory';
import { StatisticIntermediateResults } from '../lib/StatisticIntermediateResults';

const DF = new DataFactory();
const BF = new BindingsFactory();

describe('StatisticIntermediateResults', () => {
  let bus: any;
  let statisticIntermediateResults: StatisticIntermediateResults;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2021-01-01T00:00:00Z').getTime());
    statisticIntermediateResults = new StatisticIntermediateResults();
  });

  describe('An StatisticIntermediateResults instance should', () => {
    let parent: ILink;
    let child: ILink;
    let cb: (data: IPartialResult) => void;

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
      cb = jest.fn((data: IPartialResult) => {});
    });

    it('attach an event listener', () => {
      statisticIntermediateResults.on(cb);
      expect(statisticIntermediateResults.getListeners()).toEqual(
        [ cb ],
      );
    });

    it('update intermediate result count', () => {
      expect(statisticIntermediateResults.updateStatistic(
        { data: BF.fromRecord({ v0: DF.namedNode('a') }), metadata: { key: 1 }},
      )).toBeTruthy;
    });

    it('emit event on update', () => {
      // We first add parent to the statistic, as only child metadata is added on updateStatistic call
      statisticIntermediateResults.on(cb);
      statisticIntermediateResults.updateStatistic(
        { data: BF.fromRecord({ v0: DF.namedNode('a') }), metadata: { key: 1, time: performance.now() }},
      );
      expect(cb).toHaveBeenCalledWith(
        { data: BF.fromRecord({ v0: DF.namedNode('a') }), metadata: { key: 1, time: performance.now() }},
      );
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });
});
