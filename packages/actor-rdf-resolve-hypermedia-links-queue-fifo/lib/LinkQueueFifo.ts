import type { ILink } from '@comunica/bus-rdf-resolve-hypermedia-links';
import type { ILinkQueue } from '@comunica/bus-rdf-resolve-hypermedia-links-queue';

/**
 * A link queue in FIFO (first-in first-out) order.
 */
export class LinkQueueFifo implements ILinkQueue {
  public readonly links: ILink[] = [];

  public push(link: ILink): boolean {
    this.links.push(link);
    return true;
  }

  public getSize(): number {
    return this.links.length;
  }

  public isEmpty(): boolean {
    return this.links.length === 0;
  }

  public pop(): ILink | undefined {
    return this.links.shift();
  }

  public peek(): ILink | undefined {
    return this.links[0];
  }
}
