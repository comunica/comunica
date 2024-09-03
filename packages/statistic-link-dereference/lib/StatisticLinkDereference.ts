import { KeysStatistics } from '@comunica/context-entries';
import type { ActionContextKey } from '@comunica/core';
import { StatisticBase } from '@comunica/statistic-base';
import type { ILink, IQuerySource, IStatisticBase } from '@comunica/types';

export class StatisticLinkDereference extends StatisticBase<ILink> {
  public count: number;
  public key: ActionContextKey<IStatisticBase<ILink>>;

  public constructor() {
    super();
    this.count = 0;
    this.key = KeysStatistics.dereferencedLinks;
  }

  public updateStatistic(link: ILink, source: IQuerySource): boolean {
    this.emit({
      url: link.url,
      metadata: {
        type: source.constructor.name,
        dereferencedTimestamp: performance.now(),
        dereferenceOrder: this.count,
        ...link.metadata,
      },
      context: link.context,
      transform: link.transform,
    });
    this.count++;
    return true;
  }
}
