import { filterMatchingQuotedQuads, getVariables, quadsToBindings } from '@comunica/bus-query-source-identify';
import { KeysQueryOperation } from '@comunica/context-entries';
import type {
  BindingsStream,
  ComunicaDataFactory,
  FragmentSelectorShape,
  IActionContext,
  IQuerySource,
  QuerySourceReference,
} from '@comunica/types';
import { Algebra, AlgebraFactory, isKnownOperation, TypesComunica } from '@comunica/utils-algebra';
import type { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator, AsyncIterator, wrap as wrapAsyncIterator } from 'asynciterator';
import { filterTermsNested, someTerms, someTermsNested, uniqTerms } from 'rdf-terms';
import type { IRdfJsSourceExtended } from './IRdfJsSourceExtended';

/**
 * A query source that evaluates queries against an in-memory RDF/JS source or dataset.
 */
export class QuerySourceRdfJs implements IQuerySource {
  /**
   * The fragment selector shape describing the operations this source handles.
   */
  protected readonly selectorShape: FragmentSelectorShape;
  /**
   * The reference value identifying this source.
   */
  public referenceValue: QuerySourceReference;
  /**
   * The underlying RDF/JS source or dataset.
   */
  protected readonly source: IRdfJsSourceExtended | RDF.DatasetCore;
  /**
   * The RDF data factory.
   */
  private readonly dataFactory: ComunicaDataFactory;
  /**
   * The bindings factory.
   */
  private readonly bindingsFactory: BindingsFactory;
  /**
   * A dummy variable used to represent the default graph in union default graph mode.
   */
  private readonly dummyDefaultGraph: RDF.Variable;

  /**
   * Creates a new RDF/JS query source.
   * @param source The RDF/JS source or dataset to query.
   * @param dataFactory The RDF data factory.
   * @param bindingsFactory The bindings factory.
   */
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
    let selectorShape: FragmentSelectorShape = {
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
    const additionalShapes: FragmentSelectorShape[] = [];
    if ('features' in this.source && this.source.features?.indexNodes) {
      additionalShapes.push({
        type: 'operation',
        operation: {
          operationType: 'type',
          type: TypesComunica.NODES,
        },
      });
    }
    if ('features' in this.source && this.source.features?.indexDistinctTerms) {
      additionalShapes.push({
        type: 'operation',
        operation: {
          operationType: 'type',
          type: TypesComunica.DISTINCT_TERMS,
        },
      });
    }
    if (additionalShapes.length > 0) {
      selectorShape = {
        type: 'disjunction',
        children: [
          selectorShape,
          ...additionalShapes,
        ],
      };
    }
    this.selectorShape = selectorShape;
    this.dummyDefaultGraph = this.dataFactory.variable('__comunica:defaultGraph');
  }

  /**
   * Converts variable terms and unfiltered quoted triples to undefined for source matching.
   * @param term The term to check.
   * @param quotedTripleFiltering Whether the source supports quoted triple filtering.
   * @return The original term or undefined if it should be nullified.
   */
  public static nullifyVariables(term: RDF.Term | undefined, quotedTripleFiltering: boolean): RDF.Term | undefined {
    return !term || term.termType === 'Variable' || (!quotedTripleFiltering &&
      term.termType === 'Quad' && someTermsNested(term, value => value.termType === 'Variable')) ?
      undefined :
      term;
  }

  /**
   * Checks whether a quad pattern contains duplicate variable names.
   * @param pattern The quad pattern to check.
   * @return Whether the pattern has duplicate variables.
   */
  public static hasDuplicateVariables(pattern: RDF.BaseQuad): boolean {
    const variables = filterTermsNested(pattern, term => term.termType === 'Variable');
    return variables.length > 1 && uniqTerms(variables).length < variables.length;
  }

  /**
   * Returns the selector shape describing the operations this source handles.
   * @return The fragment selector shape.
   */
  public async getSelectorShape(): Promise<FragmentSelectorShape> {
    return this.selectorShape;
  }

  /**
   * Returns the filter factor for this source, always 0 for fully indexed sources.
   * @return The filter factor.
   */
  public async getFilterFactor(): Promise<number> {
    return 0;
  }

  /**
   * Queries bindings from the RDF/JS source by matching quad patterns.
   * @param operation The algebra operation to evaluate.
   * @param context The action context.
   * @return A stream of bindings.
   */
  public queryBindings(operation: Algebra.Operation, context: IActionContext): BindingsStream {
    if (isKnownOperation(operation, TypesComunica.NODES) &&
      'matchNodes' in this.source && this.source.matchNodes) {
      const rawStream = this.source.matchNodes(operation.graph);
      const isGraphVariable = operation.graph.termType === 'Variable';
      const it: AsyncIterator<[ RDF.Term, RDF.Term ]> = rawStream instanceof AsyncIterator ?
        rawStream :
        wrapAsyncIterator<[ RDF.Term, RDF.Term ]>(rawStream, { autoStart: false });
      const bs = it.map<RDF.Bindings>(tuple => this.bindingsFactory.bindings([
        ...(isGraphVariable ? [ <[RDF.Variable, RDF.Term]> [ <RDF.Variable> operation.graph, tuple[0] ] ] : []),
        [ operation.variable, tuple[1] ],
      ]));
      bs.setProperty('metadata', {
        state: new MetadataValidationState(),
        cardinality: {
          type: 'exact',
          value: this.source.countNodes!(operation.graph),
        },
        // Force requestTime to zero, since this will be free for future calls, as we're fully indexed at this stage.
        requestTime: 0,
        variables: [
          ...(isGraphVariable ? [{ variable: operation.graph, canBeUndef: false }] : []),
          { variable: operation.variable, canBeUndef: false },
        ],
      });
      return bs;
    }

    if (isKnownOperation(operation, TypesComunica.DISTINCT_TERMS) &&
      'matchDistinctTerms' in this.source && this.source.matchDistinctTerms) {
      // Convert the terms mapping to an array of QuadTermName in the order of variables
      const termNames: any[] = operation.variables.map(variable => operation.terms[variable.value]);

      const rawStream = this.source.matchDistinctTerms(termNames);
      const it: AsyncIterator<RDF.Term[]> = rawStream instanceof AsyncIterator ?
        rawStream :
        wrapAsyncIterator<RDF.Term[]>(rawStream, { autoStart: false });
      const bs = it.map<RDF.Bindings>(terms => this.bindingsFactory.bindings(
        operation.variables.map((variable, index) => [ variable, terms[index] ]),
      ));
      bs.setProperty('metadata', {
        state: new MetadataValidationState(),
        cardinality: {
          type: 'exact',
          value: this.source.countDistinctTerms!(termNames),
        },
        // Force requestTime to zero, since this will be free for future calls, as we're fully indexed at this stage.
        requestTime: 0,
        variables: operation.variables.map(variable => ({ variable, canBeUndef: false })),
      });
      return bs;
    }

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

  /**
   * Determines and sets cardinality metadata on the given iterator.
   * @param it The iterator to set metadata on.
   * @param operation The quad pattern operation.
   * @param context The action context.
   * @param forceEstimateCardinality Whether to force the cardinality type to estimate.
   * @param extraMetadata Additional metadata fields to include.
   */
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
          matches = <RDF.Stream>(new ArrayIterator(<RDF.DatasetCore> matches, { autoStart: false }));
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

  /**
   * Queries quads from the RDF/JS source for pattern operations.
   * @param operation The algebra operation to evaluate.
   * @param _context The action context.
   * @return An async iterator of quads.
   */
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

  /**
   * Not implemented for RDF/JS sources, always throws an error.
   * @param _operation The ASK algebra operation.
   * @param _context The action context.
   */
  public queryBoolean(
    _operation: Algebra.Ask,
    _context: IActionContext,
  ): Promise<boolean> {
    throw new Error('queryBoolean is not implemented in QuerySourceRdfJs');
  }

  /**
   * Not implemented for RDF/JS sources, always throws an error.
   * @param _operation The algebra operation.
   * @param _context The action context.
   */
  public queryVoid(
    _operation: Algebra.Operation,
    _context: IActionContext,
  ): Promise<void> {
    throw new Error('queryVoid is not implemented in QuerySourceRdfJs');
  }

  /**
   * Returns a string representation of this RDF/JS source.
   * @return The string representation.
   */
  public toString(): string {
    return `QuerySourceRdfJs(${this.source.constructor.name})`;
  }
}
