import {ISearchForm, ISearchForms} from "@comunica/actor-rdf-metadata-extract-hydra-controls";
import {KEY_CONTEXT_SOURCE} from "@comunica/bus-rdf-resolve-quad-pattern";
import {ActorRdfResolveHypermedia, IActionRdfResolveHypermedia,
  IActorRdfResolveHypermediaOutput} from "@comunica/bus-rdf-resolve-hypermedia";
import {ActionContext, IActorArgs, IActorTest} from "@comunica/core";

/**
 * A comunica QPF RDF Resolve Quad Pattern Actor.
 */
export class ActorRdfResolveHypermediaQpf extends ActorRdfResolveHypermedia
implements IActorRdfResolveHypermediaQpfArgs {

  public readonly subjectUri: string;
  public readonly predicateUri: string;
  public readonly objectUri: string;
  public readonly graphUri?: string;
  private searchForm: ISearchForm;

  constructor(args: IActorRdfResolveHypermediaQpfArgs) {
    super(args);
  }

  public async test(action: IActionRdfResolveHypermedia): Promise<IActorTest> {
    if (!(action.context.get(KEY_CONTEXT_SOURCE).type === "hypermedia")) {
      throw new Error(this.name
        + ' requires a single source with a Hypermedia \'hypermedia\' entrypoint to be present in the context.');
    }

    if (!action.metadata || !action.metadata.searchForms) {
      throw new Error(`${this.name} requires metadata and searchForms to work on.`);
    }

    // Find a quad pattern or triple pattern search form
    const searchForms: ISearchForms = action.metadata.searchForms;
    
    // TODO: in the future, a query-based search form getter should be used.
    for (this.searchForm of searchForms.values) {
      if ((this.graphUri
        && this.subjectUri in this.searchForm.mappings
        && this.predicateUri in this.searchForm.mappings
        && this.objectUri in this.searchForm.mappings
        && this.graphUri in this.searchForm.mappings
        && Object.keys(this.searchForm.mappings).length === 4) || 
        (this.subjectUri in this.searchForm.mappings
        && this.predicateUri in this.searchForm.mappings
        && this.objectUri in this.searchForm.mappings
        && Object.keys(this.searchForm.mappings).length === 3)) {
        return true;
      };
    }

    throw new Error('No valid Hydra search form was found for quad pattern or triple pattern queries.');
  }

  /**
   * Look for the search form
   * @param {IActionRdfResolveHypermedia} the metadata to look for the form.
   * @return {Promise<IActorRdfResolveHypermediaOutput>} A promise resolving to a hypermedia form.
   */
  public async run(action: IActionRdfResolveHypermedia):
  Promise<IActorRdfResolveHypermediaOutput> {
    return {searchForm: this.searchForm};
  }
}

export interface IActorRdfResolveHypermediaQpfArgs extends
IActorArgs<IActionRdfResolveHypermedia, IActorTest, IActorRdfResolveHypermediaOutput> {
  subjectUri: string;
  predicateUri: string;
  objectUri: string;
  graphUri?: string;
}
