/**
 * Interface for the data emitted by link discovery statistic trackers.
 * The parent node represents the URL where the discovered URL is retrieved from.
 */
export interface IDiscoverEventData {
  /**
   * The directed edge ([parent, child]) discovered during query execution
   */
  edge: [string, string];
  /**
   * Metadata of the discovered node
   */
  metadataChild: Record<any, any>[];
  /**
   * Metadata of the parent of the discovered node
   */
  metadataParent: Record<any, any>[];
}
