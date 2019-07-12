import {ActorRdfMetadataExtractQuery, IActionRdfMetadataExtract, IActorRdfMetadataExtractOutput,
  IActorRdfMetadataExtractQueryArgs} from "@comunica/bus-rdf-metadata-extract";
import {IActorTest} from "@comunica/core";
import * as RDF from "rdf-js";
import {parse as parseUriTemplate, UriTemplate} from "uritemplate";
import * as GRAPHQLLD_CONTEXT from "./context.json";

/**
 * An RDF Metadata Extract Actor that extracts all Hydra search forms from the metadata stream.
 */
export class ActorRdfMetadataExtractHydraControlsQuery extends ActorRdfMetadataExtractQuery {

  public static readonly GRAPHQLLD_QUERY: string = `
    query($pageUrl: String) @single(scope: all) {
      id
      graph
      subset(_: $pageUrl)
      search @plural {
        template
        mapping @optional @plural {
          variable
          property
        }
      }
    }`;

  protected readonly parsedUriTemplateCache: {[url: string]: UriTemplate} = {};

  constructor(args: IActorRdfMetadataExtractQueryArgs) {
    super(GRAPHQLLD_CONTEXT, ActorRdfMetadataExtractHydraControlsQuery.GRAPHQLLD_QUERY, args);
  }

  public async test(action: IActionRdfMetadataExtract): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionRdfMetadataExtract): Promise<IActorRdfMetadataExtractOutput> {
    return {
      metadata: {
        searchForms: this.constructHydraControls(await this.queryData(action.metadata, { '?pageUrl': action.url })),
      },
    };
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
   * Find all hydra controls within the given query results.
   * @param queryResults The query results.
   * @return The discovered Hydra search forms.
   */
  public constructHydraControls(queryResults: any): ISearchForms {
    const dataset: string = queryResults.id;
    const values: ISearchForm[] = [];
    if (queryResults.search) {
      for (const search of queryResults.search) {
        const searchTemplate: UriTemplate = this.parseUriTemplateCached(search.template);
        const mappings = (search.mapping || []).reduce((acc: any, entry: any) => {
          acc[entry.property] = entry.variable;
          return acc;
        }, {});
        const getUri = (entries: { [id: string]: string }) => {
          return searchTemplate.expand(Object.keys(entries).reduce((variables: { [id: string]: string }, key) => {
            variables[mappings[key]] = entries[key];
            return variables;
          }, {}));
        };
        values.push({
          dataset,
          getUri,
          mappings,
          template: search.template,
        });
      }
    }

    return { values };
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
  mappings: {[id: string]: string};

  /**
   * Instantiate a uri based on the given Hydra variable values.
   * @param entries Entries with as keys Hydra properties,
   *                and as values Hydra variable values.
   * @return {string} The instantiated URI
   */
  getUri(entries: {[id: string]: string}): string;
}

export interface ISearchForms {
  /**
   * All available search forms.
   */
  values: ISearchForm[];
  // TODO: in the future, a query-based search form getter should be available here.
}
