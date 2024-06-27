import type { IActionContextPreprocess, IActorContextPreprocessOutput, IActorContextPreprocessArgs } from '@comunica/bus-context-preprocess';
import { ActorContextPreprocess } from '@comunica/bus-context-preprocess';
import { KeysInitQuery, KeysStatisticsTracker, KeysTrackableStatistics } from '@comunica/context-entries';
import type { IActorTest } from '@comunica/core';
import { IActionContextKey } from '@comunica/types';
import { StatisticDereferenceOrder } from './StatisticDereferenceOrder';

/**
 * A comunica Statistic Dereference Order Context Preprocess Actor.
 */
export class ActorContextPreprocessStatisticDereferenceOrder extends ActorContextPreprocess {
  public constructor(args: IActorContextPreprocessArgs) {
    super(args);
  }

  public async test(action: IActionContextPreprocess): Promise<IActorTest> {
    return true; // TODO implement
  }

  public async run(action: IActionContextPreprocess): Promise<IActorContextPreprocessOutput> {
    const statisticsMap = <Map<IActionContextKey<any>, any>> action.context.get(KeysStatisticsTracker.statistics)!;
    statisticsMap.set(KeysTrackableStatistics.dereferencedLinks, 
      new StatisticDereferenceOrder(action.context.get(KeysInitQuery.queryString)!, action.context.get(KeysStatisticsTracker.statiticsLogger) ));

    return { context: action.context }; // TODO implement
  }
}
