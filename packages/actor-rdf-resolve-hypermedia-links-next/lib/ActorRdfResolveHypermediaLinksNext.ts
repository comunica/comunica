import type {
  IActionRdfResolveHypermediaLinks,
  IActorRdfResolveHypermediaLinksArgs,
  IActorRdfResolveHypermediaLinksOutput,
} from '@comunica/bus-rdf-resolve-hypermedia-links';
import { ActorRdfResolveHypermediaLinks } from '@comunica/bus-rdf-resolve-hypermedia-links';
import type { IActorTest, TestResult } from '@comunica/core';
import { failTest, passTestVoid } from '@comunica/core';

/**
 * A comunica Next RDF Resolve Hypermedia Links Actor.
 */
export class ActorRdfResolveHypermediaLinksNext extends ActorRdfResolveHypermediaLinks {
  public constructor(args: IActorRdfResolveHypermediaLinksArgs) {
    super(args);
  }

  public async test(action: IActionRdfResolveHypermediaLinks): Promise<TestResult<IActorTest>> {
    if (!action.metadata.next || action.metadata.next.length === 0) {
      return failTest(`Actor ${this.name} requires a 'next' metadata entry.`);
    }
    return passTestVoid();
  }

  public async run(action: IActionRdfResolveHypermediaLinks): Promise<IActorRdfResolveHypermediaLinksOutput> {
    return { links: action.metadata.next.map((url: string) => ({ url })) };
  }
}
