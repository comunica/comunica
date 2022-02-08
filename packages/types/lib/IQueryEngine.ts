import type * as RDF from '@rdfjs/types';
import type { Algebra } from 'sparqlalgebrajs';
import type { IActionContext } from './IActionContext';
import type { IDataSource } from './IDataSource';
import type { QueryAlgebraContext, QueryStringContext } from './IQueryContext';
import type { IQueryExplained, QueryEnhanced, QueryExplainMode } from './IQueryOperationResult';

export type QueryFormatType = string | Algebra.Operation;
export type SourceType = IDataSource;
export type QueryType = QueryEnhanced & { context?: IActionContext };

/**
 * Base interface for a Comunica query engine.
 */
export interface IQueryEngine extends
  RDF.Queryable<QueryFormatType, SourceType, RDF.AllMetadataSupport, QueryType, QueryStringContext,
  QueryAlgebraContext>,
  RDF.SparqlQueryable<QueryFormatType, SourceType, QueryStringContext, QueryAlgebraContext, RDF.SparqlResultSupport> {
  /**
   * Explain the given query
   * @param {string | Algebra.Operation} query A query string or algebra.
   * @param context A query context.
   * @param explainMode The explain mode.
   * @return {Promise<IQueryExplained>}
   *  A promise that resolves to the query output.
   */
  explain: <QueryFormatTypeInner extends QueryFormatType>(
    query: QueryFormatTypeInner,
    context: QueryFormatTypeInner extends string ? QueryStringContext : QueryAlgebraContext,
    explainMode: QueryExplainMode,
  ) => Promise<IQueryExplained>;
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
   * @param {QueryType} queryResult A query result.
   * @param {string} mediaType A media type.
   * @param {IActionContext} context An optional context.
   * @return {Promise<IActorQueryResultSerializeOutput>} A text stream.
   */
  resultToString: (queryResult: QueryType, mediaType?: string, context?: any) => any;
  /**
   * Invalidate all internal caches related to the given page URL.
   * If no page URL is given, then all pages will be invalidated.
   * @param {string} url The page URL to invalidate.
   * @return {Promise<any>} A promise resolving when the caches have been invalidated.
   */
  invalidateHttpCache: (url?: string) => Promise<any>;
}
