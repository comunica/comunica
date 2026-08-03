import type { PartialResult } from '@comunica/types';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { DataFactory } from 'rdf-data-factory';
import { StatisticIntermediateResults } from '../lib/StatisticIntermediateResults';

const DF = new DataFactory();
const BF = new BindingsFactory(DF);

describe('StatisticIntermediateResults', () => {
  let statisticIntermediateResults: StatisticIntermediateResults;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2021-01-01T00:00:00Z').getTime());
    statisticIntermediateResults = new StatisticIntermediateResults();
  });

  describe('An StatisticIntermediateResults instance should', () => {
    let cb: (data: PartialResult) => void;

    beforeEach(() => {
      cb = jest.fn((_data: PartialResult) => {});
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
