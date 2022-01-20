import type { IActionRdfMetadataExtract,
  IActorRdfMetadataExtractOutput, IActorRdfMetadataExtractArgs } from '@comunica/bus-rdf-metadata-extract';
import { ActorRdfMetadataExtract } from '@comunica/bus-rdf-metadata-extract';
import type { IActorTest } from '@comunica/core';
import type * as RDF from '@rdfjs/types';
import type { UriTemplate } from 'uritemplate';
import { parse as parseUriTemplate } from 'uritemplate';

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

  public async test(action: IActionRdfMetadataExtract): Promise<IActorTest> {
    return true;
  }

  /**
   * Collect all Hydra page links from the given Hydra properties object.
   * @param pageUrl The page URL in which the Hydra properties are defined.
   * @param hydraProperties The collected Hydra properties.
   * @return The Hydra links
   */
  public getLinks(pageUrl: string, hydraProperties: Record<string, Record<string, string[]>>):
  Record<string, any> {
    return Object.fromEntries(ActorRdfMetadataExtractHydraControls.LINK_TYPES.map(link => {
      // First check the correct hydra:next, then the deprecated hydra:nextPage
      const links = hydraProperties[link] || hydraProperties[`${link}Page`];
      const linkTargets = links && links[pageUrl];
      return [ link, linkTargets && linkTargets.length > 0 ? linkTargets[0] : null ];
    }));
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
    // eslint-disable-next-line no-return-assign
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
              .map(mapping => {
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
      metadata.on('data', quad => {
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
    const hydraProperties = await this.getHydraProperties(action.metadata);
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
