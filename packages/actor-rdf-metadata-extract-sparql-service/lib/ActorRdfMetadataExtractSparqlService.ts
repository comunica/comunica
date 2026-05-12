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
  public static SD = 'http://www.w3.org/ns/sparql-service-description#';
  public static SPARQL = 'http://www.w3.org/ns/sparql#';

  private readonly inferHttpsEndpoint: boolean;

  public constructor(args: IActorRdfMetadataExtractSparqlServiceArgs) {
    super(args);
    this.inferHttpsEndpoint = args.inferHttpsEndpoint;
  }

  public async test(_action: IActionRdfMetadataExtract): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async run(action: IActionRdfMetadataExtract): Promise<IActorRdfMetadataExtractOutput> {
    return new Promise((resolve, reject) => {
      // Forward errors
      action.metadata.on('error', reject);

      // Filter the subject URIs to consider, to avoid picking up unrelated entries
      const acceptSubjectUris = new Set<string>([ action.url ]);

      const metadata: Record<string, string | string[] | boolean> = {};
      const inputFormats = new Set<string>();
      const resultFormats = new Set<string>();
      const supportedLanguages = new Set<string>();
      const supportedVersions = new Set<string>();
      const extensionFunctions = new Set<string>();
      const propertyFeatures = new Set<string>();
      const sparql10Query = `${ActorRdfMetadataExtractSparqlService.SD}SPARQL10Query`;
      const sparql11Query = `${ActorRdfMetadataExtractSparqlService.SD}SPARQL11Query`;
      const sparqlQuery = `${ActorRdfMetadataExtractSparqlService.SD}SPARQLQuery`;
      const sparqlVersion10 = `${ActorRdfMetadataExtractSparqlService.SPARQL}version-1.0`;
      const sparqlVersion11 = `${ActorRdfMetadataExtractSparqlService.SPARQL}version-1.1`;
      const sparqlVersion12 = `${ActorRdfMetadataExtractSparqlService.SPARQL}version-1.2`;
      const sparqlVersion12Basic = `${ActorRdfMetadataExtractSparqlService.SPARQL}version-1.2-basic`;

      const addSupportedLanguage = (language: string): void => {
        supportedLanguages.add(language);
        switch (language) {
          case sparql10Query:
            supportedLanguages.add(sparqlQuery);
            supportedVersions.add(sparqlVersion10);
            break;
          case sparql11Query:
            supportedLanguages.add(sparqlQuery);
            supportedVersions.add(sparqlVersion11);
            break;
        }
      };

      const addSupportedVersion = (version: string): void => {
        supportedVersions.add(version);
        // TODO: change in next major: stop emitting sd:SPARQL10Query/sd:SPARQL11Query in supportedLanguages.
        switch (version) {
          case sparqlVersion10:
            supportedLanguages.add(sparql10Query);
            break;
          case sparqlVersion11:
          case sparqlVersion12:
          case sparqlVersion12Basic:
            supportedLanguages.add(sparql11Query);
            break;
        }
      };

      action.metadata.on('data', (quad: RDF.Quad) => {
        if (quad.predicate.value === 'http://rdfs.org/ns/void#subset' && quad.object.value === action.url) {
          // When the requested URI is a subset of another dataset, as indicated by this predicate, then also
          // consider that other dataset for the extraction of the following predicate values.
          // This works an issue with Quad Pattern Fragments that has the sd:defaultGraph predicate associated
          // with a subject value that is neither the data source URI nor the sd:defaultDataset.
          acceptSubjectUris.add(quad.subject.value);
        } else if (
          quad.subject.value === metadata.defaultDataset ||
          quad.subject.termType === 'BlankNode' ||
          acceptSubjectUris.has(quad.subject.value)
        ) {
          switch (quad.predicate.value) {
            case `${ActorRdfMetadataExtractSparqlService.SD}endpoint`:
              // The VoID specification defines this as IRI, but does not specify whether or not it can be a literal.
              // When the IRI is a literal, it can be relative, and needs to be resolved to absolute value.
              metadata.sparqlService = quad.object.termType === 'Literal' ?
                resolveIri(quad.object.value, action.url) :
                quad.object.value;
              // Also fix a common mistake in SPARQL endpoint setups where HTTPS SD's refer to a non-existing HTTP API.
              if (this.inferHttpsEndpoint && action.url.startsWith('https') && !quad.object.value.startsWith('https')) {
                metadata.sparqlService = metadata.sparqlService.replace(/^http:/u, 'https:');
              }
              break;
            case `${ActorRdfMetadataExtractSparqlService.SD}defaultDataset`:
              metadata.defaultDataset = quad.object.value;
              break;
            case `${ActorRdfMetadataExtractSparqlService.SD}defaultGraph`:
              metadata.defaultGraph = quad.object.value;
              break;
            case `${ActorRdfMetadataExtractSparqlService.SD}inputFormat`:
              inputFormats.add(quad.object.value);
              break;
            case `${ActorRdfMetadataExtractSparqlService.SD}resultFormat`:
              resultFormats.add(quad.object.value);
              break;
            case `${ActorRdfMetadataExtractSparqlService.SD}supportedLanguage`:
              addSupportedLanguage(quad.object.value);
              break;
            case `${ActorRdfMetadataExtractSparqlService.SD}supportedVersion`:
              addSupportedVersion(quad.object.value);
              break;
            case `${ActorRdfMetadataExtractSparqlService.SD}propertyFeature`:
              propertyFeatures.add(quad.object.value);
              break;
            case `${ActorRdfMetadataExtractSparqlService.SD}feature`:
              if (quad.object.value === `${ActorRdfMetadataExtractSparqlService.SD}UnionDefaultGraph`) {
                metadata.unionDefaultGraph = true;
              } else if (quad.object.value === `${ActorRdfMetadataExtractSparqlService.SD}BasicFederatedQuery`) {
                metadata.basicFederatedQuery = true;
              }
              break;
            case `${ActorRdfMetadataExtractSparqlService.SD}extensionFunction`:
              extensionFunctions.add(quad.object.value);
              break;
          }
        }
      });

      // Only return the metadata if an endpoint IRI was discovered
      action.metadata.on('end', () => {
        resolve({ metadata: {
          ...metadata,
          ...inputFormats.size > 0 ? { inputFormats: [ ...inputFormats.values() ]} : {},
          ...resultFormats.size > 0 ? { resultFormats: [ ...resultFormats.values() ]} : {},
          ...supportedLanguages.size > 0 ? { supportedLanguages: [ ...supportedLanguages.values() ]} : {},
          ...supportedVersions.size > 0 ? { supportedVersions: [ ...supportedVersions.values() ]} : {},
          ...extensionFunctions.size > 0 ? { extensionFunctions: [ ...extensionFunctions.values() ]} : {},
          ...propertyFeatures.size > 0 ? { propertyFeatures: [ ...propertyFeatures.values() ]} : {},
        }});
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
