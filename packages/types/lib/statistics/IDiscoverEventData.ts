export interface IDiscoverEventData {
  /**
   * The edge discovered during query execution
   */
  edge: [string, string];
  /**
   * Metadata of the discovered node
   */
  metadataChild: Record<any, any>[];
  /**
   * Metadata of the parent of the discovered ndoe
   */
  metadataParent: Record<any, any>[];
}
