import {ActionContext, IActorArgs, IActorTest} from "@comunica/core";
import {AsyncIterator} from "asynciterator";
import * as RDF from "rdf-js";
import {
  ActorRdfResolveQuadPattern, IActionRdfResolveQuadPattern,
  IActorRdfResolveQuadPatternOutput, KEY_CONTEXT_SOURCES,
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
    if (term && (term.termType === 'Variable' || term.termType === 'BlankNode')) {
      return null;
    }
    return term;
  }

  public async test(action: IActionRdfResolveQuadPattern): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionRdfResolveQuadPattern): Promise<IActorRdfResolveQuadPatternOutput> {
    const source: RDF.Source = await this.getSource(action.context);
    const output: IActorRdfResolveQuadPatternOutput = await this.getOutput(source, action.pattern, action.context);
    if (output.metadata) {
      output.metadata = ActorRdfResolveQuadPattern.cachifyMetadata(output.metadata);
    }
    return output;
  }

  /**
   * Get the output of the given action on a source.
   * @param {RDF.Source} source An RDFJS source, possibly lazy.
   * @param {RDF.BaseQuad} pattern The resolve action.
   * @param ActionContext context Optional context data.
   * @return {Promise<IActorRdfResolveQuadPatternOutput>} A promise that resolves to a hash containing
   *                                                      a data RDFJS stream and an optional metadata hash.
   */
  protected async getOutput(source: ILazyQuadSource, pattern: RDF.BaseQuad, context: ActionContext)
  : Promise<IActorRdfResolveQuadPatternOutput> {
    if (source.matchLazy) {
      return { data: source.matchLazy(
        ActorRdfResolveQuadPatternSource.variableToNull(pattern.subject),
        ActorRdfResolveQuadPatternSource.variableToNull(pattern.predicate),
        ActorRdfResolveQuadPatternSource.variableToNull(pattern.object),
        ActorRdfResolveQuadPatternSource.variableToNull(pattern.graph),
      ) };
    }
    return { data:
      // TODO: AsyncIterator fix typings
      (<any> AsyncIterator).wrap(source.match(
        ActorRdfResolveQuadPatternSource.variableToNull(pattern.subject),
        ActorRdfResolveQuadPatternSource.variableToNull(pattern.predicate),
        ActorRdfResolveQuadPatternSource.variableToNull(pattern.object),
        ActorRdfResolveQuadPatternSource.variableToNull(pattern.graph),
      )),
    };
  }

  /**
   * Get a source instance for the given context.
   * @param ActionContext context Optional context data.
   * @return {Promise<RDF.Source>} A promise that resolves to a source.
   */
  protected abstract getSource(context: ActionContext): Promise<ILazyQuadSource>;

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
