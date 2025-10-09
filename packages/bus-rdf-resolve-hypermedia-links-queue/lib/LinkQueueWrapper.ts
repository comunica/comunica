import type { ILink, ILinkQueue } from '@comunica/types';

/**
 * A link queue that wraps a given link queue.
 */
export class LinkQueueWrapper<T extends ILinkQueue = ILinkQueue> implements ILinkQueue {
  protected readonly linkQueue: T;

  public constructor(linkQueue: T) {
    this.linkQueue = linkQueue;
  }

  public push(link: ILink, parent?: ILink): boolean {
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
