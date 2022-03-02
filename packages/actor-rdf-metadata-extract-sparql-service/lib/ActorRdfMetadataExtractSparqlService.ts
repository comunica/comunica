import type { IActionRdfMetadataExtract, IActorRdfMetadataExtractOutput,
  IActorRdfMetadataExtractArgs } from '@comunica/bus-rdf-metadata-extract';
import { ActorRdfMetadataExtract } from '@comunica/bus-rdf-metadata-extract';
import type { IActorTest } from '@comunica/core';
import { resolve as resolveIri } from 'relative-to-absolute-iri';

/**
 * A comunica RDF Metadata Extract Actor for SPARQL service descriptions.
 */
export class ActorRdfMetadataExtractSparqlService extends ActorRdfMetadataExtract {
  private readonly inferHttpsEndpoint: boolean;

  public constructor(args: IActorRdfMetadataExtractSparqlServiceArgs) {
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
      const metadata: any = {};
      action.metadata.on('data', quad => {
        if (quad.predicate.value === 'http://www.w3.org/ns/sparql-service-description#endpoint' &&
          (quad.subject.termType === 'BlankNode' || quad.subject.value === action.url)) {
          metadata.sparqlService = quad.object.termType === 'Literal' ?
            resolveIri(quad.object.value, action.url) :
            quad.object.value;

          // Fix a common mistake in SPARQL endpoint setups where HTTPS SD's refer to a non-existing HTTP API
          if (this.inferHttpsEndpoint &&
            action.url.startsWith('https') && !metadata.sparqlService.startsWith('https')) {
            metadata.sparqlService = metadata.sparqlService.replace('http:', 'https:');
          }
        } else if (quad.predicate.value === 'http://www.w3.org/ns/sparql-service-description#defaultGraph') {
          metadata.defaultGraph = quad.object.value;
        }
      });

      // If no value has been found, emit nothing.
      action.metadata.on('end', () => {
        resolve({ metadata });
      });
    });
  }
}

export interface IActorRdfMetadataExtractSparqlServiceArgs extends IActorRdfMetadataExtractArgs {
  /**
   * If HTTPS endpoints should be forcefully used if the original URL was HTTPS-based
   * @default {true}
   */
  inferHttpsEndpoint: boolean;
}
