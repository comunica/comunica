import type { IQuadSource } from '@comunica/bus-rdf-resolve-quad-pattern';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { wrap as wrapAsyncIterator } from 'asynciterator';
import { matchPattern, someTerms } from 'rdf-terms';
import type { IRdfJsSourceExtended } from './IRdfJsSourceExtended';

function hasNestedVariable(quad: RDF.BaseQuad): boolean {
  return someTerms(quad, term =>
    term.termType === 'Variable' ||
    (term.termType === 'Quad' && hasNestedVariable(term)));
}

/**
 * A quad source that wraps over an {@link RDF.Source}.
 */
export class RdfJsQuadSource implements IQuadSource {
  private readonly sparqlStar?: boolean;

  public constructor(private readonly source: IRdfJsSourceExtended, context?: IActionContext) {
    this.sparqlStar = context?.get(KeysInitQuery.sparqlStar);
  }

  public static nullifyVariables(term?: RDF.Term, sparqlStar?: boolean): RDF.Term | undefined {
    return (!term ||
      term.termType === 'Variable' ||
      (sparqlStar && term.termType === 'Quad' && hasNestedVariable(term))) ?
      undefined :
      term;
  }

  public match(subject: RDF.Term, predicate: RDF.Term, object: RDF.Term, graph: RDF.Term): AsyncIterator<RDF.Quad> {
    // Create an async iterator from the matched quad stream
    const rawStream = this.source.match(
      RdfJsQuadSource.nullifyVariables(subject, this.sparqlStar),
      RdfJsQuadSource.nullifyVariables(predicate, this.sparqlStar),
      RdfJsQuadSource.nullifyVariables(object, this.sparqlStar),
      RdfJsQuadSource.nullifyVariables(graph, this.sparqlStar),
    );
    let it: AsyncIterator<RDF.Quad> = wrapAsyncIterator<RDF.Quad>(rawStream, { autoStart: false });
    // TODO: See if we need specialised handling for the default graph here
    // TODO: Only enable this in rdf-star mode
    if (
      this.sparqlStar &&
      (<RDF.Term[]> [ subject, predicate, object, graph ])
        .some(term => term.termType === 'Quad' && hasNestedVariable(term))
    ) {
      it = it.filter(quad => matchPattern(quad, subject, predicate, object, graph));
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
    let cardinality: number;
    if (this.source.countQuads && (!this.sparqlStar || !(<RDF.Term[]> [ subject, predicate, object, graph ])
      .some(term => term.termType === 'Quad' && hasNestedVariable(term)))) {
      // If the source provides a dedicated method for determining cardinality, use that.
      cardinality = await this.source.countQuads(
        RdfJsQuadSource.nullifyVariables(subject),
        RdfJsQuadSource.nullifyVariables(predicate),
        RdfJsQuadSource.nullifyVariables(object),
        RdfJsQuadSource.nullifyVariables(graph),
      );
    } else {
      // Otherwise, fallback to a sub-optimal alternative where we just call match again to count the quads.
      // WARNING: we can NOT reuse the original data stream here,
      // because we may loose data elements due to things happening async.
      let i = 0;
      cardinality = await new Promise((resolve, reject) => {
        const matches = this.source.match(
          RdfJsQuadSource.nullifyVariables(subject, this.sparqlStar),
          RdfJsQuadSource.nullifyVariables(predicate, this.sparqlStar),
          RdfJsQuadSource.nullifyVariables(object, this.sparqlStar),
          RdfJsQuadSource.nullifyVariables(graph, this.sparqlStar),
        );
        matches.on('error', reject);
        matches.on('end', () => resolve(i));

        if (
          this.sparqlStar &&
          (<RDF.Term[]> [ subject, predicate, object, graph ])
            .some(term => term.termType === 'Quad' && hasNestedVariable(term))
        ) {
          matches.on('data', quad => {
            if (matchPattern(quad, subject, predicate, object, graph)) {
              i++;
            }
          });
        } else {
          matches.on('data', () => i++);
        }
      });
    }
    it.setProperty('metadata', { cardinality: { type: 'exact', value: cardinality }, canContainUndefs: false });
  }
}
