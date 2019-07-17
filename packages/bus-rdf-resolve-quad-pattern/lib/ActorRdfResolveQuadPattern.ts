import {ActionContext, Actor, IAction, IActorArgs, IActorOutput, IActorTest} from "@comunica/core";
import {AsyncIterator} from "asynciterator";
import {AsyncReiterable} from "asyncreiterable";
import * as RDF from "rdf-js";
import {Algebra} from "sparqlalgebrajs";

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
   * Get the sources from the given context.
   * @param {ActionContext} context An optional context.
   * @return {IDataSource[]} The array of sources or null.
   */
  protected getContextSources(context: ActionContext): IDataSource[] {
    return context ? context.get(KEY_CONTEXT_SOURCES) : null;
  }

  /**
   * Get the source from the given context.
   * @param {ActionContext} context An optional context.
   * @return {IDataSource} The source or null.
   */
  protected getContextSource(context: ActionContext): IDataSource {
    return context ? context.get(KEY_CONTEXT_SOURCE) : null;
  }

  /**
   * Get the source's raw URL value from the given context.
   * @param {IDataSource} source A source.
   * @return {string} The URL or null.
   */
  protected getContextSourceUrl(source: IDataSource): string {
    if (source) {
      let fileUrl = getDataSourceValue(source);

      // Remove hashes from source
      const hashPosition = fileUrl.indexOf('#');
      if (hashPosition >= 0) {
        fileUrl = fileUrl.substr(0, hashPosition);
      }

      return fileUrl;
    }
    return null;
  }

  /**
   * Check if the given context has a single source.
   * @param {ActionContext} context An optional context.
   * @return {boolean} If the given context has a single source of the given type.
   */
  protected hasContextSingleSource(context: ActionContext): boolean {
    const source = this.getContextSource(context);
    return !!(source && (typeof source === 'string' || source.value));
  }

  /**
   * Check if the given context has a single source of the given type.
   * @param {string} requiredType The required source type name.
   * @param {ActionContext} context An optional context.
   * @return {boolean} If the given context has a single source of the given type.
   */
  protected hasContextSingleSourceOfType(requiredType: string, context: ActionContext): boolean {
    const source = this.getContextSource(context);
    return !!(source && getDataSourceType(source) === requiredType && getDataSourceValue(source));
  }

}

export type IDataSource = string | {
  type?: string;
  value: any;
};
export function getDataSourceType(dataSource: IDataSource): string {
  return typeof dataSource === 'string' ? '' : dataSource.type;
}
export function getDataSourceValue(dataSource: IDataSource): string {
  return typeof dataSource === 'string' ? dataSource : dataSource.value;
}
export type DataSources = AsyncReiterable<IDataSource>;
/**
 * @type {string} Context entry for data sources.
 * @value {DataSources} An array or stream of sources.
 */
export const KEY_CONTEXT_SOURCES: string = '@comunica/bus-rdf-resolve-quad-pattern:sources';
/**
 * @type {string} Context entry for a data source.
 * @value {IDataSource} A source.
 */
export const KEY_CONTEXT_SOURCE: string = '@comunica/bus-rdf-resolve-quad-pattern:source';

export interface IActionRdfResolveQuadPattern extends IAction {
  /**
   * The quad pattern to resolve.
   */
  pattern: Algebra.Pattern;
}

export interface IActorRdfResolveQuadPatternOutput extends IActorOutput {
  /**
   * The resulting quad data stream.
   */
  data: AsyncIterator<RDF.Quad> & RDF.Stream;
  /**
   * Callback that returns a promise that resolves to the metadata about the stream.
   * This can contain things like the estimated number of total stream elements,
   * or the order in which the bindings appear.
   * This callback can be invoked multiple times.
   * The actors that return this metadata will make sure that multiple calls properly cache this promise.
   * Metadata will not be collected until this callback is invoked.
   */
  metadata: () => Promise<{[id: string]: any}>;
}
