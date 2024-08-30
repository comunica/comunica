import type {
  IActionContextPreprocess,
  IActorContextPreprocessOutput,
  IActorContextPreprocessArgs }
  from '@comunica/bus-context-preprocess';
import { ActorContextPreprocess } from '@comunica/bus-context-preprocess';
import { KeysStatistics } from '@comunica/context-entries';
import type { IActorTest } from '@comunica/core';
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
    const context = action.context.set(KeysStatistics.dereferencedLinks, new StatisticLinkDereference());
    return { context };
  }
}
