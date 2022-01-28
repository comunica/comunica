import { BindingsFactory } from '@comunica/bindings-factory';
import { materializeOperation } from '@comunica/bus-query-operation';
import type { IActionSparqlSerialize, IActorQueryResultSerializeOutput } from '@comunica/bus-query-result-serialize';
import { KeysCore, KeysInitQuery } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import type {
  Bindings, IPhysicalQueryPlanLogger,
  IQueryableResult,
  IQueryableResultBindingsEnhanced,
  IQueryableResultEnhanced, IQueryableResultQuadsEnhanced,
  IQueryEngine, IQueryExplained,
} from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { Algebra } from 'sparqlalgebrajs';
import type { ActorInitQueryBase } from './ActorInitQueryBase';
import { MemoryPhysicalQueryPlanLogger } from './MemoryPhysicalQueryPlanLogger';

const BF = new BindingsFactory();

/**
 * Base implementation of a Comunica query engine.
 */
export class QueryEngineBase implements IQueryEngine {
  private readonly actorInitQuery: ActorInitQueryBase;

  public constructor(actorInitQuery: ActorInitQueryBase) {
    this.actorInitQuery = actorInitQuery;
  }

  /**
   * Add convenience methods to query results
   * @param {IQueryableResult} results Basic query results.
   * @return {IQueryableResultEnhanced} Same query results with added fields.
   */
  public static enhanceQueryResults(results: IQueryableResult): IQueryableResultEnhanced {
    // Set bindings
    if (results.type === 'bindings') {
      (<IQueryableResultBindingsEnhanced> results).bindings = () => new Promise((resolve, reject) => {
        const result: Bindings[] = [];
        results.bindingsStream.on('data', data => {
          result.push(data);
        });
        results.bindingsStream.on('end', () => {
          resolve(result);
        });
        results.bindingsStream.on('error', reject);
      });
    } else if (results.type === 'quads') {
      (<IQueryableResultQuadsEnhanced>results).quads = () => new Promise((resolve, reject) => {
        const result: RDF.Quad[] = [];
        results.quadStream.on('data', data => {
          result.push(data);
        });
        results.quadStream.on('end', () => {
          resolve(result);
        });
        results.quadStream.on('error', reject);
      });
    }
    return <IQueryableResultEnhanced> results;
  }

  /**
   * Evaluate the given query
   * @param {string | Algebra.Operation} query A query string or algebra.
   * @param context An optional query context.
   * @return {Promise<IQueryableResultEnhanced>} A promise that resolves to the query output.
   */
  public async query(query: string | Algebra.Operation, context?: any): Promise<IQueryableResultEnhanced> {
    const output = await this.queryOrExplain(query, context);
    if ('explain' in output) {
      throw new Error(`Tried to explain a query when in query-only mode`);
    }
    return output;
  }

  /**
   * Evaluate or explain the given query
   * @param {string | Algebra.Operation} query A query string or algebra.
   * @param context An optional query context.
   * @return {Promise<IQueryableResultEnhanced | IQueryExplained>} A promise that resolves to
   *                                                               the query output or explanation.
   */
  public async queryOrExplain(
    query: string | Algebra.Operation,
    context?: any,
  ): Promise<IQueryableResultEnhanced | IQueryExplained> {
    context = context || {};

    // Expand shortcuts
    for (const key in context) {
      if (this.actorInitQuery.contextKeyShortcuts[key]) {
        context[this.actorInitQuery.contextKeyShortcuts[key]] = context[key];
        delete context[key];
      }
    }

    // Set the default logger if none is provided
    if (!context[KeysCore.log.name]) {
      context[KeysCore.log.name] = this.actorInitQuery.logger;
    }

    if (!context[KeysInitQuery.queryTimestamp.name]) {
      context[KeysInitQuery.queryTimestamp.name] = new Date();
    }

    // Prepare context
    context = new ActionContext(context);
    let queryFormat = 'sparql';
    if (context && context.has(KeysInitQuery.queryFormat)) {
      queryFormat = context.get(KeysInitQuery.queryFormat);
      context = context.delete(KeysInitQuery.queryFormat);
      if (queryFormat === 'graphql' && !context.has(KeysInitQuery.graphqlSingularizeVariables)) {
        context = context.set(KeysInitQuery.graphqlSingularizeVariables, {});
      }
    }
    let baseIRI: string | undefined;
    if (context && context.has(KeysInitQuery.baseIRI)) {
      baseIRI = context.get(KeysInitQuery.baseIRI);
    }

    // Pre-processing the context
    context = (await this.actorInitQuery.mediatorContextPreprocess.mediate({ context })).context;

    // Determine explain mode
    const explainMode = context.get(KeysInitQuery.explain);

    // Parse query
    let operation: Algebra.Operation;
    if (typeof query === 'string') {
      // Save the original query string in the context
      context = context.set(KeysInitQuery.queryString, query);
      const queryParseOutput = await this.actorInitQuery.mediatorQueryParse
        .mediate({ context, query, queryFormat, baseIRI });
      operation = queryParseOutput.operation;
      // Update the baseIRI in the context if the query modified it.
      if (queryParseOutput.baseIRI) {
        context = context.set(KeysInitQuery.baseIRI, queryParseOutput.baseIRI);
      }
    } else {
      operation = query;
    }

    // Print parsed query
    if (explainMode === 'parsed') {
      return {
        explain: true,
        type: explainMode,
        data: operation,
      };
    }

    // Apply initial bindings in context
    if (context.has(KeysInitQuery.initialBindings)) {
      operation = materializeOperation(operation, context.get(KeysInitQuery.initialBindings));
    }

    // Optimize the query operation
    const mediatorResult = await this.actorInitQuery.mediatorOptimizeQueryOperation.mediate({ context, operation });
    operation = mediatorResult.operation;
    context = mediatorResult.context || context;

    // Print logical query plan
    if (explainMode === 'logical') {
      return {
        explain: true,
        type: explainMode,
        data: operation,
      };
    }

    // Save original query in context
    context = context.set(KeysInitQuery.query, operation);

    // If we need a physical query plan, store a physical query plan logger in the context, and collect it after exec
    let physicalQueryPlanLogger: IPhysicalQueryPlanLogger | undefined;
    if (explainMode === 'physical') {
      physicalQueryPlanLogger = new MemoryPhysicalQueryPlanLogger();
      context = context.set(KeysInitQuery.physicalQueryPlanLogger, physicalQueryPlanLogger);
    }

    // Execute query
    const output = QueryEngineBase.enhanceQueryResults(await this.actorInitQuery.mediatorQueryOperation.mediate({
      context,
      operation,
    }));
    output.context = context;

    // Output physical query plan after query exec if needed
    if (physicalQueryPlanLogger) {
      // Make sure the whole result is produced
      switch (output.type) {
        case 'bindings':
          await output.bindings();
          break;
        case 'quads':
          await output.quads();
          break;
        case 'boolean':
          await output.booleanResult;
          break;
        case 'update':
          await output.updateResult;
          break;
      }

      return {
        explain: true,
        type: explainMode,
        data: physicalQueryPlanLogger.toJson(),
      };
    }

    return output;
  }

  /**
   * @param context An optional context.
   * @return {Promise<{[p: string]: number}>} All available SPARQL (weighted) result media types.
   */
  public async getResultMediaTypes(context?: any): Promise<Record<string, number>> {
    context = ActionContext.ensureActionContext(context);
    return (await this.actorInitQuery.mediatorQueryResultSerializeMediaTypeCombiner
      .mediate({ context, mediaTypes: true })).mediaTypes;
  }

  /**
   * @param context An optional context.
   * @return {Promise<{[p: string]: number}>} All available SPARQL result media type formats.
   */
  public async getResultMediaTypeFormats(context?: any): Promise<Record<string, string>> {
    context = ActionContext.ensureActionContext(context);
    return (await this.actorInitQuery.mediatorQueryResultSerializeMediaTypeFormatCombiner
      .mediate({ context, mediaTypeFormats: true })).mediaTypeFormats;
  }

  /**
   * Convert a query result to a string stream based on a certain media type.
   * @param {IQueryableResult} queryResult A query result.
   * @param {string} mediaType A media type.
   * @param {ActionContext} context An optional context.
   * @return {Promise<IActorQueryResultSerializeOutput>} A text stream.
   */
  public async resultToString(queryResult: IQueryableResult, mediaType?: string, context?: any):
  Promise<IActorQueryResultSerializeOutput> {
    context = ActionContext.ensureActionContext(context);
    if (!mediaType) {
      switch (queryResult.type) {
        case 'bindings':
          mediaType = 'application/json';
          break;
        case 'quads':
          mediaType = 'application/trig';
          break;
        default:
          mediaType = 'simple';
          break;
      }
    }
    const handle: IActionSparqlSerialize = { ...queryResult, context };
    return (await this.actorInitQuery.mediatorQueryResultSerialize
      .mediate({ context, handle, handleMediaType: mediaType })).handle;
  }

  /**
   * Invalidate all internal caches related to the given page URL.
   * If no page URL is given, then all pages will be invalidated.
   * @param {string} url The page URL to invalidate.
   * @param context An optional ActionContext to pass to the actors.
   * @return {Promise<any>} A promise resolving when the caches have been invalidated.
   */
  public invalidateHttpCache(url?: string, context?: any): Promise<any> {
    context = ActionContext.ensureActionContext(context);
    return this.actorInitQuery.mediatorHttpInvalidate.mediate({ url, context });
  }
}
