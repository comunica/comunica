import type { ILink } from '@comunica/bus-rdf-resolve-hypermedia-links';
import type { ILinkQueue } from './ILinkQueue';

/**
 * A link queue that wraps a given link queue.
 */
export class LinkQueueWrapper implements ILinkQueue {
  private readonly linkQueue: ILinkQueue;

  public constructor(linkQueue: ILinkQueue) {
    this.linkQueue = linkQueue;
  }

  public push(link: ILink, parent: ILink): boolean {
    return this.linkQueue.push(link, parent);
  }

  public getSize(): number {
    return this.linkQueue.getSize();
  }

  public isEmpty(): boolean {
    return this.linkQueue.isEmpty();
  }

  public pop(): ILink | undefined {
    return this.linkQueue.pop();
  }

  public peek(): ILink | undefined {
    return this.linkQueue.peek();
  }
}
