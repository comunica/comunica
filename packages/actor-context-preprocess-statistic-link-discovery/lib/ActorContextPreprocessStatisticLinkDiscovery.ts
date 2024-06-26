import type { IActionContextPreprocess, IActorContextPreprocessOutput, IActorContextPreprocessArgs } from '@comunica/bus-context-preprocess';
import { ActorContextPreprocess } from '@comunica/bus-context-preprocess';
import { KeysInitQuery, KeysStatisticsTracker, KeysTrackableStatistics } from '@comunica/context-entries';
import type { IActorTest } from '@comunica/core';
import { StatisticLinkDiscovery } from './StatisticLinkDiscovery';
import { IActionContextKey } from '@comunica/types';

/**
 * A comunica Statistic Link Discovery Context Preprocess Actor.
 */
export class ActorContextPreprocessStatisticLinkDiscovery extends ActorContextPreprocess {
  public constructor(args: IActorContextPreprocessArgs) {
    super(args);
  }

  public async test(_action: IActionContextPreprocess): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionContextPreprocess): Promise<IActorContextPreprocessOutput> {
    const statisticsMap = <Map<IActionContextKey<any>, any>> action.context.get(KeysStatisticsTracker.statistics)!;
    statisticsMap.set(
      KeysTrackableStatistics.discoveredLinks, 
      new StatisticLinkDiscovery(
        action.context.get(KeysInitQuery.queryString)!, 
        action.context.get(KeysStatisticsTracker.statiticsLogger) 
      )
    );
    return { context: action.context };
  }
}
