import type {
  IActionContextPreprocess,
  IActorContextPreprocessOutput,
  IActorContextPreprocessArgs }
  from '@comunica/bus-context-preprocess';
import { ActorContextPreprocess } from '@comunica/bus-context-preprocess';
import { KeysInitQuery, KeysTrackableStatistics } from '@comunica/context-entries';
import type { IActorTest } from '@comunica/core';
import type { IStatisticsHolder } from '@comunica/types';
import { StatisticLinkDereference } from './StatisticLinkDereference';

/**
 * A comunica Statistic Link Dereference Context Preprocess Actor.
 */
export class ActorContextPreprocessStatisticLinkDereference extends ActorContextPreprocess {
  public constructor(args: IActorContextPreprocessArgs) {
    super(args);
  }

  public async test(_action: IActionContextPreprocess): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionContextPreprocess): Promise<IActorContextPreprocessOutput> {
    const statisticsHolder: IStatisticsHolder = action.context.getSafe(KeysInitQuery.statistics);
    statisticsHolder.set(KeysTrackableStatistics.dereferencedLinks, new StatisticLinkDereference());
    return { context: action.context };
  }
}
