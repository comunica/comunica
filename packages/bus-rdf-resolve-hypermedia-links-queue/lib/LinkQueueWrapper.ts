import type { ILink, ILinkQueue } from '@comunica/types';

/**
 * A link queue that wraps a given link queue.
 */
export class LinkQueueWrapper<T extends ILinkQueue = ILinkQueue> implements ILinkQueue {
  /**
   * The wrapped link queue instance.
   */
  protected readonly linkQueue: T;

  public constructor(linkQueue: T) {
    this.linkQueue = linkQueue;
  }

  /**
   * Pushes a link onto the queue.
   * @param link The link to push.
   * @param parent The optional parent link.
   * @return Whether the link was successfully pushed.
   */
  public push(link: ILink, parent?: ILink): boolean {
    return this.linkQueue.push(link, parent);
  }

  /**
   * Returns the current size of the queue.
   * @return The number of links in the queue.
   */
  public getSize(): number {
    return this.linkQueue.getSize();
  }

  /**
   * Checks whether the queue is empty.
   * @return Whether the queue contains no links.
   */
  public isEmpty(): boolean {
    return this.linkQueue.isEmpty();
  }

  /**
   * Removes and returns the next link from the queue.
   * @return The next link, or `undefined` if the queue is empty.
   */
  public pop(): ILink | undefined {
    return this.linkQueue.pop();
  }

  /**
   * Returns the next link without removing it from the queue.
   * @return The next link, or `undefined` if the queue is empty.
   */
  public peek(): ILink | undefined {
    return this.linkQueue.peek();
  }
}
