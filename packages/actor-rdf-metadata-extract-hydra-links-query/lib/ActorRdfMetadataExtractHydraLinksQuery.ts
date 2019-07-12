import {ActorRdfMetadataExtractQuery, IActionRdfMetadataExtract, IActorRdfMetadataExtractOutput,
  IActorRdfMetadataExtractQueryArgs} from "@comunica/bus-rdf-metadata-extract";
import {IActorTest} from "@comunica/core";
import * as GRAPHQLLD_CONTEXT from "./context.json";

/**
 * A comunica Query-based Hydra Links RDF Metadata Extract Actor.
 */
export class ActorRdfMetadataExtractHydraLinksQuery extends ActorRdfMetadataExtractQuery {

  public static readonly GRAPHQLLD_QUERY: string = `
    query($pageUrl: String) @single(scope: all) {
      graph
      id(_: $pageUrl)
      first(alt: firstPage)       @optional
      next(alt: nextPage)         @optional
      previous(alt: previousPage) @optional
      last(alt: lastPage)         @optional
    }`;

  constructor(args: IActorRdfMetadataExtractQueryArgs) {
    super(GRAPHQLLD_CONTEXT, ActorRdfMetadataExtractHydraLinksQuery.GRAPHQLLD_QUERY, args);
  }

  public async test(action: IActionRdfMetadataExtract): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionRdfMetadataExtract): Promise<IActorRdfMetadataExtractOutput> {
    const metadata = await this.queryData(action.metadata, { '?pageUrl': action.url });
    delete metadata.graph;
    return { metadata };
  }

}
