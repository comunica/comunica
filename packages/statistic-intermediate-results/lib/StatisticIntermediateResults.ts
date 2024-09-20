import { KeysStatistics } from '@comunica/context-entries';
import type { ActionContextKey } from '@comunica/core';
import { StatisticBase } from '@comunica/statistic-base';
import type { IPartialResult, IStatisticBase } from '@comunica/types';

export class StatisticIntermediateResults extends StatisticBase<IPartialResult> {
  public key: ActionContextKey<IStatisticBase<IPartialResult>>; ;

  public constructor() {
    super();
    this.key = KeysStatistics.intermediateResults;
  }

  public updateStatistic(intermediateResult: IPartialResult): boolean {
    intermediateResult.metadata.time = performance.now()
    this.emit(intermediateResult);
    return true;
  }
}
