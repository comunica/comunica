import {ActorRdfResolveHypermedia, IActionRdfResolveHypermedia,
  IActorRdfResolveHypermediaOutput} from "@comunica/bus-rdf-resolve-hypermedia";
import {IActorRdfResolveHypermediaTest} from "@comunica/bus-rdf-resolve-hypermedia";
import {IActorArgs} from "@comunica/core";
import {storeStream} from "rdf-store-stream";
import {RdfSourceMetadata} from "./RdfSourceMetadata";

/**
 * A comunica None RDF Resolve Hypermedia Actor.
 */
export class ActorRdfResolveHypermediaNone extends ActorRdfResolveHypermedia {

  constructor(args: IActorArgs<IActionRdfResolveHypermedia,
    IActorRdfResolveHypermediaTest, IActorRdfResolveHypermediaOutput>) {
    super(args, 'file');
  }

  public async testMetadata(action: IActionRdfResolveHypermedia): Promise<IActorRdfResolveHypermediaTest> {
    return { filterFactor: 0 };
  }

  public async run(action: IActionRdfResolveHypermedia): Promise<IActorRdfResolveHypermediaOutput> {
    this.logInfo(action.context, `Identified as file source: ${action.url}`);
    return { source: new RdfSourceMetadata(await storeStream(action.quads)) };
  }

}
