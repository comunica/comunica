import type { ISearchForm } from '@comunica/actor-rdf-metadata-extract-hydra-controls';
import type { BindingsFactory } from '@comunica/bindings-factory';
import type { MediatorDereferenceRdf } from '@comunica/bus-dereference-rdf';
import { filterMatchingQuotedQuads, quadsToBindings } from '@comunica/bus-query-source-identify';
import type { MediatorRdfMetadata, IActorRdfMetadataOutput } from '@comunica/bus-rdf-metadata';
import type { MediatorRdfMetadataExtract } from '@comunica/bus-rdf-metadata-extract';
import { KeysQueryOperation } from '@comunica/context-entries';
import type {
  IQuerySource,
  BindingsStream,
  IActionContext,
  FragmentSelectorShape,
  IQueryBindingsOptions,
  MetadataBindings,
  ComunicaDataFactory,
} from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { ArrayIterator, TransformIterator, wrap } from 'asynciterator';
import { termToString } from 'rdf-string';
import { termToString as termToStringTtl } from 'rdf-string-ttl';
import {
  everyTermsNested,
  mapTerms,
  matchPattern,
} from 'rdf-terms';
import type { Algebra, Factory } from 'sparqlalgebrajs';

export class QuerySourceQpf implements IQuerySource {
  protected readonly selectorShape: FragmentSelectorShape;

  public readonly searchForm: ISearchForm;

  private readonly mediatorMetadata: MediatorRdfMetadata;
  private readonly mediatorMetadataExtract: MediatorRdfMetadataExtract;
  private readonly mediatorDereferenceRdf: MediatorDereferenceRdf;
  private readonly dataFactory: ComunicaDataFactory;
  private readonly algebraFactory: Factory;
  private readonly bindingsFactory: BindingsFactory;

  public readonly referenceValue: string;
  private readonly subjectUri: string;
  private readonly predicateUri: string;
  private readonly objectUri: string;
  private readonly graphUri?: string;
  private readonly url: string;
  private readonly defaultGraph?: RDF.NamedNode;
  private readonly bindingsRestricted: boolean;
  private readonly cachedQuads: Record<string, AsyncIterator<RDF.Quad>>;

  public constructor(
    mediatorMetadata: MediatorRdfMetadata,
    mediatorMetadataExtract: MediatorRdfMetadataExtract,
    mediatorDereferenceRdf: MediatorDereferenceRdf,
    dataFactory: ComunicaDataFactory,
    algebraFactory: Factory,
    bindingsFactory: BindingsFactory,
    subjectUri: string,
    predicateUri: string,
    objectUri: string,
    graphUri: string | undefined,
    url: string,
    metadata: Record<string, any>,
    bindingsRestricted: boolean,
    initialQuads?: RDF.Stream,
  ) {
    this.referenceValue = url;
    this.mediatorMetadata = mediatorMetadata;
    this.mediatorMetadataExtract = mediatorMetadataExtract;
    this.mediatorDereferenceRdf = mediatorDereferenceRdf;
    this.dataFactory = dataFactory;
    this.algebraFactory = algebraFactory;
    this.bindingsFactory = bindingsFactory;
    this.subjectUri = subjectUri;
    this.predicateUri = predicateUri;
    this.objectUri = objectUri;
    this.graphUri = graphUri;
    this.url = url;
    this.bindingsRestricted = bindingsRestricted;
    this.cachedQuads = {};
    const searchForm = this.getSearchForm(metadata);
    if (!searchForm) {
      throw new Error('Illegal state: found no TPF/QPF search form anymore in metadata.');
    }
    this.searchForm = searchForm;
    this.defaultGraph = metadata.defaultGraph ? this.dataFactory.namedNode(metadata.defaultGraph) : undefined;
    if (initialQuads) {
      let wrappedQuads: AsyncIterator<RDF.Quad> = wrap<RDF.Quad>(initialQuads);
      if (this.defaultGraph) {
        wrappedQuads = this.reverseMapQuadsToDefaultGraph(wrappedQuads);
      }
      wrappedQuads.setProperty('metadata', metadata);
      this.cacheQuads(
        wrappedQuads,
        this.dataFactory.variable(''),
        this.dataFactory.variable(''),
        this.dataFactory.variable(''),
        this.dataFactory.variable(''),
      );
    }

    this.selectorShape = this.bindingsRestricted ?
        {
          type: 'operation',
          operation: {
            operationType: 'pattern',
            pattern: this.algebraFactory.createPattern(
              this.dataFactory.variable('s'),
              this.dataFactory.variable('p'),
              this.dataFactory.variable('o'),
              this.dataFactory.variable('g'),
            ),
          },
          variablesOptional: [
            this.dataFactory.variable('s'),
            this.dataFactory.variable('p'),
            this.dataFactory.variable('o'),
            this.dataFactory.variable('g'),
          ],
          filterBindings: true,
        } :
        {
          type: 'operation',
          operation: {
            operationType: 'pattern',
            pattern: this.algebraFactory.createPattern(
              this.dataFactory.variable('s'),
              this.dataFactory.variable('p'),
              this.dataFactory.variable('o'),
              this.dataFactory.variable('g'),
            ),
          },
          variablesOptional: [
            this.dataFactory.variable('s'),
            this.dataFactory.variable('p'),
            this.dataFactory.variable('o'),
            this.dataFactory.variable('g'),
          ],
        };
  }

  public async getSelectorShape(): Promise<FragmentSelectorShape> {
    return this.selectorShape;
  }

  public queryBindings(
    operation: Algebra.Operation,
    context: IActionContext,
    options?: IQueryBindingsOptions,
  ): BindingsStream {
    if (operation.type !== 'pattern') {
      throw new Error(`Attempted to pass non-pattern operation '${operation.type}' to QuerySourceQpf`);
    }

    const unionDefaultGraph = Boolean(context.get(KeysQueryOperation.unionDefaultGraph));

    // Create an async iterator from the matched quad stream
    let it = this.match(
      operation.subject,
      operation.predicate,
      operation.object,
      operation.graph,
      unionDefaultGraph,
      context,
      options,
    );

    it = filterMatchingQuotedQuads(operation, it);
    return quadsToBindings(it, operation, this.dataFactory, this.bindingsFactory, unionDefaultGraph);
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
  public createFragmentUri(
    searchForm: ISearchForm,
    subject: RDF.Term,
    predicate: RDF.Term,
    object: RDF.Term,
    graph: RDF.Term,
  ): string {
    const entries: Record<string, string> = {};
    const input = [
      { uri: this.subjectUri, term: subject },
      { uri: this.predicateUri, term: predicate },
      { uri: this.objectUri, term: object },
      { uri: this.graphUri, term: graph },
    ];
    for (const entry of input) {
      // If bindingsRestricted, also pass variables, so the server knows how to bind values.
      if (entry.uri && (this.bindingsRestricted || (entry.term.termType !== 'Variable' &&
        (entry.term.termType !== 'Quad' || everyTermsNested(entry.term, value => value.termType !== 'Variable'))))) {
        entries[entry.uri] = termToString(entry.term);
      }
    }
    return searchForm.getUri(entries);
  }

  protected match(
    subject: RDF.Term,
    predicate: RDF.Term,
    object: RDF.Term,
    graph: RDF.Term,
    unionDefaultGraph: boolean,
    context: IActionContext,
    options?: IQueryBindingsOptions,
  ): AsyncIterator<RDF.Quad> {
    // If we are querying the default graph,
    // and the source has an overridden value for the default graph (such as QPF can provide),
    // we override the graph parameter with that value.
    let modifiedGraph = false;
    if (graph.termType === 'DefaultGraph') {
      if (this.defaultGraph) {
        modifiedGraph = true;
        graph = this.defaultGraph;
      } else if (Object.keys(this.searchForm.mappings).length === 4 && !this.defaultGraph) {
        // If the sd:defaultGraph is not declared on a QPF endpoint
        if (unionDefaultGraph) {
          // With union-default-graph, take union of graphs.
          graph = this.dataFactory.variable('g');
        } else {
          // Without union-default-graph, the default graph must be empty.
          const quads = new ArrayIterator<RDF.Quad>([], { autoStart: false });
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
      } else if (Object.keys(this.searchForm.mappings).length === 3) {
        // If have a TPF endpoint, set graph to variable so we could get the cached triples
        graph = this.dataFactory.variable('g');
      }
    }

    // Try to emit from cache (skip if filtering bindings)
    if (!options?.filterBindings) {
      const cached = this.getCachedQuads(subject, predicate, object, graph);
      if (cached) {
        return cached;
      }
    }

    // Kickstart metadata collection, because the quads iterator is lazy
    // eslint-disable-next-line ts/no-this-alias
    const self = this;
    let quads: AsyncIterator<RDF.Quad>;
    const dataStreamPromise = (async function() {
      let url: string = self.createFragmentUri(self.searchForm, subject, predicate, object, graph);

      // Handle bindings-restricted interfaces
      if (options?.filterBindings) {
        url = await self.getBindingsRestrictedLink(
          subject,
          predicate,
          object,
          graph,
          url,
          options.filterBindings,
        );
      }

      const dereferenceRdfOutput = await self.mediatorDereferenceRdf.mediate({ context, url });
      url = dereferenceRdfOutput.url;

      // Determine the metadata
      const rdfMetadataOuput: IActorRdfMetadataOutput = await self.mediatorMetadata.mediate(
        { context, url, quads: dereferenceRdfOutput.data, triples: dereferenceRdfOutput.metadata?.triples },
      );

      // Extract the metadata
      const { metadata } = await self.mediatorMetadataExtract
        .mediate({
          context,
          url,
          metadata: rdfMetadataOuput.metadata,
          requestTime: dereferenceRdfOutput.requestTime,
        });
      quads!.setProperty('metadata', { ...metadata, canContainUndefs: false, subsetOf: self.url });

      // While we could resolve this before metadata extraction, we do it afterwards to ensure metadata emission
      // before the end event is emitted.
      return rdfMetadataOuput.data;
    })();

    quads = new TransformIterator(async() => {
      const dataStream = await dataStreamPromise;

      // The server is free to send any data in its response (such as metadata),
      // including quads that do not match the given matter.
      // Therefore, we have to filter away all non-matching quads here.
      const actualDefaultGraph = this.dataFactory.defaultGraph();
      let filteredOutput: AsyncIterator<RDF.Quad> = wrap<RDF.Quad>(dataStream)
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

      return filteredOutput;
    }, { autoStart: false });

    // Skip cache if filtering bindings
    if (options?.filterBindings) {
      return quads;
    }

    this.cacheQuads(quads, subject, predicate, object, graph);
    return this.getCachedQuads(subject, predicate, object, graph)!;
  }

  /**
   * If we add bindings for brTPF, append it to the URL.
   * We have to hardcode this because brTPF doesn't expose a URL template for passing bindings.
   * @param subject The subject.
   * @param predicate The predicate.
   * @param object The object.
   * @param graph The graph.
   * @param url The original QPF URL.
   * @param filterBindings The bindings to restrict with.
   * @param filterBindings.bindings The bindings stream.
   * @param filterBindings.metadata The bindings metadata.
   * @protected
   */
  public async getBindingsRestrictedLink(
    subject: RDF.Term,
    predicate: RDF.Term,
    object: RDF.Term,
    graph: RDF.Term,
    url: string,
    filterBindings: { bindings: BindingsStream; metadata: MetadataBindings },
  ): Promise<string> {
    // Determine values
    const values: string[] = [];
    for (const binding of await filterBindings.bindings.toArray()) {
      const value: string[] = [ '(' ];
      for (const variable of filterBindings.metadata.variables) {
        const term = binding.get(variable);
        value.push(term ? termToStringTtl(term) : 'UNDEF');
        value.push(' ');
      }
      value.push(')');
      values.push(value.join(''));
    }

    if (values.length === 0) {
      // This is a hack to force an empty result page,
      // because the brTPF server returns a server error when passing 0 bindings.
      values.push('(<ex:comunica:unknown>)');
    }

    // Append to URL (brTPF uses the SPARQL VALUES syntax, without the VALUES prefix)
    const valuesUrl = encodeURIComponent(`(${filterBindings.metadata.variables.map(variable => `?${variable.value}`).join(' ')}) { ${values.join(' ')} }`);
    return `${url}&values=${valuesUrl}`;
  }

  protected reverseMapQuadsToDefaultGraph(quads: AsyncIterator<RDF.Quad>): AsyncIterator<RDF.Quad> {
    const actualDefaultGraph = this.dataFactory.defaultGraph();
    return quads.map(
      quad => mapTerms(
        quad,
        (term, key) => key === 'graph' && term.equals(this.defaultGraph) ? actualDefaultGraph : term,
      ),
    );
  }

  public getPatternId(subject: RDF.Term, predicate: RDF.Term, object: RDF.Term, graph: RDF.Term): string {
    return JSON.stringify({
      s: subject.termType === 'Variable' ? '' : _termToString(subject),
      p: predicate.termType === 'Variable' ? '' : _termToString(predicate),
      o: object.termType === 'Variable' ? '' : _termToString(object),
      g: graph.termType === 'Variable' ? '' : _termToString(graph),
    });
  }

  protected cacheQuads(
    quads: AsyncIterator<RDF.Quad>,
    subject: RDF.Term,
    predicate: RDF.Term,
    object: RDF.Term,
    graph: RDF.Term,
  ): void {
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

  public queryQuads(
    _operation: Algebra.Operation,
    _context: IActionContext,
  ): AsyncIterator<RDF.Quad> {
    throw new Error('queryQuads is not implemented in QuerySourceQpf');
  }

  public queryBoolean(
    _operation: Algebra.Ask,
    _context: IActionContext,
  ): Promise<boolean> {
    throw new Error('queryBoolean is not implemented in QuerySourceQpf');
  }

  public queryVoid(
    _operation: Algebra.Update,
    _context: IActionContext,
  ): Promise<void> {
    throw new Error('queryVoid is not implemented in QuerySourceQpf');
  }
}

function _termToString(term: RDF.Term): string {
  return term.termType === 'DefaultGraph' ?
    // Any character that cannot be present in a URL will do
    '|' :
    termToString(term);
}
