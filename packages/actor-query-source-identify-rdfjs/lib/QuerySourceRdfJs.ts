import { filterMatchingQuotedQuads, getVariables, quadsToBindings } from '@comunica/bus-query-source-identify';
import { KeysQueryOperation } from '@comunica/context-entries';
import type {
  IQuerySource,
  BindingsStream,
  IActionContext,
  FragmentSelectorShape,
  ComunicaDataFactory,
  QuerySourceReference,
} from '@comunica/types';
import { Algebra, AlgebraFactory, isKnownOperation } from '@comunica/utils-algebra';
import type { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator, AsyncIterator, wrap as wrapAsyncIterator } from 'asynciterator';
import { someTermsNested, filterTermsNested, someTerms, uniqTerms } from 'rdf-terms';
import type { IRdfJsSourceExtended } from './IRdfJsSourceExtended';

export class QuerySourceRdfJs implements IQuerySource {
  protected readonly selectorShape: FragmentSelectorShape;
  public referenceValue: QuerySourceReference;
  protected readonly source: IRdfJsSourceExtended | RDF.DatasetCore;
  private readonly dataFactory: ComunicaDataFactory;
  private readonly bindingsFactory: BindingsFactory;
  private readonly dummyDefaultGraph: RDF.Variable;

  public constructor(
    source: RDF.Source | RDF.DatasetCore,
    dataFactory: ComunicaDataFactory,
    bindingsFactory: BindingsFactory,
  ) {
    this.source = source;
    this.referenceValue = source;
    this.dataFactory = dataFactory;
    this.bindingsFactory = bindingsFactory;
    const AF = new AlgebraFactory(<RDF.DataFactory> this.dataFactory);
    this.selectorShape = {
      type: 'operation',
      operation: {
        operationType: 'pattern',
        pattern: AF.createPattern(
          this.dataFactory.variable('s'),
          this.dataFactory.variable('p'),
          this.dataFactory.variable('o'),
        ),
      },
      variablesOptional: [
        this.dataFactory.variable('s'),
        this.dataFactory.variable('p'),
        this.dataFactory.variable('o'),
      ],
    };
    this.dummyDefaultGraph = this.dataFactory.variable('__comunica:defaultGraph');
  }

  public static nullifyVariables(term: RDF.Term | undefined, quotedTripleFiltering: boolean): RDF.Term | undefined {
    return !term || term.termType === 'Variable' || (!quotedTripleFiltering &&
      term.termType === 'Quad' && someTermsNested(term, value => value.termType === 'Variable')) ?
      undefined :
      term;
  }

  public static hasDuplicateVariables(pattern: RDF.BaseQuad): boolean {
    const variables = filterTermsNested(pattern, term => term.termType === 'Variable');
    return variables.length > 1 && uniqTerms(variables).length < variables.length;
  }

  public async getSelectorShape(): Promise<FragmentSelectorShape> {
    return this.selectorShape;
  }

  public async getFilterFactor(): Promise<number> {
    return 0;
  }

  public queryBindings(operation: Algebra.Operation, context: IActionContext): BindingsStream {
    if (!isKnownOperation(operation, Algebra.Types.PATTERN)) {
      throw new Error(`Attempted to pass non-pattern operation '${operation.type}' to QuerySourceRdfJs`);
    }

    // Check if we're running in union default graph mode
    const unionDefaultGraph = Boolean(context.get(KeysQueryOperation.unionDefaultGraph));
    if (operation.graph.termType === 'DefaultGraph' && unionDefaultGraph) {
      operation.graph = this.dummyDefaultGraph;
    }

    // Get bindings directly if the source allows it
    // This will be more efficient, as it avoids the intermediary quads translation and representation.
    if ('matchBindings' in this.source && this.source.matchBindings) {
      const rawStream = this.source.matchBindings(
        this.bindingsFactory,
        operation.subject,
        operation.predicate,
        operation.object,
        operation.graph,
      );
      let it: AsyncIterator<RDF.Bindings> = rawStream instanceof AsyncIterator ?
        rawStream :
        wrapAsyncIterator<RDF.Bindings>(rawStream, { autoStart: false });

      // Check if non-default-graph triples need to be filtered out.
      // SPARQL query semantics allow graph variables to only match with named graphs, excluding the default graph
      // But this is not the case when using union default graph semantics
      let forceEstimateCardinality = false;
      if (operation.graph.termType === 'Variable' && !unionDefaultGraph) {
        forceEstimateCardinality = true;
        const variable = operation.graph;
        it = it.filter(bindings => bindings.get(variable)!.termType !== 'DefaultGraph');
      }

      // Remove bindings to the dummy __comunica:defaultGraph variable if needed
      if (operation.graph.equals(this.dummyDefaultGraph)) {
        it = it.map(bindings => bindings.delete(this.dummyDefaultGraph));
        // Restore graph for determining variable metadata
        operation.graph = this.dataFactory.defaultGraph();
      }

      // Determine metadata
      if (!it.getProperty('metadata')) {
        const variables = getVariables(operation).map(variable => ({ variable, canBeUndef: false }));
        this.setMetadata(it, operation, context, forceEstimateCardinality, { variables })
          .catch(error => it.destroy(error));
      }

      return it;
    }

    // Check if the source supports quoted triple filtering
    const quotedTripleFiltering = Boolean('features' in this.source && this.source.features?.quotedTripleFiltering);

    // Create an async iterator from the matched quad stream
    const rawStream = this.source.match(
      QuerySourceRdfJs.nullifyVariables(operation.subject, quotedTripleFiltering),
      QuerySourceRdfJs.nullifyVariables(operation.predicate, quotedTripleFiltering),
      QuerySourceRdfJs.nullifyVariables(operation.object, quotedTripleFiltering),
      QuerySourceRdfJs.nullifyVariables(operation.graph, quotedTripleFiltering),
    );
    let it: AsyncIterator<RDF.Quad> = rawStream instanceof AsyncIterator ?
      rawStream :
      wrapAsyncIterator<RDF.Quad>(rawStream, { autoStart: false });

    // Perform post-match-filtering if the source does not support quoted triple filtering.
    if (!quotedTripleFiltering) {
      it = filterMatchingQuotedQuads(operation, it);
    }

    // Determine metadata
    if (!it.getProperty('metadata')) {
      this.setMetadata(it, operation, context)
        .catch(error => it.destroy(error));
    }

    // Restore graph for determining variable metadata
    if (operation.graph.equals(this.dummyDefaultGraph)) {
      operation.graph = this.dataFactory.defaultGraph();
    }

    return quadsToBindings(
      it,
      operation,
      this.dataFactory,
      this.bindingsFactory,
      Boolean(context.get(KeysQueryOperation.unionDefaultGraph)),
    );
  }

  protected async setMetadata(
    it: AsyncIterator<any>,
    operation: Algebra.Pattern,
    context: IActionContext,
    forceEstimateCardinality = false,
    extraMetadata: Record<string, any> = {},
  ): Promise<void> {
    // Check if the source supports quoted triple filtering
    const quotedTripleFiltering = Boolean('features' in this.source && this.source.features?.quotedTripleFiltering);

    // Check if we're running in union default graph mode
    const unionDefaultGraph = Boolean(context.get(KeysQueryOperation.unionDefaultGraph));
    if (operation.graph.termType === 'DefaultGraph' && unionDefaultGraph) {
      operation.graph = this.dummyDefaultGraph;
    }

    let cardinality: number;
    if ('countQuads' in this.source && this.source.countQuads) {
      // If the source provides a dedicated method for determining cardinality, use that.
      cardinality = await this.source.countQuads(
        QuerySourceRdfJs.nullifyVariables(operation.subject, quotedTripleFiltering),
        QuerySourceRdfJs.nullifyVariables(operation.predicate, quotedTripleFiltering),
        QuerySourceRdfJs.nullifyVariables(operation.object, quotedTripleFiltering),
        QuerySourceRdfJs.nullifyVariables(operation.graph, quotedTripleFiltering),
      );
    } else {
      // Otherwise, fallback to a sub-optimal alternative where we just call match again to count the quads.
      // WARNING: we can NOT reuse the original data stream here,
      // because we may lose data elements due to things happening async.
      let i = 0;
      cardinality = await new Promise((resolve, reject) => {
        let matches = this.source.match(
          QuerySourceRdfJs.nullifyVariables(operation.subject, quotedTripleFiltering),
          QuerySourceRdfJs.nullifyVariables(operation.predicate, quotedTripleFiltering),
          QuerySourceRdfJs.nullifyVariables(operation.object, quotedTripleFiltering),
          QuerySourceRdfJs.nullifyVariables(operation.graph, quotedTripleFiltering),
        );

        // If it's not a stream, turn it into one
        if (typeof (<any> matches).on !== 'function') {
          matches = <RDF.Stream>(new ArrayIterator(<RDF.DatasetCore> matches));
        }

        (<RDF.Stream>matches).on('error', reject);
        (<RDF.Stream>matches).on('end', () => resolve(i));
        (<RDF.Stream>matches).on('data', () => i++);
      });
    }

    // If `match` would require filtering afterwards, our count will be an over-estimate.
    const wouldRequirePostFiltering = (!quotedTripleFiltering &&
        someTerms(operation, term => term.termType === 'Quad')) ||
      QuerySourceRdfJs.hasDuplicateVariables(operation);

    it.setProperty('metadata', {
      state: new MetadataValidationState(),
      cardinality: {
        type: wouldRequirePostFiltering || forceEstimateCardinality ? 'estimate' : 'exact',
        value: cardinality,
      },
      // Force requestTime to zero, since this will be free for future calls, as we're fully indexed at this stage.
      requestTime: 0,
      ...extraMetadata,
    });
  }

  public queryQuads(
    operation: Algebra.Operation,
    _context: IActionContext,
  ): AsyncIterator<RDF.Quad> {
    if (isKnownOperation(operation, Algebra.Types.PATTERN)) {
      return wrapAsyncIterator<RDF.Quad>(
        this.source.match(operation.subject, operation.predicate, operation.object, operation.graph),
        { autoStart: false },
      );
    }
    throw new Error('queryQuads is not implemented in QuerySourceRdfJs');
  }

  public queryBoolean(
    _operation: Algebra.Ask,
    _context: IActionContext,
  ): Promise<boolean> {
    throw new Error('queryBoolean is not implemented in QuerySourceRdfJs');
  }

  public queryVoid(
    _operation: Algebra.Operation,
    _context: IActionContext,
  ): Promise<void> {
    throw new Error('queryVoid is not implemented in QuerySourceRdfJs');
  }

  public toString(): string {
    return `QuerySourceRdfJs(${this.source.constructor.name})`;
  }
}
