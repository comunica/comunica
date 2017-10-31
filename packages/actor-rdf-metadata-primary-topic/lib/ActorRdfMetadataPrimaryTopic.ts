import {ActorRdfMetadataQuadPredicate, IActionRdfMetadata, IActorRdfMetadataOutput} from "@comunica/bus-rdf-metadata";
import {IActorArgs, IActorTest} from "@comunica/core";
import * as RDF from "rdf-js";

/**
 * An RDF Metadata Actor that splits off the metadata based on the existence of a 'foaf:primaryTopic' link.
 * Only non-triple quad streams are supported.
 */
export class ActorRdfMetadataPrimaryTopic extends ActorRdfMetadataQuadPredicate {

  constructor(args: IActorArgs<IActionRdfMetadata, IActorTest, IActorRdfMetadataOutput>) {
    super(args);
  }

  public async test(action: IActionRdfMetadata): Promise<IActorTest> {
    if (action.triples) {
      throw new Error('This actor only supports non-triple quad streams.');
    }
    return true;
  }

  public isMetadata(quad: RDF.Quad, pageUrl: string, context: any): boolean {
    if (!context.metadataGraph && quad.predicate.value === 'http://xmlns.com/foaf/0.1/primaryTopic') {
      context.metadataGraph = quad.subject.value;
    }
    return context.metadataGraph && quad.graph.value === context.metadataGraph;
  }

}
