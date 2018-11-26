import {DataSourceUtils} from "@comunica/utils-datasource";
import {ISearchForm} from "@comunica/actor-rdf-metadata-extract-hydra-controls";
import {IActionRdfDereferencePaged, IActorRdfDereferencePagedOutput} from "@comunica/bus-rdf-dereference-paged";
import {IActionRdfResolveHypermedia, IActorRdfResolveHypermediaOutput} from "@comunica/bus-rdf-resolve-hypermedia";
import {ActorRdfResolveQuadPatternSource, IActionRdfResolveQuadPattern,
  IActorRdfResolveQuadPatternOutput, ILazyQuadSource, KEY_CONTEXT_SOURCE} from "@comunica/bus-rdf-resolve-quad-pattern";
import {ActionContext, Actor, IActorArgs, IActorTest, Mediator} from "@comunica/core";
import * as RDF from "rdf-js";
import {termToString} from "rdf-string";
import {MediatedQuadSource} from "./MediatedQuadSource";

/**
 * A comunica Hypermedia RDF Resolve Quad Pattern Actor.
 */
export class ActorRdfResolveQuadPatternHypermedia extends ActorRdfResolveQuadPatternSource
   implements IActorRdfResolveQuadPatternHypermediaArgs {

  // Mediators
  public readonly mediatorRdfDereferencePaged: Mediator<Actor<IActionRdfDereferencePaged, IActorTest,
    IActorRdfDereferencePagedOutput>, IActionRdfDereferencePaged, IActorTest, IActorRdfDereferencePagedOutput>;
  public readonly mediatorRdfResolveHypermedia: Mediator<Actor<IActionRdfResolveHypermedia, IActorTest,
    IActorRdfResolveHypermediaOutput>, IActionRdfResolveHypermedia, IActorTest, IActorRdfResolveHypermediaOutput>;

  public readonly subjectUri: string;
  public readonly predicateUri: string;
  public readonly objectUri: string;
  public readonly graphUri?: string;
  protected sources: {[hypermedia: string]: Promise<RDF.Source>} = {};

  constructor(args: IActorRdfResolveQuadPatternHypermediaArgs) {
    super(args);
  }

  public async test(action: IActionRdfResolveQuadPattern): Promise<IActorTest> {
    if (!(await DataSourceUtils.singleSourceHasType(action.context, 'hypermedia'))) {
      throw new Error(
        `${this.name} requires a single source with a \'hypermedia\' entrypoint to be present in the context.`);
    }
    return true;
  }

  /**
   * Choose a Hypermedia hypermedia form.
   * @param {string} hypermedia A hypermedia URL.
   * @param {ActionContext} context An optional context.
   * @return {Promise<ISearchForm>} A promise resolving to a hypermedia form.
   */
  protected async chooseForm(hypermedia: string, context: ActionContext): Promise<ISearchForm> {
    // Mediate the hypermedia url to get a paged stream
    const firstPageMetadata: () => Promise<{[id: string]: any}> = (await this.mediatorRdfDereferencePaged
      .mediate({ context, url: hypermedia })).firstPageMetadata;
    if (!firstPageMetadata) {
      throw new Error(`No metadata was found at hypermedia entrypoint ${hypermedia}`);
    }
    const metadata: {[id: string]: any} = await firstPageMetadata();

    if (!metadata.searchForms || !metadata.searchForms.values.length) {
      throw new Error(`No Hydra search forms were discovered in the metadata of ${hypermedia}.` +
        ` You may be missing an actor that extracts this metadata`);
    }

    // Mediate the metadata to get the searchform
    const searchForm: ISearchForm = (await this.mediatorRdfResolveHypermedia.mediate({metadata, context})).searchForm;

    return searchForm;
  }

  protected async createSource(context: ActionContext): Promise<ILazyQuadSource> {
    // Determine form lazily when a URL is constructed.
    let chosenForm: Promise<ISearchForm> = null;

    // Create a quad pattern to URL converter
    const uriConstructor = async (subject?: RDF.Term, predicate?: RDF.Term, object?: RDF.Term, graph?: RDF.Term) => {
      if (!chosenForm) {
        // Collect metadata of the hypermedia
        const hypermedia: string = this.getContextSource(context).value;

        // Save the form, so it is determined only once per source.
        chosenForm = this.chooseForm(hypermedia, context);
      }

      const entries: {[id: string]: string} = {};
      const input = [
        { uri: this.subjectUri, term: subject },
        { uri: this.predicateUri, term: predicate },
        { uri: this.objectUri, term: object },
        { uri: this.graphUri, term: graph },
      ];
      for (const entry of input) {
        if (entry.uri && entry.term) {
          entries[entry.uri] = termToString(entry.term);
        }
      }

      return (await chosenForm).getUri(entries);
    };

    return new MediatedQuadSource(this.mediatorRdfDereferencePaged, uriConstructor, context);
  }

  protected async getSource(context: ActionContext): Promise<ILazyQuadSource> {
    // Cache the source object for each hypermedia entrypoint
    const hypermedia: string = this.getContextSource(context).value;
    if (this.sources[hypermedia]) {
      return this.sources[hypermedia];
    }

    // Cache and return
    return await (this.sources[hypermedia] = this.createSource(context));
  }

  protected async getOutput(source: RDF.Source, pattern: RDF.Quad, context: ActionContext)
  : Promise<IActorRdfResolveQuadPatternOutput> {
    // Attach metadata to the output
    const output: IActorRdfResolveQuadPatternOutput = await super.getOutput(source, pattern, context);
    output.metadata = () => new Promise((resolve, reject) => {
      output.data.on('error', reject);
      output.data.on('end', () => reject(new Error('No metadata was found')));
      output.data.on('metadata', (metadata) => {
        resolve(metadata());
      });
    });
    return output;
  }

}

export interface IActorRdfResolveQuadPatternHypermediaArgs extends
  IActorArgs<IActionRdfResolveQuadPattern, IActorTest, IActorRdfResolveQuadPatternOutput> {

  mediatorRdfDereferencePaged: Mediator<Actor<IActionRdfDereferencePaged, IActorTest, IActorRdfDereferencePagedOutput>,
    IActionRdfDereferencePaged, IActorTest, IActorRdfDereferencePagedOutput>;

  mediatorRdfResolveHypermedia: Mediator<Actor<IActionRdfResolveHypermedia, IActorTest,
    IActorRdfResolveHypermediaOutput>, IActionRdfResolveHypermedia, IActorTest, IActorRdfResolveHypermediaOutput>;

  subjectUri: string;
  predicateUri: string;
  objectUri: string;
  graphUri?: string;
}
