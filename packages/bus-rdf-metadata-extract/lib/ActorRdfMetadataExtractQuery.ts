import {ActorInitSparql} from "@comunica/actor-init-sparql";
import {IActorArgs, IActorTest} from "@comunica/core";
import {Client as GraphQlClient, IGraphQlToSparqlResult} from "graphql-ld";
import * as RDF from "rdf-js";
import {storeStream} from "rdf-store-stream";
import {
  ActorRdfMetadataExtract,
  IActionRdfMetadataExtract,
  IActorRdfMetadataExtractOutput,
} from "./ActorRdfMetadataExtract";
import {GraphQlQueryEngine} from "./GraphQlQueryEngine";

/**
 * An {@link ActorRdfMetadataExtract} that extracts metadata based on a GraphQL-LD query.
 *
 * It exposes the {@link #queryData} method using which a query can be applied over the metadata stream.
 * For efficiency reasons, the query (and JSON-LD context) must be passed via the actor constructor
 * so that these can be pre-compiled.
 *
 * @see ActorRdfMetadataExtract
 */
export abstract class ActorRdfMetadataExtractQuery extends ActorRdfMetadataExtract {

  private readonly queryEngine: ActorInitSparql;
  private readonly graphqlClient: GraphQlClient;
  private readonly sparqlOperation: Promise<IGraphQlToSparqlResult>;

  constructor(context: any, query: string,
              args: IActorArgs<IActionRdfMetadataExtract, IActorTest, IActorRdfMetadataExtractOutput>) {
    super(args);

    // Pre-parse GraphQL-LD query
    this.graphqlClient = new GraphQlClient({
      context,
      queryEngine: new GraphQlQueryEngine(this.queryEngine),
    });
    this.sparqlOperation = this.graphqlClient.graphQlToSparql({ query });
  }

  /**
   * Execute the configured query on the given metadata stream.
   * @param {RDF.Stream} dataStream A quad stream to query on.
   * @return The GraphQL query results.
   */
  public async queryData(dataStream: RDF.Stream, initialBindings?: any): Promise<any> {
    // Load metadata quads into store
    const store = await storeStream(dataStream);

    // Execute query against out in-memory store
    const { data } = await this.graphqlClient.query({
      ...await this.sparqlOperation,
      queryEngineOptions: { source: { type: 'rdfjsSource', value: store }, initialBindings },
    });

    return data;
  }

}

export interface IActorRdfMetadataExtractQueryArgs
  extends IActorArgs<IActionRdfMetadataExtract, IActorTest, IActorRdfMetadataExtractOutput> {
  queryEngine: ActorInitSparql;
}
