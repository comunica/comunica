import {ISearchForms} from "@comunica/actor-rdf-metadata-extract-hydra-controls";
import {ActorRdfResolveHypermedia, IActionRdfResolveHypermedia,
  IActorRdfResolveHypermediaOutput} from "@comunica/bus-rdf-resolve-hypermedia";
import {KEY_CONTEXT_SOURCE} from "@comunica/bus-rdf-resolve-quad-pattern";
import {ActionContext, IActorArgs, IActorTest} from "@comunica/core";

/**
 * A comunica QPF RDF Resolve Quad Pattern Actor.
 */
export class ActorRdfResolveHypermediaNextPage extends ActorRdfResolveHypermedia
implements IActorRdfResolveHypermediaNextPageArgs {

  constructor(args: IActorRdfResolveHypermediaNextPageArgs) {
    super(args);
  }

  public async test(action: IActionRdfResolveHypermedia): Promise<IActorTest> {
    if (!(action.context.get(KEY_CONTEXT_SOURCE).type === "hypermedia")) {
      throw new Error(this.name
        + ' requires a single source with a Hypermedia \'hypermedia\' entrypoint to be present in the context.');
    }

    if (!action.metadata.next) {
      throw new Error(`${this.name} requires a hydra:next link to work.`);
    }

    return true;
  }

  /**
   * Look for the search form
   * @param {IActionRdfResolveHypermedia} the metadata to look for the form.
   * @return {Promise<IActorRdfResolveHypermediaOutput>} A promise resolving to a hypermedia form.
   */
  public async run(action: IActionRdfResolveHypermedia):
  Promise<IActorRdfResolveHypermediaOutput> {
    const baseURI = action.context.get(KEY_CONTEXT_SOURCE).value;

    return { searchForm: {
      getUri: (entries: {[id: string]: string}): string => baseURI,
      mappings: {},
      template: baseURI,
    }};
  }
}

export interface IActorRdfResolveHypermediaNextPageArgs extends
IActorArgs<IActionRdfResolveHypermedia, IActorTest, IActorRdfResolveHypermediaOutput> {
}
