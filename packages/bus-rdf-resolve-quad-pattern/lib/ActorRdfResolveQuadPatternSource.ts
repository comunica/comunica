import {ActionContext, IActorArgs, IActorTest} from "@comunica/core";
import {AsyncIterator} from "asynciterator";
import * as RDF from "rdf-js";
import {Algebra} from "sparqlalgebrajs";
import {
  ActorRdfResolveQuadPattern,
  IActionRdfResolveQuadPattern,
  IActorRdfResolveQuadPatternOutput,
} from "./ActorRdfResolveQuadPattern";

/**
 * A base implementation for rdf-resolve-quad-pattern events
 * that wraps around an RDFJS {@link RDF.Source}.
 *
 * @see RDF.Source
 */
export abstract class ActorRdfResolveQuadPatternSource extends ActorRdfResolveQuadPattern {

  constructor(args: IActorArgs<IActionRdfResolveQuadPattern, IActorTest, IActorRdfResolveQuadPatternOutput>) {
    super(args);
  }

  public static variableToNull(term?: RDF.Term): RDF.Term {
    if (term && term.termType === 'Variable') {
      return null;
    }
    return term;
  }

  /**
   * Convert a metadata callback to a lazy callback where the response value is cached.
   * @param {() => Promise<{[p: string]: any}>} metadata A metadata callback
   * @return {() => Promise<{[p: string]: any}>} The callback where the response will be cached.
   */
  public static cachifyMetadata(metadata: () => Promise<{[id: string]: any}>): () => Promise<{[id: string]: any}> {
    let lastReturn: Promise<{[id: string]: any}> = null;
    return () => (lastReturn || (lastReturn = metadata()));
  }

  public async test(action: IActionRdfResolveQuadPattern): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionRdfResolveQuadPattern): Promise<IActorRdfResolveQuadPatternOutput> {
    const source: RDF.Source = await this.getSource(action.context, action.pattern);
    return await this.getOutput(source, action.pattern, action.context);
  }

  /**
   * Get the metadata of the given action on a source.
   *
   * By default, this method is implemented by listening to the 'metadata' event
   * in the data stream, and resolving the promise to its value.
   *
   * @param {RDF.Source} source An RDFJS source, possibly lazy.
   * @param {Algebra.Operation} operation The operation to apply.
   * @param ActionContext context Optional context data.
   * @param {AsyncIterator<Quad> & Stream} data The data stream that was created by
   *                                            executing source.matchLazy or source.match.
   * @return {() => Promise<{[p: string]: any}>} A lazy promise behind a callback resolving to a metadata object.
   */
  protected getMetadata(source: ILazyQuadSource, pattern: RDF.BaseQuad, context: ActionContext,
                        data: AsyncIterator<RDF.Quad> & RDF.Stream): () => Promise<{[id: string]: any}> {
    return () => new Promise((resolve, reject) => {
      data.on('error', reject);
      data.on('end', () => resolve({}));
      data.on('metadata', (metadata) => {
        resolve(metadata);
      });
    });
  }

  /**
   * Get the output of the given action on a source.
   * @param {RDF.Source} source An RDFJS source, possibly lazy.
   * @param {Algebra.Operation} operation The operation to apply.
   * @param ActionContext context Optional context data.
   * @return {Promise<IActorRdfResolveQuadPatternOutput>} A promise that resolves to a hash containing
   *                                                      a data RDFJS stream and an optional metadata hash.
   */
  protected async getOutput(source: ILazyQuadSource, pattern: RDF.BaseQuad, context: ActionContext)
  : Promise<IActorRdfResolveQuadPatternOutput> {
    // Create data stream
    let data: AsyncIterator<RDF.Quad> & RDF.Stream;
    if (source.matchLazy) {
      data = source.matchLazy(
        ActorRdfResolveQuadPatternSource.variableToNull(pattern.subject),
        ActorRdfResolveQuadPatternSource.variableToNull(pattern.predicate),
        ActorRdfResolveQuadPatternSource.variableToNull(pattern.object),
        ActorRdfResolveQuadPatternSource.variableToNull(pattern.graph),
      );
    } else {
      // TODO: AsyncIterator fix typings
      data = (<any> AsyncIterator).wrap(source.match(
        ActorRdfResolveQuadPatternSource.variableToNull(pattern.subject),
        ActorRdfResolveQuadPatternSource.variableToNull(pattern.predicate),
        ActorRdfResolveQuadPatternSource.variableToNull(pattern.object),
        ActorRdfResolveQuadPatternSource.variableToNull(pattern.graph),
      ));
    }

    // Create metadata callback
    const metadata = ActorRdfResolveQuadPatternSource.cachifyMetadata(
      this.getMetadata(source, pattern, context, data));

    return { data, metadata };
  }

  /**
   * Get a source instance for the given context.
   * @param ActionContext context Optional context data.
   * @param {Algebra.Pattern} operation The operation to apply.
   * @return {Promise<RDF.Source>} A promise that resolves to a source.
   */
  protected abstract getSource(context: ActionContext, operation: Algebra.Pattern): Promise<RDF.Source>;

}

/**
 * A lazy quad source.
 *
 * This extends {@link RDF.Source} with an optional matchLazy method.
 * So non-lazy sources can also be used in this place.
 */
export interface ILazyQuadSource<Q extends RDF.BaseQuad = RDF.Quad> extends RDF.Source<Q> {
  /**
   * Returns a lazy stream that processes all quads matching the pattern.
   *
   * @param {RDF.Term | RegExp} subject   The optional exact subject or subject regex to match.
   * @param {RDF.Term | RegExp} predicate The optional exact predicate or predicate regex to match.
   * @param {RDF.Term | RegExp} object    The optional exact object or object regex to match.
   * @param {RDF.Term | RegExp} graph     The optional exact graph or graph regex to match.
   * @return {RDF.Stream} The resulting quad stream.
   */
  matchLazy?(subject?: RDF.Term | RegExp, predicate?: RDF.Term | RegExp, object?: RDF.Term | RegExp,
             graph?: RDF.Term | RegExp): AsyncIterator<Q> & RDF.Stream<Q>;
}
