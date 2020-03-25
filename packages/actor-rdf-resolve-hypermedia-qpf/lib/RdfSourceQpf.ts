import {ISearchForm, ISearchForms} from "@comunica/actor-rdf-metadata-extract-hydra-controls";
import {IActionRdfDereference, IActorRdfDereferenceOutput} from "@comunica/bus-rdf-dereference";
import {IActionRdfMetadata, IActorRdfMetadataOutput} from "@comunica/bus-rdf-metadata";
import {IActionRdfMetadataExtract, IActorRdfMetadataExtractOutput} from "@comunica/bus-rdf-metadata-extract";
import {ActionContext, Actor, IActorTest, Mediator} from "@comunica/core";
import {AsyncIterator} from "asynciterator";
import {PromiseProxyIterator} from "asynciterator-promiseproxy";
import * as RDF from "rdf-js";
import {termToString} from "rdf-string";
import {mapTerms, matchPattern} from "rdf-terms";
import {namedNode, defaultGraph} from "@rdfjs/data-model";

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
  private readonly defaultGraph?: RDF.NamedNode;
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
    this.defaultGraph = metadata.defaultGraph ? namedNode(metadata.defaultGraph) : null;
    if (initialQuads) {
      let wrappedQuads = (<any> AsyncIterator).wrap(initialQuads);
      if (this.defaultGraph) {
        wrappedQuads = this.reverseMapQuadsToDefaultGraph(wrappedQuads);
      }
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

    // If we are querying the default graph,
    // and the source has an overridden value for the default graph (such as QPF can provide),
    // we override the graph parameter with that value.
    let modifiedGraph = false;
    if (this.defaultGraph && graph && graph.termType === 'DefaultGraph') {
      modifiedGraph = true;
      graph = this.defaultGraph;
    }

    // Try to emit from cache
    const cached = this.getCachedQuads(subject, predicate, object, graph);
    if (cached) {
      return cached;
    }

    const quads = new PromiseProxyIterator(async () => {
      let url: string = await this.createFragmentUri(this.searchForm, subject, predicate, object, <RDF.Term> graph);
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
      const actualDefaultGraph = defaultGraph();
      let filteredOutput: AsyncIterator<RDF.Quad> = (<any> AsyncIterator).wrap(rdfMetadataOuput.data)
        .filter((quad: RDF.Quad) => {
          if (matchPattern(quad, subject, predicate, object, <RDF.Term> graph)) {
            return true;
          }
          // Special case: if we are querying in the default graph, and we had an overridden default graph,
          // also accept that incoming triples may be defined in the actual default graph
          return modifiedGraph && matchPattern(quad, subject, predicate, object, actualDefaultGraph);
        });
      if (modifiedGraph || !graph) {
        // Reverse-map the overridden default graph back to the actual default graph
        filteredOutput = this.reverseMapQuadsToDefaultGraph(filteredOutput);
      }

      return filteredOutput;
    });

    this.cacheQuads(quads, subject, predicate, object, graph);
    return this.getCachedQuads(subject, predicate, object, graph);
  }

  protected reverseMapQuadsToDefaultGraph(quads: AsyncIterator<RDF.Quad>): AsyncIterator<RDF.Quad> {
    const actualDefaultGraph = defaultGraph();
    return quads.map(
      (quad) => mapTerms(quad, (term, key) => key === 'graph' && term.equals(this.defaultGraph) ? actualDefaultGraph : term));
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
      const quadsOriginal = quads;
      // Make our iterator lazy to ensure that metadata event is emitted before end event.
      quads = new PromiseProxyIterator(async () => quadsOriginal.clone());
      quadsOriginal.getProperty('metadata', (metadata) => quads.emit('metadata', metadata));
      return quads;
    }
    return null;
  }

}
