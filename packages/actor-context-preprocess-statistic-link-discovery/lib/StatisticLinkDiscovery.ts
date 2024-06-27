import type { ILink } from '@comunica/bus-rdf-resolve-hypermedia-links';
import type { IStatisticDiscoveredLinks, Logger } from '@comunica/types';

export class StatisticLinkDiscovery implements IStatisticDiscoveredLinks {
  public query: string;

  public edgeList: Set<[string, string]>;
  public metadata: Record<string, Record<any, any>>;

  public logger: Logger | undefined;

  public constructor(query: string, logger?: Logger) {
    this.edgeList = new Set();
    this.metadata = {};

    this.query = query;
    this.logger = logger;
  }

  public setDiscoveredLink(link: ILink, parent: ILink) {
    // If self-edge or duplicate edge we don't track.
    if (link.url === parent.url || this.edgeList.has([ parent.url, link.url ])) {
      return false;
    }
    this.edgeList.add([ parent.url, link.url ]);

    // Retain previous metadata if this link has already been discovered, and add any metadata in the passed link
    this.metadata[link.url] = this.metadata[link.url] ? { ...this.metadata[link.url], ...link.metadata } : { ...link.metadata };

    // Add timestamp for discovery of link
    this.metadata[link.url] = {
      ...this.metadata[link.url], 
      discoveredTimestamp: Date.now()
    }

    if (this.logger){
      this.logger.trace('Discover Event', { 
        data: JSON.stringify({
          statistic: "discoveredLinks", 
          query: this.query, 
          discoveredLinks: [...this.getDiscoveredLinks()],
          metadata: this.getMetadata()
        })
      });
    }


    return true;
  }
  
  public getDiscoveredLinks(){
    return this.edgeList
  }

  public getMetadata(){
    return this.metadata
  }
}
