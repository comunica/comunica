import type { IQuadSource } from '@comunica/bus-rdf-resolve-quad-pattern';
import type { ActionContext } from '@comunica/core';
import type { AsyncIterator } from 'asynciterator';
import type * as RDF from 'rdf-js';
import type { ISourcesState } from './LinkedRdfSourcesAsyncRdfIterator';
import type { IMediatorArgs } from './MediatedLinkedRdfSourcesAsyncRdfIterator';
import { MediatedLinkedRdfSourcesAsyncRdfIterator } from './MediatedLinkedRdfSourcesAsyncRdfIterator';

/**
 * A lazy quad source that creates {@link MediatedLinkedRdfSourcesAsyncRdfIterator} instances when matching quads.
 *
 * @see MediatedLinkedRdfSourcesAsyncRdfIterator
 */
export class MediatedQuadSource implements IQuadSource {
  public readonly context: ActionContext;
  public readonly firstUrl: string;
  public readonly forceSourceType?: string;
  public readonly mediators: IMediatorArgs;

  public sourcesState: ISourcesState;

  private readonly cacheSize: number;

  public constructor(cacheSize: number, context: ActionContext, firstUrl: string,
    forceSourceType: string | undefined, mediators: IMediatorArgs) {
    this.cacheSize = cacheSize;
    this.context = context;
    this.firstUrl = firstUrl;
    this.forceSourceType = forceSourceType;
    this.mediators = mediators;
  }

  public match(subject: RDF.Term, predicate: RDF.Term, object: RDF.Term, graph: RDF.Term): AsyncIterator<RDF.Quad> {
    const it = new MediatedLinkedRdfSourcesAsyncRdfIterator(
      this.cacheSize,
      this.context,
      this.forceSourceType,
      subject,
      predicate,
      object,
      graph,
      this.firstUrl,
      this.mediators,
    );
    if (!this.sourcesState) {
      it.setSourcesState();
      this.sourcesState = it.sourcesState!;
    } else {
      it.setSourcesState(this.sourcesState);
    }
    return it;
  }
}
