import type { BindingsFactory } from '@comunica/bindings-factory';
import { filterMatchingQuotedQuads, quadsToBindings } from '@comunica/bus-query-source-identify';
import { KeysQueryOperation } from '@comunica/context-entries';
import { MetadataValidationState } from '@comunica/metadata';
import type { IQuerySource, BindingsStream, IActionContext, FragmentSelectorShape } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { AsyncIterator, wrap as wrapAsyncIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { someTermsNested, filterTermsNested, someTerms, uniqTerms } from 'rdf-terms';
import type { Algebra } from 'sparqlalgebrajs';
import { Factory } from 'sparqlalgebrajs';
import type { IRdfJsSourceExtended } from './IRdfJsSourceExtended';

const AF = new Factory();
const DF = new DataFactory<RDF.BaseQuad>();

export class QuerySourceRdfJs implements IQuerySource {
  protected static readonly SELECTOR_SHAPE: FragmentSelectorShape = {
    type: 'operation',
    operation: {
      operationType: 'pattern',
      pattern: AF.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o')),
    },
    variablesOptional: [
      DF.variable('s'),
      DF.variable('p'),
      DF.variable('o'),
    ],
  };

  public referenceValue: string | RDF.Source;
  protected readonly source: IRdfJsSourceExtended;
  private readonly bindingsFactory: BindingsFactory;

  public constructor(source: RDF.Source, bindingsFactory: BindingsFactory) {
    this.source = source;
    this.referenceValue = source;
    this.bindingsFactory = bindingsFactory;
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
    return QuerySourceRdfJs.SELECTOR_SHAPE;
  }

  public queryBindings(operation: Algebra.Operation, context: IActionContext): BindingsStream {
    if (operation.type !== 'pattern') {
      throw new Error(`Attempted to pass non-pattern operation '${operation.type}' to QuerySourceRdfJs`);
    }

    // Check if the source supports quoted triple filtering
    const quotedTripleFiltering = Boolean(this.source.features?.quotedTripleFiltering);

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
      this.setMetadata(it, operation)
        .catch(error => it.destroy(error));
    }

    return quadsToBindings(
      it,
      operation,
      this.bindingsFactory,
      Boolean(context.get(KeysQueryOperation.unionDefaultGraph)),
    );
  }

  protected async setMetadata(
    it: AsyncIterator<RDF.Quad>,
    operation: Algebra.Pattern,
  ): Promise<void> {
    // Check if the source supports quoted triple filtering
    const quotedTripleFiltering = Boolean(this.source.features?.quotedTripleFiltering);

    let cardinality: number;
    if (this.source.countQuads) {
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
        const matches = this.source.match(
          QuerySourceRdfJs.nullifyVariables(operation.subject, quotedTripleFiltering),
          QuerySourceRdfJs.nullifyVariables(operation.predicate, quotedTripleFiltering),
          QuerySourceRdfJs.nullifyVariables(operation.object, quotedTripleFiltering),
          QuerySourceRdfJs.nullifyVariables(operation.graph, quotedTripleFiltering),
        );
        matches.on('error', reject);
        matches.on('end', () => resolve(i));
        matches.on('data', () => i++);
      });
    }

    // If `match` would require filtering afterwards, our count will be an over-estimate.
    const wouldRequirePostFiltering = (!quotedTripleFiltering &&
        someTerms(operation, term => term.termType === 'Quad')) ||
      QuerySourceRdfJs.hasDuplicateVariables(operation);

    it.setProperty('metadata', {
      state: new MetadataValidationState(),
      cardinality: { type: wouldRequirePostFiltering ? 'estimate' : 'exact', value: cardinality },
      canContainUndefs: false,
    });
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

  public toString(): string {
    return `QuerySourceRdfJs(${this.source.constructor.name})`;
  }
}
