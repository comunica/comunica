import {ActionContext, Actor, IAction, IActorArgs, IActorOutput, IActorTest} from "@comunica/core";
import {AsyncIterator} from "asynciterator";
import * as RDF from "rdf-js";

/**
 * A comunica actor for rdf-resolve-quad-pattern events.
 *
 * Actor types:
 * * Input:  IActionRdfResolveQuadPattern:      A quad pattern and an optional context.
 * * Test:   <none>
 * * Output: IActorRdfResolveQuadPatternOutput: The resulting quad stream and optional metadata.
 *
 * @see IActionRdfResolveQuadPattern
 * @see IActorRdfResolveQuadPatternOutput
 */
export abstract class ActorRdfResolveQuadPattern extends Actor<IActionRdfResolveQuadPattern, IActorTest,
  IActorRdfResolveQuadPatternOutput> {

  constructor(args: IActorArgs<IActionRdfResolveQuadPattern, IActorTest, IActorRdfResolveQuadPatternOutput>) {
    super(args);
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

  /**
   * Get the sources from the given context.
   * @param {ActionContext} context An optional context.
   * @return {{type: string; value: string}[]} The array of sources or null.
   */
  protected getContextSources(context?: ActionContext): { type: string, value: string }[] {
    return context ? context.get(KEY_CONTEXT_SOURCES) : null;
  }

  /**
   * Check if the given context has a single source of the given type.
   * @param {string} requiredType The required source type name.
   * @param {ActionContext} context An optional context.
   * @return {boolean} If the given context has a single source of the given type.
   */
  protected hasContextSingleSource(requiredType: string, context?: ActionContext): boolean {
    const sources = this.getContextSources(context);
    return !!(sources && sources.length === 1 && sources[0].type === requiredType && sources[0].value);
  }

}

/**
 * @type {string} Context entry for data sources.
 * @value { type: string; value: any }[] An array of sources.
 */
export const KEY_CONTEXT_SOURCES: string = '@comunica/bus-rdf-resolve-quad-pattern:sources';

export interface IActionRdfResolveQuadPattern extends IAction {
  /**
   * The quad pattern to resolve.
   */
  pattern: RDF.Quad;
}

export interface IActorRdfResolveQuadPatternOutput extends IActorOutput {
  /**
   * The resulting quad data stream.
   */
  data: AsyncIterator<RDF.Quad> & RDF.Stream;
  /**
   * Callback that returns a promise that resolves to the metadata about the resulting stream.
   * This metadata can contain things like the estimated number of total quads,
   * or the order in which the quads appear.
   */
  metadata?: () => Promise<{[id: string]: any}>;
}
