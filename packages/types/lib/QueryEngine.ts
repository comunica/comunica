import type { Algebra } from 'sparqlalgebrajs';
import type { IActionContext } from './ActionContext';
import type { IQueryableResult, IQueryExplained } from './QueryableResult';

export interface IQueryEngine {
  /**
   * Evaluate the given query
   * @param {string | Algebra.Operation} query A query string or algebra.
   * @param context An optional query context.
   * @return {Promise<IQueryableResult>} A promise that resolves to the query output.
   */
  query: (query: string | Algebra.Operation, context?: any) => Promise<IQueryableResult>;
  /**
   * Evaluate the given query
   * @param {string | Algebra.Operation} query A query string or algebra.
   * @param context An optional query context.
   * @return {Promise<IQueryableResult | IQueryExplained>}
   *  A promise that resolves to the query output.
   */
  queryOrExplain: (
    query: string | Algebra.Operation,
    context?: any,
  ) => Promise<IQueryableResult | IQueryExplained>;
  /**
   * @param context An optional context.
   * @return {Promise<{[p: string]: number}>} All available SPARQL (weighted) result media types.
   */
  getResultMediaTypes: (context: IActionContext) => Promise<Record<string, number>>;
  /**
   * @param context An optional context.
   * @return {Promise<{[p: string]: number}>} All available SPARQL result media type formats.
   */
  getResultMediaTypeFormats: (context: IActionContext) => Promise<Record<string, string>>;
  /**
   * Convert a query result to a string stream based on a certain media type.
   * @param {IQueryableResult} queryResult A query result.
   * @param {string} mediaType A media type.
   * @param {ActionContext} context An optional context.
   * @return {Promise<IActorQueryResultSerializeOutput>} A text stream.
   */
  resultToString: (queryResult: IQueryableResult, mediaType?: string, context?: any) => any;
  /**
   * Invalidate all internal caches related to the given page URL.
   * If no page URL is given, then all pages will be invalidated.
   * @param {string} url The page URL to invalidate.
   * @return {Promise<any>} A promise resolving when the caches have been invalidated.
   */
  invalidateHttpCache: (url?: string) => Promise<any>;
}
