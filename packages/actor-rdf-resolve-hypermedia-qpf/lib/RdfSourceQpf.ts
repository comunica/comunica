import type { ISearchForm } from '@comunica/actor-rdf-metadata-extract-hydra-controls';
import type { MediatorDereferenceRdf } from '@comunica/bus-dereference-rdf';
import type { IActorRdfMetadataOutput, MediatorRdfMetadata } from '@comunica/bus-rdf-metadata';
import type { MediatorRdfMetadataExtract } from '@comunica/bus-rdf-metadata-extract';
import type { IQuadSource } from '@comunica/bus-rdf-resolve-quad-pattern';
import type { IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { ArrayIterator, TransformIterator, wrap } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { termToString } from 'rdf-string';
import { everyTermsNested, mapTerms, matchPattern } from 'rdf-terms';

const DF = new DataFactory();

/**
 * An RDF source that executes a quad pattern over a QPF interface and fetches its first page.
 */
export class RdfSourceQpf implements IQuadSource {
  public readonly searchForm: ISearchForm;

  private readonly mediatorMetadata: MediatorRdfMetadata;

  private readonly mediatorMetadataExtract: MediatorRdfMetadataExtract;

  private readonly mediatorDereferenceRdf: MediatorDereferenceRdf;

  private readonly subjectUri: string;
  private readonly predicateUri: string;
  private readonly objectUri: string;
  private readonly graphUri?: string;
  private readonly url: string;
  private readonly defaultGraph?: RDF.NamedNode;
  private readonly context: IActionContext;
  private readonly cachedQuads: Record<string, AsyncIterator<RDF.Quad>>;

  public constructor(mediatorMetadata: MediatorRdfMetadata,
    mediatorMetadataExtract: MediatorRdfMetadataExtract,
    mediatorDereferenceRdf: MediatorDereferenceRdf,
    subjectUri: string, predicateUri: string, objectUri: string, graphUri: string | undefined,
    url: string,
    metadata: Record<string, any>, context: IActionContext, initialQuads?: RDF.Stream) {
    this.mediatorMetadata = mediatorMetadata;
    this.mediatorMetadataExtract = mediatorMetadataExtract;
    this.mediatorDereferenceRdf = mediatorDereferenceRdf;
    this.subjectUri = subjectUri;
    this.predicateUri = predicateUri;
    this.objectUri = objectUri;
    this.graphUri = graphUri;
    this.url = url;
    this.context = context;
    this.cachedQuads = {};
    const searchForm = this.getSearchForm(metadata);
    if (!searchForm) {
      throw new Error('Illegal state: found no TPF/QPF search form anymore in metadata.');
    }
    this.searchForm = searchForm;
    this.defaultGraph = metadata.defaultGraph ? DF.namedNode(metadata.defaultGraph) : undefined;
    if (initialQuads) {
      let wrappedQuads: AsyncIterator<RDF.Quad> = wrap<RDF.Quad>(initialQuads);
      if (this.defaultGraph) {
        wrappedQuads = this.reverseMapQuadsToDefaultGraph(wrappedQuads);
      }
      wrappedQuads.setProperty('metadata', metadata);
      this.cacheQuads(wrappedQuads, DF.variable(''), DF.variable(''), DF.variable(''), DF.variable(''));
    }
  }

  /**
   * Get a first QPF search form.
   * @param {{[p: string]: any}} metadata A metadata object.
   * @return {ISearchForm} A search form, or null if none could be found.
   */
  public getSearchForm(metadata: Record<string, any>): ISearchForm | undefined {
    if (!metadata.searchForms || !metadata.searchForms.values) {
      return;
    }

    // Find a quad pattern or triple pattern search form
    const { searchForms } = metadata;
    for (const searchForm of searchForms.values) {
      if (this.graphUri &&
        this.subjectUri in searchForm.mappings &&
        this.predicateUri in searchForm.mappings &&
        this.objectUri in searchForm.mappings &&
        this.graphUri in searchForm.mappings &&
        Object.keys(searchForm.mappings).length === 4) {
        return searchForm;
      }
      if (this.subjectUri in searchForm.mappings &&
        this.predicateUri in searchForm.mappings &&
        this.objectUri in searchForm.mappings &&
        Object.keys(searchForm.mappings).length === 3) {
        return searchForm;
      }
    }
  }

  /**
   * Create a QPF fragment IRI for the given quad pattern.
   * @param {ISearchForm} searchForm A search form.
   * @param {Term} subject A term.
   * @param {Term} predicate A term.
   * @param {Term} object A term.
   * @param {Term} graph A term.
   * @return {string} A URI.
   */
  public createFragmentUri(searchForm: ISearchForm,
    subject: RDF.Term, predicate: RDF.Term, object: RDF.Term, graph: RDF.Term): string {
    const entries: Record<string, string> = {};
    const input = [
      { uri: this.subjectUri, term: subject },
      { uri: this.predicateUri, term: predicate },
      { uri: this.objectUri, term: object },
      { uri: this.graphUri, term: graph },
    ];
    for (const entry of input) {
      if (entry.uri && entry.term.termType !== 'Variable' &&
        (entry.term.termType !== 'Quad' || everyTermsNested(entry.term, value => value.termType !== 'Variable'))) {
        entries[entry.uri] = termToString(entry.term);
      }
    }
    return searchForm.getUri(entries);
  }

  public match(subject: RDF.Term, predicate: RDF.Term, object: RDF.Term, graph: RDF.Term): AsyncIterator<RDF.Quad> {
    // If we are querying the default graph,
    // and the source has an overridden value for the default graph (such as QPF can provide),
    // we override the graph parameter with that value.
    let modifiedGraph = false;
    if (graph.termType === 'DefaultGraph') {
      if (this.defaultGraph) {
        modifiedGraph = true;
        graph = this.defaultGraph;
      } else if (Object.keys(this.searchForm.mappings).length === 4 && !this.defaultGraph) {
        // If the sd:defaultGraph is not declared on a QPF endpoint,
        // then the default graph must be empty.
        const quads = new ArrayIterator([], { autoStart: false });
        quads.setProperty('metadata', {
          requestTime: 0,
          cardinality: { type: 'exact', value: 0 },
          first: null,
          next: null,
          last: null,
          canContainUndefs: false,
        });
        return quads;
      }
    }

    // Try to emit from cache
    const cached = this.getCachedQuads(subject, predicate, object, graph);
    if (cached) {
      return cached;
    }

    const quads = new TransformIterator(async() => {
      let url: string = this.createFragmentUri(this.searchForm, subject, predicate, object, graph);
      const dereferenceRdfOutput = await this.mediatorDereferenceRdf.mediate({ context: this.context, url });
      url = dereferenceRdfOutput.url;

      // Determine the metadata and emit it
      const rdfMetadataOuput: IActorRdfMetadataOutput = await this.mediatorMetadata.mediate(
        { context: this.context,
          url,
          quads: dereferenceRdfOutput.data,
          triples: dereferenceRdfOutput.metadata?.triples },
      );
      const metadataExtractPromise = this.mediatorMetadataExtract
        .mediate({
          context: this.context,
          url,
          metadata: rdfMetadataOuput.metadata,
          requestTime: dereferenceRdfOutput.requestTime,
        })
        .then(({ metadata }) => quads
          .setProperty('metadata', { ...metadata, canContainUndefs: false, subsetOf: this.url }));

      // The server is free to send any data in its response (such as metadata),
      // including quads that do not match the given matter.
      // Therefore, we have to filter away all non-matching quads here.
      const actualDefaultGraph = DF.defaultGraph();
      let filteredOutput: AsyncIterator<RDF.Quad> = wrap<RDF.Quad>(rdfMetadataOuput.data)
        .transform({
          filter(quad: RDF.Quad) {
            if (matchPattern(quad, subject, predicate, object, graph)) {
              return true;
            }
            // Special case: if we are querying in the default graph, and we had an overridden default graph,
            // also accept that incoming triples may be defined in the actual default graph
            return modifiedGraph && matchPattern(quad, subject, predicate, object, actualDefaultGraph);
          },
        });
      if (modifiedGraph || graph.termType === 'Variable') {
        // Reverse-map the overridden default graph back to the actual default graph
        filteredOutput = this.reverseMapQuadsToDefaultGraph(filteredOutput);
      }

      // Swallow error events, as they will be emitted in the metadata stream as well,
      // and therefore thrown async next.
      filteredOutput.on('error', () => {
        // Do nothing
      });
      // Ensures metadata event is emitted before end-event
      await metadataExtractPromise;

      return filteredOutput;
    }, { autoStart: false });

    this.cacheQuads(quads, subject, predicate, object, graph);
    return this.getCachedQuads(subject, predicate, object, graph)!;
  }

  protected reverseMapQuadsToDefaultGraph(quads: AsyncIterator<RDF.Quad>): AsyncIterator<RDF.Quad> {
    const actualDefaultGraph = DF.defaultGraph();
    return quads.map(
      quad => mapTerms(quad,
        (term, key) => key === 'graph' && term.equals(this.defaultGraph) ? actualDefaultGraph : term),
    );
  }

  protected getPatternId(subject: RDF.Term, predicate: RDF.Term, object: RDF.Term, graph: RDF.Term): string {
    /* eslint-disable id-length */
    return JSON.stringify({
      s: subject.termType === 'Variable' ? '' : _termToString(subject),
      p: predicate.termType === 'Variable' ? '' : _termToString(predicate),
      o: object.termType === 'Variable' ? '' : _termToString(object),
      g: graph.termType === 'Variable' ? '' : _termToString(graph),
    });
    /* eslint-enable id-length */
  }

  protected cacheQuads(quads: AsyncIterator<RDF.Quad>,
    subject: RDF.Term, predicate: RDF.Term, object: RDF.Term, graph: RDF.Term): void {
    const patternId = this.getPatternId(subject, predicate, object, graph);
    this.cachedQuads[patternId] = quads.clone();
  }

  protected getCachedQuads(subject: RDF.Term, predicate: RDF.Term, object: RDF.Term, graph: RDF.Term):
  AsyncIterator<RDF.Quad> | undefined {
    const patternId = this.getPatternId(subject, predicate, object, graph);
    const quads = this.cachedQuads[patternId];
    if (quads) {
      return quads.clone();
    }
  }
}

function _termToString(term: RDF.Term): string {
  return term.termType === 'DefaultGraph' ?
    // Any character that cannot be present in a URL will do
    '|' :
    termToString(term);
}
