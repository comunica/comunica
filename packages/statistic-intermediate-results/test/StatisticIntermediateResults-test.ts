import { BindingsFactory } from '@comunica/bindings-factory';
import { Bus } from '@comunica/core';
import type { ILink, PartialResult } from '@comunica/types';
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
    let cb: (data: PartialResult) => void;

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
      cb = jest.fn((data: PartialResult) => {});
    });

    it('attach an event listener', () => {
      statisticIntermediateResults.on(cb);
      expect(statisticIntermediateResults.getListeners()).toEqual(
        [ cb ],
      );
    });

    it('update intermediate result count', () => {
      expect(statisticIntermediateResults.updateStatistic(
        { type: 'bindings', data: BF.fromRecord({ v0: DF.namedNode('a') }), metadata: { key: 1 }},
      )).toBeTruthy();
    });

    it('emit event on bindings update', () => {
      // We first add parent to the statistic, as only child metadata is added on updateStatistic call
      statisticIntermediateResults.on(cb);
      statisticIntermediateResults.updateStatistic(
        {
          type: 'bindings',
          data: BF.fromRecord({ v0: DF.namedNode('a') }),
          metadata: { key: 1, time: performance.now() },
        },
      );
      expect(cb).toHaveBeenCalledWith(
        {
          type: 'bindings',
          data: BF.fromRecord({ v0: DF.namedNode('a') }),
          metadata: { key: 1, time: performance.now() },
        },
      );
    });
    it('emit event on quad update', () => {
      statisticIntermediateResults.on(cb);
      statisticIntermediateResults.updateStatistic(
        {
          type: 'quads',
          data: DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1'), DF.namedNode('g1')),
          metadata: { key: 1, time: performance.now() },
        },
      );
      expect(cb).toHaveBeenCalledWith(
        {
          type: 'quads',
          data: DF.quad(DF.namedNode('s1'), DF.namedNode('p1'), DF.namedNode('o1'), DF.namedNode('g1')),
          metadata: { key: 1, time: performance.now() },
        },
      );
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });
});
