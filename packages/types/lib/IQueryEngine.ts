import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import type { Algebra } from 'sparqlalgebrajs';
import type { BindingsStream } from './Bindings';
import type { IActionContext } from './IActionContext';
import type { QueryAlgebraContext, QueryStringContext } from './IQueryContext';
import type { IQueryExplained, QueryEnhanced, QueryExplainMode } from './IQueryOperationResult';
import type { QuerySourceUnidentified } from './IQuerySource';

export type QueryFormatType = string | Algebra.Operation;
export type SourceType = QuerySourceUnidentified;
export type QueryType = QueryEnhanced & { context?: IActionContext };

/**
 * Base interface for a Comunica query engine.
 */
export interface IQueryEngine<
  QueryStringContextInner extends RDF.QueryStringContext = QueryStringContext,
  QueryAlgebraContextInner extends RDF.QueryAlgebraContext = QueryAlgebraContext,
> extends
  RDF.StringQueryable<RDF.AllMetadataSupport, QueryStringContextInner>,
  RDF.AlgebraQueryable<Algebra.Operation, RDF.AllMetadataSupport, QueryAlgebraContextInner>,
  RDF.StringSparqlQueryable<RDF.SparqlResultSupport, QueryStringContextInner>,
  RDF.AlgebraSparqlQueryable<Algebra.Operation, RDF.SparqlResultSupport, QueryAlgebraContextInner> {

  /**
   * Query the bindings results of a SELECT query.
   * @param query A query string or algebra object.
   * @param context A context.
   */
  queryBindings: <QueryFormatTypeInner extends QueryFormatType>(
    query: QueryFormatTypeInner,
    context?: QueryFormatTypeInner extends string ? QueryStringContextInner : QueryAlgebraContextInner,
  ) => Promise<BindingsStream>;

  /**
   * Query the quad results of a CONSTRUCT or DESCRIBE query.
   * @param query A query string or algebra object.
   * @param context A context.
   */
  queryQuads: <QueryFormatTypeInner extends QueryFormatType>(
    query: QueryFormatTypeInner,
    context?: QueryFormatTypeInner extends string ? QueryStringContextInner : QueryAlgebraContextInner,
  ) => Promise<AsyncIterator<RDF.Quad> & RDF.ResultStream<RDF.Quad>>;

  /**
   * Query the boolean result of an ASK query.
   * @param query A query string or algebra object.
   * @param context A context.
   */
  queryBoolean: <QueryFormatTypeInner extends QueryFormatType>(
    query: QueryFormatTypeInner,
    context?: QueryFormatTypeInner extends string ? QueryStringContextInner : QueryAlgebraContextInner,
  ) => Promise<boolean>;

  /**
   * Execute an UPDATE query.
   * @param query A query string or algebra object.
   * @param context A context.
   */
  queryVoid: <QueryFormatTypeInner extends QueryFormatType>(
    query: QueryFormatTypeInner,
    context?: QueryFormatTypeInner extends string ? QueryStringContextInner : QueryAlgebraContextInner,
  ) => Promise<void>;

  /**
   * Initiate a given query.
   * This will produce a future to a query result, which has to be executed to obtain the query results.
   * This can reject given an unsupported or invalid query.
   *
   * This method is prefered in case you don't know beforehand what type of query will be executed,
   * or if you require access to the metadata of the results.
   *
   * @param query A query string or algebra object.
   * @param context A context.
   */
  query: <QueryFormatTypeInner extends QueryFormatType>(
    query: QueryFormatTypeInner,
    context?: QueryFormatTypeInner extends string ? QueryStringContextInner : QueryAlgebraContextInner,
  ) => Promise<QueryType>;

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
    context: QueryFormatTypeInner extends string ? QueryStringContextInner : QueryAlgebraContextInner,
    explainMode: QueryExplainMode,
  ) => Promise<IQueryExplained>;
  /**
   * @param context An optional context.
   * @return {Promise<{[p: string]: number}>} All available SPARQL (weighted) result media types.
   */
  getResultMediaTypes: (context?: IActionContext) => Promise<Record<string, number>>;
  /**
   * @param context An optional context.
   * @return {Promise<{[p: string]: number}>} All available SPARQL result media type formats.
   */
  getResultMediaTypeFormats: (context?: IActionContext) => Promise<Record<string, string>>;
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
