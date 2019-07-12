import {ILazyQuadSource} from "@comunica/bus-rdf-resolve-quad-pattern";
import {ActionContext} from "@comunica/core";
import {AsyncIterator} from "asynciterator";
import * as RDF from "rdf-js";
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

  public firstSource: Promise<{ source: RDF.Source, metadata: {[id: string]: any} }>;

  constructor(context: ActionContext, firstUrl: string, forceSourceType: string, mediators: IMediatorArgs) {
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
    const it = new MediatedLinkedRdfSourcesAsyncRdfIterator(this.context, this.forceSourceType,
      subject, predicate, object, graph, this.firstUrl, this.mediators);
    if (!this.firstSource) {
      it.loadFirstSource();
      this.firstSource = it.firstSource;
    } else {
      it.loadFirstSource(this.firstSource);
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
