import {ISearchForm, ISearchForms} from "@comunica/actor-rdf-metadata-extract-hydra-controls";
import {IActionRdfDereference, IActorRdfDereferenceOutput} from "@comunica/bus-rdf-dereference";
import {IActionRdfMetadata, IActorRdfMetadataOutput} from "@comunica/bus-rdf-metadata";
import {IActionRdfMetadataExtract, IActorRdfMetadataExtractOutput} from "@comunica/bus-rdf-metadata-extract";
import {ActionContext, Actor, IActorTest, Mediator} from "@comunica/core";
import {AsyncIterator} from "asynciterator";
import {PromiseProxyIterator} from "asynciterator-promiseproxy";
import * as RDF from "rdf-js";
import {termToString} from "rdf-string";
import {matchPattern, TRIPLE_TERM_NAMES} from "rdf-terms";

/**
 * An RDF source that executes a quad pattern over a QPF interface and fetches its first page.
 */
export class RdfSourceQpf implements RDF.Source {

  public readonly searchForm: ISearchForm;

  private readonly mediatorMetadata: Mediator<Actor<IActionRdfMetadata, IActorTest, IActorRdfMetadataOutput>,
    IActionRdfMetadata, IActorTest, IActorRdfMetadataOutput>;
  private readonly mediatorMetadataExtract: Mediator<Actor<IActionRdfMetadataExtract, IActorTest,
    IActorRdfMetadataExtractOutput>, IActionRdfMetadataExtract, IActorTest, IActorRdfMetadataExtractOutput>;
  private readonly mediatorRdfDereference: Mediator<Actor<IActionRdfDereference, IActorTest,
    IActorRdfDereferenceOutput>, IActionRdfDereference, IActorTest, IActorRdfDereferenceOutput>;
  private readonly subjectUri: string;
  private readonly predicateUri: string;
  private readonly objectUri: string;
  private readonly graphUri?: string;
  private readonly context: ActionContext;
  private readonly cachedQuads: {[patternId: string]: AsyncIterator<RDF.Quad>};

  constructor(mediatorMetadata: Mediator<Actor<IActionRdfMetadata, IActorTest, IActorRdfMetadataOutput>,
                IActionRdfMetadata, IActorTest, IActorRdfMetadataOutput>,
              mediatorMetadataExtract: Mediator<Actor<IActionRdfMetadataExtract, IActorTest,
                IActorRdfMetadataExtractOutput>, IActionRdfMetadataExtract, IActorTest, IActorRdfMetadataExtractOutput>,
              mediatorRdfDereference: Mediator<Actor<IActionRdfDereference, IActorTest,
                IActorRdfDereferenceOutput>, IActionRdfDereference, IActorTest, IActorRdfDereferenceOutput>,
              subjectUri: string, predicateUri: string, objectUri: string, graphUri: string,
              metadata: {[id: string]: any}, context: ActionContext, initialQuads?: RDF.Stream) {
    this.mediatorMetadata = mediatorMetadata;
    this.mediatorMetadataExtract = mediatorMetadataExtract;
    this.mediatorRdfDereference = mediatorRdfDereference;
    this.subjectUri = subjectUri;
    this.predicateUri = predicateUri;
    this.objectUri = objectUri;
    this.graphUri = graphUri;
    this.context = context;
    this.cachedQuads = {};
    this.searchForm = this.getSearchForm(metadata);
    if (initialQuads) {
      const wrappedQuads = (<any> AsyncIterator).wrap(initialQuads);
      wrappedQuads.setProperty('metadata', metadata);
      this.cacheQuads(wrappedQuads);
    }
  }

  /**
   * Get a first QPF search form.
   * @param {{[p: string]: any}} metadata A metadata object.
   * @return {ISearchForm} A search form, or null if none could be found.
   */
  public getSearchForm(metadata: {[id: string]: any}): ISearchForm {
    if (!metadata.searchForms || !metadata.searchForms.values) {
      return null;
    }

    // Find a quad pattern or triple pattern search form
    const searchForms: ISearchForms = metadata.searchForms;

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

    return null;
  }

  /**
   * Create a QPF fragment IRI for the given quad pattern.
   * @param {ISearchForm} searchForm A search form.
   * @param {Term} subject A term or null.
   * @param {Term} predicate A term or null.
   * @param {Term} object A term or null.
   * @param {Term} graph A term or null.
   * @return {string} A URI.
   */
  public createFragmentUri(searchForm: ISearchForm,
                           subject: RDF.Term, predicate: RDF.Term, object: RDF.Term, graph: RDF.Term): string {
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
    return searchForm.getUri(entries);
  }

  /**
   * A helper function to find a hash with quad elements that have duplicate variables.
   *
   * @param {RDF.Term} subject An optional subject term.
   * @param {RDF.Term} predicate An optional predicate term.
   * @param {RDF.Term} object An optional object term.
   * @param {RDF.Term} graph An optional graph term.
   *
   * @return {{[p: string]: string[]}} If no equal variable names are present in the four terms, this returns null.
   *                                   Otherwise, this maps quad elements ('subject', 'predicate', 'object', 'graph')
   *                                   to the list of quad elements it shares a variable name with.
   *                                   If no links for a certain element exist, this element will
   *                                   not be included in the hash.
   *                                   Note 1: Quad elements will never have a link to themselves.
   *                                           So this can never occur: { subject: [ 'subject'] },
   *                                           instead 'null' would be returned.
   *                                   Note 2: Links only exist in one direction,
   *                                           this means that { subject: [ 'predicate'], predicate: [ 'subject' ] }
   *                                           will not occur, instead only { subject: [ 'predicate'] }
   *                                           will be returned.
   */
  public getDuplicateElementLinks(subject?: RDF.Term, predicate?: RDF.Term, object?: RDF.Term, graph?: RDF.Term)
  : {[element: string]: string[]} {
    // Collect a variable to quad elements mapping.
    const variableElements: {[variableName: string]: string[]} = {};
    let duplicateVariables = false;
    const input: { [id: string]: RDF.Term } = { subject, predicate, object, graph };
    for (const key in input) {
      if (input[key] && input[key].termType === 'Variable') {
        const val = termToString(input[key]);
        const length = (variableElements[val] || (variableElements[val] = [])).push(key);
        duplicateVariables = duplicateVariables || length > 1;
      }
    }

    if (!duplicateVariables) {
      return null;
    }

    // Collect quad element to elements with equal variables mapping.
    const duplicateElementLinks: {[element: string]: string[]} = {};
    for (const variable in variableElements) {
      const elements = variableElements[variable];
      const remainingElements = elements.slice(1);
      // Only store the elements that have at least one equal element.
      if (remainingElements.length) {
        duplicateElementLinks[elements[0]] = remainingElements;
      }
    }

    return duplicateElementLinks;
  }

  public match(subject?: RegExp | RDF.Term,
               predicate?: RegExp | RDF.Term,
               object?: RegExp | RDF.Term,
               graph?: RegExp | RDF.Term): RDF.Stream {
    if (subject instanceof RegExp
      || predicate  instanceof RegExp
      || object instanceof RegExp
      || graph instanceof RegExp) {
      throw new Error("RdfSourceQpf does not support matching by regular expressions.");
    }

    // Try to emit from cache
    const cached = this.getCachedQuads(subject, predicate, object, graph);
    if (cached) {
      return cached;
    }

    const quads = new PromiseProxyIterator(async () => {
      let url: string = await this.createFragmentUri(this.searchForm, subject, predicate, object, graph);
      const rdfDereferenceOutput = await this.mediatorRdfDereference.mediate({ context: this.context, url });
      url = rdfDereferenceOutput.url;

      // Determine the metadata and emit it
      const rdfMetadataOuput: IActorRdfMetadataOutput = await this.mediatorMetadata.mediate(
        { context: this.context, url, quads: rdfDereferenceOutput.quads, triples: rdfDereferenceOutput.triples });
      this.mediatorMetadataExtract
        .mediate({ context: this.context, url, metadata: rdfMetadataOuput.metadata })
        .then(({ metadata }) => {
          quads.setProperty('metadata', metadata);
          quads.emit('metadata', metadata);
        });

      // The server is free to send any data in its response (such as metadata),
      // including quads that do not match the given matter.
      // Therefore, we have to filter away all non-matching quads here.
      let filteredOutput: AsyncIterator<RDF.Quad> = (<any> AsyncIterator).wrap(rdfMetadataOuput.data)
        .filter((quad: RDF.Quad) => matchPattern(quad, subject, predicate, object, graph));

      // Detect duplicate variables in the pattern
      const duplicateElementLinks: { [element: string]: string[] } = this
        .getDuplicateElementLinks(subject, predicate, object, graph);

      // If there are duplicate variables in the search pattern,
      // make sure that we filter out the triples that don't have equal values for those triple elements,
      // as QPF ignores variable names.
      if (duplicateElementLinks) {
        filteredOutput = filteredOutput.filter((quad) => {
          // No need to check the graph, because an equal element already would have to be found in s, p, or o.
          for (const element1 of TRIPLE_TERM_NAMES) {
            for (const element2 of (duplicateElementLinks[element1] || [])) {
              if (!(<any> quad)[element1].equals((<any> quad)[element2])) {
                return false;
              }
            }
          }
          return true;
        });
      }

      return filteredOutput;
    });

    this.cacheQuads(quads, subject, predicate, object, graph);
    return this.getCachedQuads(subject, predicate, object, graph);
  }

  protected getPatternId(subject?: RDF.Term, predicate?: RDF.Term, object?: RDF.Term, graph?: RDF.Term): string {
    // tslint:disable:object-literal-sort-keys
    return JSON.stringify({
      s: termToString(subject),
      p: termToString(predicate),
      o: termToString(object),
      g: termToString(graph),
    });
    // tslint:enable:object-literal-sort-keys
  }

  protected cacheQuads(quads: AsyncIterator<RDF.Quad>,
                       subject?: RDF.Term, predicate?: RDF.Term, object?: RDF.Term, graph?: RDF.Term) {
    const patternId = this.getPatternId(subject, predicate, object, graph);
    this.cachedQuads[patternId] = quads.clone();
  }

  protected getCachedQuads(subject?: RDF.Term, predicate?: RDF.Term, object?: RDF.Term, graph?: RDF.Term)
    : AsyncIterator<RDF.Quad> {
    const patternId = this.getPatternId(subject, predicate, object, graph);
    let quads = this.cachedQuads[patternId];
    if (quads) {
      quads = quads.clone();
      quads.getProperty('metadata', (metadata) => quads.emit('metadata', metadata));
      return quads;
    }
    return null;
  }

}
