import {ActorRdfMetadataExtract,
  IActionRdfMetadataExtract, IActorRdfMetadataExtractOutput} from "@comunica/bus-rdf-metadata-extract";
import {IActorArgs, IActorTest} from "@comunica/core";
import {resolve as resolveIri} from "relative-to-absolute-iri";

/**
 * A comunica RDF Metadata Extract Actor for SPARQL service descriptions.
 */
export class ActorRdfMetadataExtractSparqlService extends ActorRdfMetadataExtract {

  constructor(args: IActorArgs<IActionRdfMetadataExtract, IActorTest, IActorRdfMetadataExtractOutput>) {
    super(args);
  }

  public async test(action: IActionRdfMetadataExtract): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionRdfMetadataExtract): Promise<IActorRdfMetadataExtractOutput> {
    return new Promise((resolve, reject) => {
      // Forward errors
      action.metadata.on('error', reject);

      // Immediately resolve when a SPARQL service endpoint URL has been found
      action.metadata.on('data', (quad) => {
        if (quad.predicate.value === 'http://www.w3.org/ns/sparql-service-description#endpoint'
          && (quad.subject.termType === 'BlankNode' || quad.subject.value === action.url)) {
          resolve({ metadata: { sparqlService: resolveIri(quad.object.value, action.url) }});
        }
      });

      // If no value has been found, emit nothing.
      action.metadata.on('end', () => {
        resolve({ metadata: {} });
      });
    });
  }

}
