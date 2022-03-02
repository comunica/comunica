import type {
  IActionRdfResolveHypermediaLinks, IActorRdfResolveHypermediaLinksArgs,
  IActorRdfResolveHypermediaLinksOutput,
} from '@comunica/bus-rdf-resolve-hypermedia-links';
import { ActorRdfResolveHypermediaLinks } from '@comunica/bus-rdf-resolve-hypermedia-links';
import type { IActorTest } from '@comunica/core';

/**
 * A comunica Next RDF Resolve Hypermedia Links Actor.
 */
export class ActorRdfResolveHypermediaLinksNext extends ActorRdfResolveHypermediaLinks {
  public constructor(args: IActorRdfResolveHypermediaLinksArgs) {
    super(args);
  }

  public async test(action: IActionRdfResolveHypermediaLinks): Promise<IActorTest> {
    if (!action.metadata.next) {
      throw new Error(`Actor ${this.name} requires a 'next' metadata entry.`);
    }
    return true;
  }

  public async run(action: IActionRdfResolveHypermediaLinks): Promise<IActorRdfResolveHypermediaLinksOutput> {
    return { links: [{ url: action.metadata.next }]};
  }
}
