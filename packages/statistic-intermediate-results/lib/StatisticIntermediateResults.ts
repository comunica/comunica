import { KeysStatistics } from '@comunica/context-entries';
import type { ActionContextKey } from '@comunica/core';
import { StatisticBase } from '@comunica/statistic-base';
import type { ILink, IQuerySource, IStatisticBase } from '@comunica/types';
import { IPartialResult } from '@comunica/actor-process-iterator-record-intermediate-results';

export class StatisticIntermediateResults extends StatisticBase<IPartialResult> {
  public count: number;
  public key: ActionContextKey<IStatisticBase<IPartialResult>>;;

  public constructor() {
    super();
    this.count = 0;
    this.key = KeysStatistics.intermediateResults;
  }

  public updateStatistic(intermediateResult: IPartialResult): boolean {
    // TODO Make nice code to track metadata from intermediate result
    // TODO Make this intermediate result interface in types?
    this.emit(intermediateResult);
    this.count++;
    return true;
  }
}
