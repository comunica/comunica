import type {
  IActionRdfMetadataExtract,
  IActorRdfMetadataExtractOutput,
  IActorRdfMetadataExtractArgs,
} from '@comunica/bus-rdf-metadata-extract';
import { ActorRdfMetadataExtract } from '@comunica/bus-rdf-metadata-extract';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type * as RDF from '@rdfjs/types';
import { resolve as resolveIri } from 'relative-to-absolute-iri';

/**
 * Comunica RDF metadata extract actor for SPARQL Service Descriptions.
 */
export class ActorRdfMetadataExtractSparqlService extends ActorRdfMetadataExtract {
  private readonly inferHttpsEndpoint: boolean;

  public constructor(args: IActorRdfMetadataExtractSparqlServiceArgs) {
    super(args);
  }

  public async test(_action: IActionRdfMetadataExtract): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async run(action: IActionRdfMetadataExtract): Promise<IActorRdfMetadataExtractOutput> {
    return new Promise((resolve, reject) => {
      // Forward errors
      action.metadata.on('error', reject);

      const metadata: Record<string, string | string[] | boolean> = {};
      const inputFormats = new Set<string>();
      const resultFormats = new Set<string>();
      const supportedLanguages = new Set<string>();

      action.metadata.on('data', (quad: RDF.Quad) => {
        if (
          quad.subject.termType === 'BlankNode' ||
          quad.subject.value === action.url ||
          quad.subject.value === metadata.defaultDataset
        ) {
          switch (quad.predicate.value) {
            case 'http://www.w3.org/ns/sparql-service-description#endpoint':
              // The specification says the endpoint is an IRI, but does not specify whether or not it can be a literal.
              // When the IRI is a literal, it can be relative, and needs to be resolved to absolute.
              metadata.sparqlService = quad.object.termType === 'Literal' ?
                resolveIri(quad.object.value, action.url) :
                quad.object.value;
              // Also fix a common mistake in SPARQL endpoint setups where HTTPS SD's refer to a non-existing HTTP API.
              if (this.inferHttpsEndpoint && action.url.startsWith('https') && !quad.object.value.startsWith('https')) {
                metadata.sparqlService = metadata.sparqlService.replace(/^http:/u, 'https:');
              }
              break;
            case 'http://www.w3.org/ns/sparql-service-description#defaultDataset':
              metadata.defaultDataset = quad.object.value;
              break;
            case 'http://www.w3.org/ns/sparql-service-description#defaultGraph':
              metadata.defaultGraph = quad.object.value;
              break;
            case 'http://www.w3.org/ns/sparql-service-description#inputFormat':
              inputFormats.add(quad.object.value);
              break;
            case 'http://www.w3.org/ns/sparql-service-description#resultFormat':
              resultFormats.add(quad.object.value);
              break;
            case 'http://www.w3.org/ns/sparql-service-description#supportedLanguage':
              supportedLanguages.add(quad.object.value);
              break;
            case 'http://www.w3.org/ns/sparql-service-description#feature':
              if (quad.object.value === 'http://www.w3.org/ns/sparql-service-description#UnionDefaultGraph') {
                metadata.unionDefaultGraph = true;
              } else if (quad.object.value === 'http://www.w3.org/ns/sparql-service-description#BasicFederatedQuery') {
                metadata.basicFederatedQuery = true;
              }
              break;
          }
        }
      });

      // Only return the metadata if an endpoint IRI was discovered
      action.metadata.on('end', () => {
        resolve({ metadata: metadata.sparqlService ?
            {
              ...metadata,
              ...inputFormats.size > 0 ? { inputFormats: [ ...inputFormats.values() ]} : {},
              ...resultFormats.size > 0 ? { resultFormats: [ ...resultFormats.values() ]} : {},
              ...supportedLanguages.size > 0 ? { supportedLanguages: [ ...supportedLanguages.values() ]} : {},
            } :
            {},
        });
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
