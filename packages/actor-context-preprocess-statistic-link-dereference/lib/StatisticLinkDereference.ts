import { StatisticBase } from '@comunica/bus-context-preprocess';
import type { ILink, IQuerySource } from '@comunica/types';

export class StatisticLinkDereference extends StatisticBase<ILink> {
  public count: number;

  public constructor() {
    super();
    this.count = 0;
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
