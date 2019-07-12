import {ActorRdfResolveHypermediaLinks, IActionRdfResolveHypermediaLinks,
  IActorRdfResolveHypermediaLinksOutput} from "@comunica/bus-rdf-resolve-hypermedia-links";
import {IActorArgs, IActorTest} from "@comunica/core";

/**
 * A comunica Next RDF Resolve Hypermedia Links Actor.
 */
export class ActorRdfResolveHypermediaLinksNext extends ActorRdfResolveHypermediaLinks {

  constructor(args: IActorArgs<IActionRdfResolveHypermediaLinks, IActorTest, IActorRdfResolveHypermediaLinksOutput>) {
    super(args);
  }

  public async test(action: IActionRdfResolveHypermediaLinks): Promise<IActorTest> {
    if (!action.metadata.next) {
      throw new Error(`Actor ${this.name} requires a 'next' metadata entry.`);
    }
    return true;
  }

  public async run(action: IActionRdfResolveHypermediaLinks): Promise<IActorRdfResolveHypermediaLinksOutput> {
    return { urls: [ action.metadata.next ] };
  }

}
