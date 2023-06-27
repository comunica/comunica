import type { IQuadSource } from '@comunica/bus-rdf-resolve-quad-pattern';
import { MetadataValidationState } from '@comunica/metadata';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { wrap as wrapAsyncIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import { someTermsNested, filterTermsNested, someTerms, uniqTerms, matchPatternComplete } from 'rdf-terms';
import type { IRdfJsSourceExtended } from './IRdfJsSourceExtended';

const DF = new DataFactory<RDF.BaseQuad>();

/**
 * A quad source that wraps over an {@link RDF.Source}.
 */
export class RdfJsQuadSource implements IQuadSource {
  private readonly source: IRdfJsSourceExtended;

  public constructor(source: IRdfJsSourceExtended) {
    this.source = source;
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

  public match(subject: RDF.Term, predicate: RDF.Term, object: RDF.Term, graph: RDF.Term): AsyncIterator<RDF.Quad> {
    // Check if the source supports quoted triple filtering
    const quotedTripleFiltering = Boolean(this.source.features?.quotedTripleFiltering);

    // Create an async iterator from the matched quad stream
    const rawStream = this.source.match(
      RdfJsQuadSource.nullifyVariables(subject, quotedTripleFiltering),
      RdfJsQuadSource.nullifyVariables(predicate, quotedTripleFiltering),
      RdfJsQuadSource.nullifyVariables(object, quotedTripleFiltering),
      RdfJsQuadSource.nullifyVariables(graph, quotedTripleFiltering),
    );
    let it: AsyncIterator<RDF.Quad> = wrapAsyncIterator<RDF.Quad>(rawStream, { autoStart: false });

    // Perform post-match-filtering if the source does not support quoted triple filtering,
    // but we have a variable inside a quoted triple.
    const pattern = DF.quad(subject, predicate, object, graph);
    if (!quotedTripleFiltering && someTerms(pattern, term => term.termType === 'Quad')) {
      it = it.filter(quad => matchPatternComplete(quad, pattern));
    }

    // Determine metadata
    this.setMetadata(it, subject, predicate, object, graph)
      .catch(error => it.destroy(error));

    return it;
  }

  protected async setMetadata(
    it: AsyncIterator<RDF.Quad>,
    subject: RDF.Term,
    predicate: RDF.Term,
    object: RDF.Term,
    graph: RDF.Term,
  ): Promise<void> {
    // Check if the source supports quoted triple filtering
    const quotedTripleFiltering = Boolean(this.source.features?.quotedTripleFiltering);

    let cardinality: number;
    if (this.source.countQuads) {
      // If the source provides a dedicated method for determining cardinality, use that.
      cardinality = await this.source.countQuads(
        RdfJsQuadSource.nullifyVariables(subject, quotedTripleFiltering),
        RdfJsQuadSource.nullifyVariables(predicate, quotedTripleFiltering),
        RdfJsQuadSource.nullifyVariables(object, quotedTripleFiltering),
        RdfJsQuadSource.nullifyVariables(graph, quotedTripleFiltering),
      );
    } else {
      // Otherwise, fallback to a sub-optimal alternative where we just call match again to count the quads.
      // WARNING: we can NOT reuse the original data stream here,
      // because we may loose data elements due to things happening async.
      let i = 0;
      cardinality = await new Promise((resolve, reject) => {
        const matches = this.source.match(
          RdfJsQuadSource.nullifyVariables(subject, quotedTripleFiltering),
          RdfJsQuadSource.nullifyVariables(predicate, quotedTripleFiltering),
          RdfJsQuadSource.nullifyVariables(object, quotedTripleFiltering),
          RdfJsQuadSource.nullifyVariables(graph, quotedTripleFiltering),
        );
        matches.on('error', reject);
        matches.on('end', () => resolve(i));
        matches.on('data', () => i++);
      });
    }

    // If `match` would require filtering afterwards, our count will be an over-estimate.
    const pattern = DF.quad(subject, predicate, object, graph);
    const wouldRequirePostFiltering = (!quotedTripleFiltering &&
        someTerms(pattern, term => term.termType === 'Quad')) ||
      RdfJsQuadSource.hasDuplicateVariables(pattern);

    it.setProperty('metadata', {
      state: new MetadataValidationState(),
      cardinality: { type: wouldRequirePostFiltering ? 'estimate' : 'exact', value: cardinality },
      canContainUndefs: false,
    });
  }
}
