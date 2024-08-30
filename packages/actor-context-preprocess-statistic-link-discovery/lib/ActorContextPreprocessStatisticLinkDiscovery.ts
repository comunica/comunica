import type { IActionContextPreprocess, IActorContextPreprocessOutput, IActorContextPreprocessArgs }
  from '@comunica/bus-context-preprocess';
import { ActorContextPreprocess } from '@comunica/bus-context-preprocess';
import { KeysTrackableStatistics } from '@comunica/context-entries';
import type { IActorTest } from '@comunica/core';
import { StatisticLinkDiscovery } from './StatisticLinkDiscovery';

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
    const context = action.context.set(KeysTrackableStatistics.discoveredLinks, new StatisticLinkDiscovery());
    return { context };
  }
}
