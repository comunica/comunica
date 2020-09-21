import type { IQuadSource } from '@comunica/bus-rdf-resolve-quad-pattern';
import type { AsyncIterator } from 'asynciterator';
import { wrap as wrapAsyncIterator } from 'asynciterator';
import type * as RDF from 'rdf-js';
import type { IRdfJsSourceExtended } from './IRdfJsSourceExtended';

/**
 * A quad source that wraps over an {@link RDF.Source}.
 */
export class RdfJsQuadSource implements IQuadSource {
  private readonly source: IRdfJsSourceExtended;

  public constructor(source: IRdfJsSourceExtended) {
    this.source = source;
  }

  public static nullifyVariables(term?: RDF.Term): RDF.Term | undefined {
    return !term || term.termType === 'Variable' ? undefined : term;
  }

  public match(subject: RDF.Term, predicate: RDF.Term, object: RDF.Term, graph: RDF.Term): AsyncIterator<RDF.Quad> {
    // Create an async iterator from the matched quad stream
    const rawStream = this.source.match(
      RdfJsQuadSource.nullifyVariables(subject),
      RdfJsQuadSource.nullifyVariables(predicate),
      RdfJsQuadSource.nullifyVariables(object),
      RdfJsQuadSource.nullifyVariables(graph),
    );
    const it = wrapAsyncIterator<RDF.Quad>(rawStream, { autoStart: false });

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
    let totalItems: number;
    if (this.source.countQuads) {
      // If the source provides a dedicated method for determining cardinality, use that.
      totalItems = await this.source.countQuads(
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
      totalItems = await new Promise((resolve, reject) => {
        const matches = this.source.match(
          RdfJsQuadSource.nullifyVariables(subject),
          RdfJsQuadSource.nullifyVariables(predicate),
          RdfJsQuadSource.nullifyVariables(object),
          RdfJsQuadSource.nullifyVariables(graph),
        );
        matches.on('error', reject);
        matches.on('end', () => resolve(i));
        matches.on('data', () => i++);
      });
    }
    it.setProperty('metadata', { totalItems });
  }
}
