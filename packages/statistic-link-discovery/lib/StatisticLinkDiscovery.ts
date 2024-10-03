import { KeysStatistics } from '@comunica/context-entries';
import type { ActionContextKey } from '@comunica/core';
import { StatisticBase } from '@comunica/statistic-base';
import type { IDiscoverEventData, ILink, IStatisticBase } from '@comunica/types';

export class StatisticLinkDiscovery extends StatisticBase<IDiscoverEventData> {
  // Key this statistic tracker should be saved under in context
  public key: ActionContextKey<IStatisticBase<IDiscoverEventData>>;

  // Number of discover events tracked
  public count: number;

  // Metadata is saved as follows: First key indicates what url this metadata belongs to, while value is
  // a list of all metadata objects recorded. This list can contain multiple Records as links can be discovered from
  // multiple data sources.
  public metadata: Record<string, Record<any, any>[]>;

  public constructor() {
    super();
    this.count = 0;
    this.metadata = {};
    this.key = KeysStatistics.discoveredLinks;
  }

  public updateStatistic(link: ILink, parent: ILink): boolean {
    const discoveredLinkMetadata = {
      ...link.metadata,
      discoveredTimestamp: performance.now(),
      discoverOrder: this.count,
    };
    // Retain previous metadata if this link has already been discovered, and add any metadata in the passed link
    this.metadata[link.url] = this.metadata[link.url] ?
        [ ...this.metadata[link.url], discoveredLinkMetadata ] :
        [ discoveredLinkMetadata ];
    this.emit({
      edge: [ parent.url, link.url ],
      metadataChild: this.metadata[link.url],
      metadataParent: this.metadata[parent.url],
    });
    this.count++;
    return true;
  }
}
