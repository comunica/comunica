import { KeysStatistics } from '@comunica/context-entries';
import type { ActionContextKey } from '@comunica/core';
import { StatisticBase } from '@comunica/statistic-base';
import type { PartialResult, IStatisticBase } from '@comunica/types';

export class StatisticIntermediateResults extends StatisticBase<PartialResult> {
  public key: ActionContextKey<IStatisticBase<PartialResult>> =
    KeysStatistics.intermediateResults; ;

  public updateStatistic(intermediateResult: PartialResult): boolean {
    intermediateResult.metadata.time = performance.now();
    this.emit(intermediateResult);
    return true;
  }
}
