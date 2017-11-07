import {IActorArgs, IActorTest} from "@comunica/core";
import * as RDF from "rdf-js";
import {
  ActorRdfResolveQuadPattern, IActionRdfResolveQuadPattern,
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

  public async test(action: IActionRdfResolveQuadPattern): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionRdfResolveQuadPattern): Promise<IActorRdfResolveQuadPatternOutput> {
    const source: RDF.Source = await this.getSource(action.context);
    return await this.getOutput(source, action.pattern, action.context);
  }

  /**
   * Get the output of the given action on a source.
   * @param {RDF.Source} source An RDFJS source.
   * @param {RDF.Quad} pattern The resolve action.
   * @param {{[p: string]: any}} context Optional context data.
   * @return {Promise<IActorRdfResolveQuadPatternOutput>} A promise that resolves to a hash containing
   *                                                      a data RDFJS stream and an optional metadata hash.
   */
  protected async getOutput(source: RDF.Source, pattern: RDF.Quad, context?: {[id: string]: any})
  : Promise<IActorRdfResolveQuadPatternOutput> {
    const data: RDF.Stream = source.match(
      pattern.subject,
      pattern.predicate,
      pattern.object,
      pattern.graph,
    );
    return { data };
  }

  /**
   * Get a source instance for the given context.
   * @param {{[p: string]: any}} context Optional context data.
   * @return {Promise<RDF.Source>} A promise that resolves to a source.
   */
  protected abstract getSource(context?: {[id: string]: any}): Promise<RDF.Source>;

}
