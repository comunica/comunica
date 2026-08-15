import type {
  IActionRdfMetadataExtract,
  IActorRdfMetadataExtractOutput,
  IActorRdfMetadataExtractArgs,
} from '@comunica/bus-rdf-metadata-extract';
import { ActorRdfMetadataExtract } from '@comunica/bus-rdf-metadata-extract';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { UriTemplate } from 'uritemplate';
import { parse as parseUriTemplate } from 'uritemplate';

/**
 * The protocols that servers commonly mix up, mapped to the protocol they may have been mixed up with.
 */
const PROTOCOL_ALTERNATIVES: Record<string, string> = {
  'http:': 'https:',
  'https:': 'http:',
};

/**
 * An RDF Metadata Extract Actor that extracts all Hydra controls from the metadata stream.
 */
export class ActorRdfMetadataExtractHydraControls extends ActorRdfMetadataExtract {
  public static readonly HYDRA: string = 'http://www.w3.org/ns/hydra/core#';
  public static readonly LINK_TYPES: string[] = [ 'first', 'next', 'previous', 'last' ];
  protected readonly parsedUriTemplateCache: Record<string, UriTemplate> = {};

  public constructor(args: IActorRdfMetadataExtractArgs) {
    super(args);
  }

  public async test(_action: IActionRdfMetadataExtract): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  /**
   * Collect all Hydra page links from the given Hydra properties object.
   * @param pageUrl The page URL in which the Hydra properties are defined.
   * @param hydraProperties The collected Hydra properties.
   * @return The Hydra links
   */
  public getLinks(pageUrl: string, hydraProperties: Record<string, Record<string, string[]>>):
  Record<string, any> {
    return Object.fromEntries(ActorRdfMetadataExtractHydraControls.LINK_TYPES.map((link) => {
      // First check the correct hydra:next, then the deprecated hydra:nextPage
      const links = hydraProperties[link] || hydraProperties[`${link}Page`];
      const linkTargets = links && links[pageUrl];
      return [ link, linkTargets && linkTargets.length > 0 ? [ linkTargets[0] ] : [] ];
    }));
  }

  /**
   * Determine the origin under which the given page URL is exposed,
   * together with the origin that servers with an invalidly configured base URL may expose it under.
   *
   * Concretely, the invalid origin is the origin of the page URL with the http and https protocols swapped.
   * @param pageUrl The page URL in which the Hydra properties are defined.
   * @return The valid and invalid origin, or undefined if the page URL is not an http(s) URL.
   */
  public getProtocolMismatchOrigins(pageUrl: string): { valid: string; invalid: string } | undefined {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(pageUrl);
    } catch {
      return;
    }
    const alternativeProtocol = PROTOCOL_ALTERNATIVES[parsedUrl.protocol];
    if (alternativeProtocol) {
      return {
        valid: `${parsedUrl.protocol}//${parsedUrl.host}`,
        invalid: `${alternativeProtocol}//${parsedUrl.host}`,
      };
    }
  }

  /**
   * Correct all URLs within the given Hydra properties that are exposed
   * under another protocol (http/https) than the page they were retrieved from.
   *
   * Occasionally, TPF servers are hosted over https, while their base URL is configured as http (or vice-versa).
   * This causes all URLs in their metadata to be exposed under an invalid protocol,
   * which makes the Hydra controls unusable, as they can not be linked to the current page anymore.
   * Since this is a common problem, we detect it, correct the invalid URLs, and emit a warning.
   * @param pageUrl The page URL in which the Hydra properties are defined.
   * @param hydraProperties The collected Hydra properties.
   * @param context The action context, in which a warning will be logged upon detecting an invalid protocol.
   * @return The Hydra properties, with all invalidly exposed URLs corrected.
   */
  public correctProtocolMismatches(
    pageUrl: string,
    hydraProperties: Record<string, Record<string, string[]>>,
    context: IActionContext,
  ): Record<string, Record<string, string[]>> {
    const origins = this.getProtocolMismatchOrigins(pageUrl);
    if (!origins) {
      return hydraProperties;
    }

    // Rewrite all URLs that are exposed under the invalid origin, and remember if any of them were found.
    let mismatchDetected = false;
    const correctUrl = (url: string): string => {
      // Only consider URLs for which the invalid origin is followed by a path, query, fragment, or nothing at all,
      // so that hosts that merely start with the same characters are not corrected.
      if (url.startsWith(origins.invalid) &&
        (url.length === origins.invalid.length || '/?#'.includes(url[origins.invalid.length]))) {
        mismatchDetected = true;
        return origins.valid + url.slice(origins.invalid.length);
      }
      return url;
    };
    const correctedHydraProperties: Record<string, Record<string, string[]>> = {};
    for (const [ property, subjects ] of Object.entries(hydraProperties)) {
      const correctedSubjects: Record<string, string[]> = correctedHydraProperties[property] = {};
      for (const [ subject, objects ] of Object.entries(subjects)) {
        const correctedSubject = correctUrl(subject);
        // Merge with any existing entries, as the metadata may expose the same URL under both protocols
        correctedSubjects[correctedSubject] = [
          ...correctedSubjects[correctedSubject] ?? [],
          ...objects.map(object => correctUrl(object)),
        ];
      }
    }

    if (!mismatchDetected) {
      return hydraProperties;
    }
    this.logWarn(context, `Invalid metadata detected in ${pageUrl}: controls are exposed under ${origins.invalid} instead of ${origins.valid}. These have been corrected, but the server should be reconfigured with a valid base URL.`);
    return correctedHydraProperties;
  }

  /**
   * Parse a URI template, or retrieve it from a cache.
   * @param {string} template A URI template string.
   * @return {} A parsed URI template object.
   */
  public parseUriTemplateCached(template: string): UriTemplate {
    const cachedUriTemplate: UriTemplate = this.parsedUriTemplateCache[template];
    if (cachedUriTemplate) {
      return cachedUriTemplate;
    }

    return this.parsedUriTemplateCache[template] = parseUriTemplate(template);
  }

  /**
   * Collect all search forms from the given Hydra properties object.
   * @param hydraProperties The collected Hydra properties.
   * @return The search forms.
   */
  public getSearchForms(hydraProperties: Record<string, Record<string, string[]>>): ISearchForms {
    const searchFormData: Record<string, string[]> = hydraProperties.search;
    const searchForms: ISearchForm[] = [];
    if (searchFormData) {
      for (const dataset in searchFormData) {
        for (const searchFormId of searchFormData[dataset]) {
          const searchTemplates = (hydraProperties.template || {})[searchFormId] || [];

          // Parse the template
          if (searchTemplates.length !== 1) {
            throw new Error(`Expected 1 hydra:template for ${searchFormId}`);
          }
          const template: string = searchTemplates[0];
          const searchTemplate: UriTemplate = this.parseUriTemplateCached(template);

          // Parse the template mappings
          const mappings: Record<string, string> = Object
            .fromEntries(((hydraProperties.mapping || {})[searchFormId] || [])
              .map((mapping) => {
                const variable = ((hydraProperties.variable || {})[mapping] || [])[0];
                const property = ((hydraProperties.property || {})[mapping] || [])[0];
                if (!variable) {
                  throw new Error(`Expected a hydra:variable for ${mapping}`);
                }
                if (!property) {
                  throw new Error(`Expected a hydra:property for ${mapping}`);
                }
                return [ property, variable ];
              }));

          // Gets the URL of the Triple Pattern Fragment with the given triple pattern
          const getUri = (entries: Record<string, string>): string => searchTemplate
            .expand(Object.fromEntries(Object.keys(entries).map(key => [ mappings[key], entries[key] ])));

          searchForms.push({ dataset, template, mappings, getUri });
        }
      }
    }
    return { values: searchForms };
  }

  /**
   * Collect all hydra properties from a given metadata stream
   * in a nice convenient nested hash (property / subject / objects).
   * @param {RDF.Stream} metadata
   * @return The collected Hydra properties.
   */
  public getHydraProperties(metadata: RDF.Stream): Promise<Record<string, Record<string, string[]>>> {
    return new Promise((resolve, reject) => {
      metadata.on('error', reject);

      // Collect all hydra properties in a nice convenient nested hash (property / subject / objects).
      const hydraProperties: Record<string, Record<string, string[]>> = {};
      metadata.on('data', (quad) => {
        if (quad.predicate.value.startsWith(ActorRdfMetadataExtractHydraControls.HYDRA)) {
          const property = quad.predicate.value.slice(ActorRdfMetadataExtractHydraControls.HYDRA.length);
          const subjectProperties = hydraProperties[property] || (hydraProperties[property] = {});
          const objects = subjectProperties[quad.subject.value] || (subjectProperties[quad.subject.value] = []);
          objects.push(quad.object.value);
        }
      });

      metadata.on('end', () => resolve(hydraProperties));
    });
  }

  public async run(action: IActionRdfMetadataExtract): Promise<IActorRdfMetadataExtractOutput> {
    const metadata: IActorRdfMetadataExtractOutput['metadata'] = {};
    const hydraProperties = this.correctProtocolMismatches(
      action.url,
      await this.getHydraProperties(action.metadata),
      action.context,
    );
    Object.assign(metadata, this.getLinks(action.url, hydraProperties));
    metadata.searchForms = this.getSearchForms(hydraProperties);
    return { metadata };
  }
}

export interface ISearchForm {
  /**
   * The dataset in which the search form is defined.
   */
  dataset: string;
  /**
   * The URI template containing Hydra variables.
   */
  template: string;
  /**
   * The mappings.
   * With as keys the Hydra properties,
   * and as values the Hydra variables
   */
  mappings: Record<string, string>;

  /**
   * Instantiate a uri based on the given Hydra variable values.
   * @param entries Entries with as keys Hydra properties,
   *                and as values Hydra variable values.
   * @return {string} The instantiated URI
   */
  getUri: (entries: Record<string, string>) => string;
}

export interface ISearchForms {
  /**
   * All available search forms.
   */
  values: ISearchForm[];
}
