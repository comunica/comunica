import type { ILink } from '@comunica/bus-rdf-resolve-hypermedia-links';
import type { IQuerySource, IStatisticDereferencedLinks, Logger } from '@comunica/types';

export class StatisticDereferenceOrder implements IStatisticDereferencedLinks {
  public query: string;
  public dereferenceOrder: ILink[];
  protected logger: Logger | undefined;

  public constructor(query: string, logger?: Logger) {
    this.dereferenceOrder = [];
    this.logger = logger;
    this.query = query;
  }

  public setDereferenced(link: ILink, source: IQuerySource) {
    const metadata: Record<string, any> = {
      type: source.constructor.name,
      dereferencedTimestamp: Date.now(),
      ...link.metadata
    }

    const dereferencedLink: ILink = {
      url: link.url,
      metadata: metadata,
      context: link.context,
      transform: link.transform
    }

    this.dereferenceOrder.push(dereferencedLink);

    if (this.logger){
      this.logger.trace('Dereference Event', { 
        data: JSON.stringify({
          statistic: "dereferencedLinks", 
          query: this.query, 
          dereferencedLinks: this.dereferenceOrder
        })
      });
    }

    return true;
  }

  public getDereferencedLinks(): ILink[] {
    return this.dereferenceOrder;
  }
}
