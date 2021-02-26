import { KeysRdfResolveQuadPattern } from '@comunica/context-entries';
import type { ActionContext, IAction, IActorArgs, IActorOutput, IActorTest } from '@comunica/core';
import { Actor } from '@comunica/core';
import type { AsyncIterator } from 'asynciterator';
import type * as RDF from 'rdf-js';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * @type {string} Context entry for data sources.
 * @value {DataSources} An array of sources.
 * @deprecated Import this constant from @comunica/context-entries.
 */
export const KEY_CONTEXT_SOURCES = KeysRdfResolveQuadPattern.sources;
/**
 * @type {string} Context entry for a data source.
 * @value {IDataSource} A source.
 * @deprecated Import this constant from @comunica/context-entries.
 */
export const KEY_CONTEXT_SOURCE = KeysRdfResolveQuadPattern.source;

export function isDataSourceRawType(dataSource: IDataSource): dataSource is string | RDF.Source {
  return typeof dataSource === 'string' || 'match' in dataSource;
}
export function getDataSourceType(dataSource: IDataSource): string | undefined {
  if (typeof dataSource === 'string') {
    return '';
  }
  return 'match' in dataSource ? 'rdfjsSource' : dataSource.type;
}
export function getDataSourceValue(dataSource: IDataSource): string | RDF.Source {
  return isDataSourceRawType(dataSource) ? dataSource : dataSource.value;
}
export function getDataSourceContext(dataSource: IDataSource, context: ActionContext): ActionContext {
  if (typeof dataSource === 'string' || 'match' in dataSource || !dataSource.context) {
    return context;
  }
  return context.merge(dataSource.context);
}

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
  public constructor(args: IActorArgs<IActionRdfResolveQuadPattern, IActorTest, IActorRdfResolveQuadPatternOutput>) {
    super(args);
  }

  /**
   * Get the sources from the given context.
   * @param {ActionContext} context An optional context.
   * @return {IDataSource[]} The array of sources or undefined.
   */
  protected getContextSources(context?: ActionContext): DataSources | undefined {
    return context ? context.get(KeysRdfResolveQuadPattern.sources) : undefined;
  }

  /**
   * Get the source from the given context.
   * @param {ActionContext} context An optional context.
   * @return {IDataSource} The source or undefined.
   */
  protected getContextSource(context?: ActionContext): IDataSource | undefined {
    return context ? context.get(KeysRdfResolveQuadPattern.source) : undefined;
  }

  /**
   * Get the source's raw URL value from the given context.
   * @param {IDataSource} source A source.
   * @return {string} The URL or null.
   */
  protected getContextSourceUrl(source?: IDataSource): string | undefined {
    if (source) {
      let fileUrl = getDataSourceValue(source);
      if (typeof fileUrl === 'string') {
        // Remove hashes from source
        const hashPosition = fileUrl.indexOf('#');
        if (hashPosition >= 0) {
          fileUrl = fileUrl.slice(0, hashPosition);
        }

        return fileUrl;
      }
    }
  }

  /**
   * Check if the given context has a single source.
   * @param {ActionContext} context An optional context.
   * @return {boolean} If the given context has a single source of the given type.
   */
  protected hasContextSingleSource(context?: ActionContext): boolean {
    const source = this.getContextSource(context);
    return Boolean(source && (isDataSourceRawType(source) || source.value));
  }

  /**
   * Check if the given context has a single source of the given type.
   * @param {string} requiredType The required source type name.
   * @param {ActionContext} context An optional context.
   * @return {boolean} If the given context has a single source of the given type.
   */
  protected hasContextSingleSourceOfType(requiredType: string, context?: ActionContext): boolean {
    const source = this.getContextSource(context);
    return Boolean(source && getDataSourceType(source) === requiredType && getDataSourceValue(source));
  }
}

export type IDataSource = string | RDF.Source | {
  type?: string;
  value: string | RDF.Source;
  context?: ActionContext;
};
export type DataSources = IDataSource[];

export interface IActionRdfResolveQuadPattern extends IAction {
  /**
   * The quad pattern to resolve.
   */
  pattern: Algebra.Pattern;
}

export interface IActorRdfResolveQuadPatternOutput extends IActorOutput {
  /**
   * The resulting quad data stream.
   *
   * The returned stream MUST expose the property 'metadata'.
   * The implementor is reponsible for handling cases where 'metadata'
   * is being called without the stream being in flow-mode.
   * This metadata object MUST be a hash, and MAY be empty.
   * It is recommended to contain at least totalItems as an estimate of the number of quads that will be in the stream.
   */
  data: AsyncIterator<RDF.Quad>;
}
