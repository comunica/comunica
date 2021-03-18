import type { ILink } from '@comunica/bus-rdf-resolve-hypermedia-links';

/**
 * A datastructure that accepts links, and emits them in an implementation-defined order.
 */
export interface ILinkQueue {
  /**
   * Add the given link to the queue.
   * @param link A link.
   * @param parent The parent in which the given link was discovered.
   * @returns If the link was added to the queue.
   */
  push: (link: ILink, parent: ILink) => boolean;
  /**
   * The number of links in the queue.
   */
  getSize: () => number;
  /**
   * If no links are in the queue.
   */
  isEmpty: () => boolean;
  /**
   * Get and remove the next link from the queue.
   */
  pop: () => ILink | undefined;
  /**
   * Get (but not remove) the next link from the queue.
   */
  peek: () => ILink | undefined;
}

// Re-export ILink interface for convenience
export { ILink };
