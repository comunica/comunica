import {ISearchForm, ISearchForms} from "@comunica/actor-rdf-metadata-extract-hydra-controls";
import {IActionRdfDereferencePaged, IActorRdfDereferencePagedOutput} from "@comunica/bus-rdf-dereference-paged";
import {ActorRdfResolveQuadPatternSource, IActionRdfResolveQuadPattern,
  IActorRdfResolveQuadPatternOutput, ILazyQuadSource} from "@comunica/bus-rdf-resolve-quad-pattern";
import {Actor, IActorArgs, IActorTest, Mediator} from "@comunica/core";
import * as RDF from "rdf-js";
import {termToString} from "rdf-string";
import {MediatedQuadSource} from "./MediatedQuadSource";

/**
 * A comunica QPF RDF Resolve Quad Pattern Actor.
 */
export class ActorRdfResolveQuadPatternQpf extends ActorRdfResolveQuadPatternSource
   implements IActorRdfResolveQuadPatternQpfArgs {

  public readonly mediatorRdfDereferencePaged: Mediator<Actor<IActionRdfDereferencePaged, IActorTest,
    IActorRdfDereferencePagedOutput>, IActionRdfDereferencePaged, IActorTest, IActorRdfDereferencePagedOutput>;
  public readonly subjectUri: string;
  public readonly predicateUri: string;
  public readonly objectUri: string;
  public readonly graphUri?: string;
  protected sources: {[hypermedia: string]: Promise<RDF.Source>} = {};

  constructor(args: IActorRdfResolveQuadPatternQpfArgs) {
    super(args);
  }

  public async test(action: IActionRdfResolveQuadPattern): Promise<IActorTest> {
    if (!action.context || !action.context.sources || action.context.sources.length !== 1
        || action.context.sources[0].type !== 'hypermedia' || !action.context.sources[0].value) {
      throw new Error(this.name
        + ' requires a single source with a QPF \'hypermedia\' entrypoint to be present in the context.');
    }
    return true;
  }

  /**
   * Choose a QPF hypermedia form.
   * @param {string} hypermedia A hypermedia URL.
   * @return {Promise<ISearchForm>} A promise resolving to a hypermedia form.
   */
  protected async chooseForm(hypermedia: string): Promise<ISearchForm> {
    const firstPageMetadata: () => Promise<{[id: string]: any}> = (await this.mediatorRdfDereferencePaged
      .mediate({ url: hypermedia })).firstPageMetadata;
    if (!firstPageMetadata) {
      throw new Error('No metadata was found at hypermedia entrypoint ' + hypermedia);
    }
    const metadata: {[id: string]: any} = await firstPageMetadata();

    // Find a quad pattern or triple pattern search form
    const searchForms: ISearchForms = metadata.searchForms;
    if (!searchForms || !searchForms.values.length) {
      throw new Error('No Hydra search forms were discovered in the metadata of ' + hypermedia
        + '. You may be missing an actor that extracts this metadata');
    }

    // TODO: in the future, a query-based search form getter should be used.
    for (const searchForm of searchForms.values) {
      if (this.graphUri
        && this.subjectUri in searchForm.mappings
        && this.predicateUri in searchForm.mappings
        && this.objectUri in searchForm.mappings
        && this.graphUri in searchForm.mappings
        && Object.keys(searchForm.mappings).length === 4) {
        return searchForm;
      }
      if (this.subjectUri in searchForm.mappings
        && this.predicateUri in searchForm.mappings
        && this.objectUri in searchForm.mappings
        && Object.keys(searchForm.mappings).length === 3) {
        return searchForm;
      }
    }

    throw new Error('No valid Hydra search form was found for quad pattern or triple pattern queries.');
  }

  protected async createSource(context?: {[id: string]: any}): Promise<ILazyQuadSource> {
    // Determine form lazily when a URL is constructed.
    let chosenForm: Promise<ISearchForm> = null;

    // Create a quad pattern to URL converter
    const uriConstructor = async (subject?: RDF.Term, predicate?: RDF.Term, object?: RDF.Term, graph?: RDF.Term) => {
      if (!chosenForm) {
        // Collect metadata of the hypermedia
        const hypermedia: string = context.sources[0].value;

        // Save the form, so it is determined only once per source.
        chosenForm = this.chooseForm(hypermedia);
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
          if (entry.term.termType === 'NamedNode' || entry.term.termType === 'Literal') {
            entries[entry.uri] = termToString(entry.term);
          }
        }
      }

      return (await chosenForm).getUri(entries);
    };

    return new MediatedQuadSource(this.mediatorRdfDereferencePaged, uriConstructor);
  }

  protected async getSource(context?: {[id: string]: any}): Promise<ILazyQuadSource> {
    // Cache the source object for each hypermedia entrypoint
    const hypermedia: string = context.sources[0].value;
    if (this.sources[hypermedia]) {
      return this.sources[hypermedia];
    }

    // Cache and return
    return await (this.sources[hypermedia] = this.createSource(context));
  }

  protected async getOutput(source: RDF.Source, pattern: RDF.Quad, context?: {[id: string]: any})
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

export interface IActorRdfResolveQuadPatternQpfArgs extends
  IActorArgs<IActionRdfResolveQuadPattern, IActorTest, IActorRdfResolveQuadPatternOutput> {
  mediatorRdfDereferencePaged: Mediator<Actor<IActionRdfDereferencePaged, IActorTest, IActorRdfDereferencePagedOutput>,
    IActionRdfDereferencePaged, IActorTest, IActorRdfDereferencePagedOutput>;
  subjectUri: string;
  predicateUri: string;
  objectUri: string;
  graphUri?: string;
}
