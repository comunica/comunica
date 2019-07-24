import {ILazyQuadSource} from "@comunica/bus-rdf-resolve-quad-pattern";
import {ActionContext} from "@comunica/core";
import {AsyncIterator} from "asynciterator";
import * as RDF from "rdf-js";
import {ISourcesState} from "./LinkedRdfSourcesAsyncRdfIterator";
import {IMediatorArgs, MediatedLinkedRdfSourcesAsyncRdfIterator} from "./MediatedLinkedRdfSourcesAsyncRdfIterator";

/**
 * A lazy quad source that creates {@link MediatedLinkedRdfSourcesAsyncRdfIterator} instances when matching quads.
 *
 * @see MediatedLinkedRdfSourcesAsyncRdfIterator
 */
export class MediatedQuadSource implements ILazyQuadSource {

  public readonly context: ActionContext;
  public readonly firstUrl: string;
  public readonly forceSourceType: string;
  public readonly mediators: IMediatorArgs;

  public sourcesState: ISourcesState;

  private readonly cacheSize: number;

  constructor(cacheSize: number, context: ActionContext, firstUrl: string,
              forceSourceType: string, mediators: IMediatorArgs) {
    this.cacheSize = cacheSize;
    this.context = context;
    this.firstUrl = firstUrl;
    this.forceSourceType = forceSourceType;
    this.mediators = mediators;
  }

  public matchLazy(subject?: RegExp | RDF.Term,
                   predicate?: RegExp | RDF.Term,
                   object?: RegExp | RDF.Term,
                   graph?: RegExp | RDF.Term): AsyncIterator<RDF.Quad> & RDF.Stream {
    if (subject instanceof RegExp
      || predicate  instanceof RegExp
      || object instanceof RegExp
      || graph instanceof RegExp) {
      throw new Error("MediatedQuadSource does not support matching by regular expressions.");
    }
    const it = new MediatedLinkedRdfSourcesAsyncRdfIterator(this.cacheSize, this.context, this.forceSourceType,
      subject, predicate, object, graph, this.firstUrl, this.mediators);
    if (!this.sourcesState) {
      it.setSourcesState();
      this.sourcesState = it.sourcesState;
    } else {
      it.setSourcesState(this.sourcesState);
    }
    return it;
  }

  public match(subject?: RegExp | RDF.Term,
               predicate?: RegExp | RDF.Term,
               object?: RegExp | RDF.Term,
               graph?: RegExp | RDF.Term): RDF.Stream {
    return this.matchLazy(subject, predicate, object, graph);
  }

}
