import {ActorRdfMetadataExtractQuery, IActionRdfMetadataExtract, IActorRdfMetadataExtractOutput,
  IActorRdfMetadataExtractQueryArgs} from "@comunica/bus-rdf-metadata-extract";
import {IActorTest} from "@comunica/core";
import * as GRAPHQLLD_CONTEXT from "./context.json";

/**
 * An RDF Metadata Extract Actor that extracts total items counts from a metadata stream based on the given predicates.
 */
export class ActorRdfMetadataExtractHydraCountQuery extends ActorRdfMetadataExtractQuery {

  public static readonly GRAPHQLLD_QUERY: string = `
    query($pageUrl: String) @single(scope: all) {
      graph
      id(_: $pageUrl)
      totalItems(alt: triples)
    }`;

  constructor(args: IActorRdfMetadataExtractQueryArgs) {
    super(GRAPHQLLD_CONTEXT, ActorRdfMetadataExtractHydraCountQuery.GRAPHQLLD_QUERY, args);
  }

  public async test(action: IActionRdfMetadataExtract): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionRdfMetadataExtract): Promise<IActorRdfMetadataExtractOutput> {
    const queryData = await this.queryData(action.metadata, { '?pageUrl': action.url });
    if ('totalItems' in queryData && typeof queryData.totalItems !== 'number') {
      queryData.totalItems = parseInt(queryData.totalItems, 10);
    }
    return {
      metadata: {
        totalItems: 'totalItems' in queryData ? queryData.totalItems : Infinity,
      },
    };
  }

}
