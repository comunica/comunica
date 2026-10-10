import type { Algebra } from '@comunica/utils-algebra';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import type { BindingsStream } from './Bindings';
import type { IActionContext } from './IActionContext';
import type { QueryAlgebraContext, QueryStringContext } from './IQueryContext';
import type { IQueryExplained, QueryEnhanced, QueryExplainMode } from './IQueryOperationResult';
import type { QuerySourceUnidentified } from './IQuerySource';

export type QueryFormatType = string | Algebra.Operation;
export type SourceType = QuerySourceUnidentified;
export type QueryType = QueryEnhanced & { context?: IActionContext };

/**
 * Quads to insert into and delete from a destination, and graphs to delete and create in it.
 */
export interface IQuadUpdate {
  /**
   * An optional stream of quads to insert.
   */
  quadStreamInsert?: AsyncIterator<RDF.Quad>;
  /**
   * An optional stream of quads to delete.
   */
  quadStreamDelete?: AsyncIterator<RDF.Quad>;
  /**
   * An optional deletion of graphs.
   */
  deleteGraphs?: {
    /**
     * The graph(s) in which all triples must be removed.
     */
    graphs: RDF.DefaultGraph | 'NAMED' | 'ALL' | RDF.NamedNode[];
    /**
     * If true, and the graph does not exist, an error must be emitted.
     *
     * Should only be considered on destinations that record empty graphs.
     */
    requireExistence: boolean;
    /**
     * If the graph itself should also be dropped.
     * Should not happen on the 'DEFAULT' graph.
     *
     * Should only be considered on destinations that record empty graphs.
     */
    dropGraphs: boolean;
  };
  /**
   * An optional creation of (empty) graphs.
   */
  createGraphs?: {
    /**
     * The graph names to create.
     */
    graphs: RDF.NamedNode[];
    /**
     * If true, an error MUST be thrown when the graph already exists.
     *
     * For destinations that do not record empty graphs,
     * this should only throw if at least one quad with the given quad already exists.
     */
    requireNonExistence: boolean;
  };
}

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
   *              Algebra objects must not contain blank nodes. They should be converted to variables.
   * @param context A context.
   */
  queryBindings: <QueryFormatTypeInner extends QueryFormatType>(
    query: QueryFormatTypeInner,
    context?: QueryFormatTypeInner extends string ? QueryStringContextInner : QueryAlgebraContextInner,
  ) => Promise<BindingsStream>;

  /**
   * Query the quad results of a CONSTRUCT or DESCRIBE query.
   * @param query A query string or algebra object.
   *              Algebra objects must not contain blank nodes. They should be converted to variables.
   * @param context A context.
   */
  queryQuads: <QueryFormatTypeInner extends QueryFormatType>(
    query: QueryFormatTypeInner,
    context?: QueryFormatTypeInner extends string ? QueryStringContextInner : QueryAlgebraContextInner,
  ) => Promise<AsyncIterator<RDF.Quad> & RDF.ResultStream<RDF.Quad>>;

  /**
   * Query the boolean result of an ASK query.
   * @param query A query string or algebra object.
   *              Algebra objects must not contain blank nodes. They should be converted to variables.
   * @param context A context.
   */
  queryBoolean: <QueryFormatTypeInner extends QueryFormatType>(
    query: QueryFormatTypeInner,
    context?: QueryFormatTypeInner extends string ? QueryStringContextInner : QueryAlgebraContextInner,
  ) => Promise<boolean>;

  /**
   * Execute an UPDATE query.
   * @param query A query string or algebra object.
   *              Algebra objects must not contain blank nodes. They should be converted to variables.
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
   *              Algebra objects must not contain blank nodes. They should be converted to variables.
   * @param context A context.
   */
  query: <QueryFormatTypeInner extends QueryFormatType>(
    query: QueryFormatTypeInner,
    context?: QueryFormatTypeInner extends string ? QueryStringContextInner : QueryAlgebraContextInner,
  ) => Promise<QueryType>;

  /**
   * Explain the given query
   * @param {string | Algebra.Operation} query A query string or algebra.
   *                                           Algebra objects must not contain blank nodes.
   *                                           They should be converted to variables.
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
  // TODO: make mandatory in next/major
  /**
   * Update the destination with the given quads and graphs, without serializing them into an update query.
   * @param update The quads to insert and delete, and the graphs to delete and create.
   * @param context A context, which determines the destination in the same way as for update queries.
   * @return {Promise<void>} A promise that resolves when the destination has been updated.
   */
  updateQuads?: (update: IQuadUpdate, context?: Partial<QueryAlgebraContextInner>) => Promise<void>;
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
