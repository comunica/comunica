import { materializeOperation } from '@comunica/bus-query-operation';
import type { IActionSparqlSerialize, IActorQueryResultSerializeOutput } from '@comunica/bus-query-result-serialize';
import { KeysCore, KeysInitQuery, KeysRdfResolveQuadPattern } from '@comunica/context-entries';
import { ActionContext } from '@comunica/core';
import type { IActionContext, IPhysicalQueryPlanLogger,
  IQueryOperationResult,
  IQueryEngine, IQueryExplained,
  QueryFormatType,
  QueryType, QueryExplainMode, BindingsStream,
  QueryAlgebraContext, QueryStringContext, IQueryBindingsEnhanced,
  IQueryQuadsEnhanced, QueryEnhanced, IQueryContextCommon } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import type { Algebra } from 'sparqlalgebrajs';
import type { ActorInitQueryBase } from './ActorInitQueryBase';
import { MemoryPhysicalQueryPlanLogger } from './MemoryPhysicalQueryPlanLogger';

/**
 * Base implementation of a Comunica query engine.
 */
export class QueryEngineBase<QueryContext extends IQueryContextCommon = IQueryContextCommon>
implements IQueryEngine<QueryContext> {
  private readonly actorInitQuery: ActorInitQueryBase;

  public constructor(actorInitQuery: ActorInitQueryBase<QueryContext>) {
    this.actorInitQuery = actorInitQuery;
  }

  public async queryBindings<QueryFormatTypeInner extends QueryFormatType>(
    query: QueryFormatTypeInner,
    context?: QueryContext & QueryFormatTypeInner extends string ? QueryStringContext : QueryAlgebraContext,
  ): Promise<BindingsStream> {
    return this.queryOfType<QueryFormatTypeInner, IQueryBindingsEnhanced>(query, context, 'bindings');
  }

  public async queryQuads<QueryFormatTypeInner extends QueryFormatType>(
    query: QueryFormatTypeInner,
    context?: QueryContext & QueryFormatTypeInner extends string ? QueryStringContext : QueryAlgebraContext,
  ): Promise<AsyncIterator<RDF.Quad> & RDF.ResultStream<RDF.Quad>> {
    return this.queryOfType<QueryFormatTypeInner, IQueryQuadsEnhanced>(query, context, 'quads');
  }

  public async queryBoolean<QueryFormatTypeInner extends QueryFormatType>(
    query: QueryFormatTypeInner,
    context?: QueryContext & QueryFormatTypeInner extends string ? QueryStringContext : QueryAlgebraContext,
  ): Promise<boolean> {
    return this.queryOfType<QueryFormatTypeInner, RDF.QueryBoolean>(query, context, 'boolean');
  }

  public async queryVoid<QueryFormatTypeInner extends QueryFormatType>(
    query: QueryFormatTypeInner,
    context?: QueryContext & QueryFormatTypeInner extends string ? QueryStringContext : QueryAlgebraContext,
  ): Promise<void> {
    return this.queryOfType<QueryFormatTypeInner, RDF.QueryVoid>(query, context, 'void');
  }

  protected async queryOfType<QueryFormatTypeInner extends QueryFormatType, QueryTypeOut extends QueryEnhanced>(
    query: QueryFormatTypeInner,
    context: undefined | (QueryContext & QueryFormatTypeInner extends string ?
      QueryStringContext : QueryAlgebraContext),
    expectedType: QueryTypeOut['resultType'],
  ): Promise<ReturnType<QueryTypeOut['execute']>> {
    const result = await this.query<QueryFormatTypeInner>(query, context);
    if (result.resultType === expectedType) {
      return result.execute();
    }
    throw new Error(`Query result type '${expectedType}' was expected, while '${result.resultType}' was found.`);
  }

  /**
   * Evaluate the given query
   * @param query A query string or algebra.
   * @param context An optional query context.
   * @return {Promise<QueryType>} A promise that resolves to the query output.
   */
  public async query<QueryFormatTypeInner extends QueryFormatType>(
    query: QueryFormatTypeInner,
    context?: QueryContext & QueryFormatTypeInner extends string ? QueryStringContext : QueryAlgebraContext,
  ): Promise<QueryType> {
    const output = await this.queryOrExplain(query, context);
    if ('explain' in output) {
      throw new Error(`Tried to explain a query when in query-only mode`);
    }
    return output;
  }

  /**
   * Explain the given query
   * @param {string | Algebra.Operation} query A query string or algebra.
   * @param context An optional query context.
   * @param explainMode The explain mode.
   * @return {Promise<QueryType | IQueryExplained>} A promise that resolves to
   *                                                               the query output or explanation.
   */
  public async explain<QueryFormatTypeInner extends QueryFormatType>(
    query: QueryFormatTypeInner,
    context: QueryContext & QueryFormatTypeInner extends string ? QueryStringContext : QueryAlgebraContext,
    explainMode: QueryExplainMode,
  ): Promise<IQueryExplained> {
    context.explain = explainMode;
    const output = await this.queryOrExplain(query, context);
    return <IQueryExplained> output;
  }

  /**
   * Evaluate or explain the given query
   * @param {string | Algebra.Operation} query A query string or algebra.
   * @param context An optional query context.
   * @return {Promise<QueryType | IQueryExplained>} A promise that resolves to
   *                                                               the query output or explanation.
   */
  public async queryOrExplain<QueryFormatTypeInner extends QueryFormatType>(
    query: QueryFormatTypeInner,
    context?: QueryContext & QueryFormatTypeInner extends string ? QueryStringContext : QueryAlgebraContext,
  ): Promise<QueryType | IQueryExplained> {
    context = context || <any>{};

    // Expand shortcuts
    for (const key in context) {
      if (this.actorInitQuery.contextKeyShortcuts[key]) {
        context[this.actorInitQuery.contextKeyShortcuts[key]] = context[key];
        delete context[key];
      }
    }

    // Prepare context
    let actionContext: IActionContext = new ActionContext(context);
    let queryFormat: RDF.QueryFormat = { language: 'sparql', version: '1.1' };
    if (actionContext.has(KeysInitQuery.queryFormat)) {
      queryFormat = actionContext.get(KeysInitQuery.queryFormat)!;
      actionContext = actionContext.delete(KeysInitQuery.queryFormat);
      if (queryFormat.language === 'graphql') {
        actionContext = actionContext.setDefault(KeysInitQuery.graphqlSingularizeVariables, {});
      }
    }
    const baseIRI: string | undefined = actionContext.get(KeysInitQuery.baseIRI);

    actionContext = actionContext
      .setDefault(KeysInitQuery.queryTimestamp, new Date())
      .setDefault(KeysRdfResolveQuadPattern.sourceIds, new Map())
      // Set the default logger if none is provided
      .setDefault(KeysCore.log, this.actorInitQuery.logger);

    // Pre-processing the context
    actionContext = (await this.actorInitQuery.mediatorContextPreprocess.mediate({ context: actionContext })).context;

    // Determine explain mode
    const explainMode: QueryExplainMode = actionContext.get(KeysInitQuery.explain)!;

    // Parse query
    let operation: Algebra.Operation;
    if (typeof query === 'string') {
      // Save the original query string in the context
      actionContext = actionContext.set(KeysInitQuery.queryString, query);

      const queryParseOutput = await this.actorInitQuery.mediatorQueryParse
        .mediate({ context: actionContext, query, queryFormat, baseIRI });
      operation = queryParseOutput.operation;
      // Update the baseIRI in the context if the query modified it.
      if (queryParseOutput.baseIRI) {
        actionContext = actionContext.set(KeysInitQuery.baseIRI, queryParseOutput.baseIRI);
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
    if (actionContext.has(KeysInitQuery.initialBindings)) {
      operation = materializeOperation(operation, actionContext.get(KeysInitQuery.initialBindings)!);

      // Delete the query string from the context, since our initial query might have changed
      actionContext = actionContext.delete(KeysInitQuery.queryString);
    }

    // Optimize the query operation
    const mediatorResult = await this.actorInitQuery.mediatorOptimizeQueryOperation
      .mediate({ context: actionContext, operation });
    operation = mediatorResult.operation;
    actionContext = mediatorResult.context || actionContext;

    // Print logical query plan
    if (explainMode === 'logical') {
      return {
        explain: true,
        type: explainMode,
        data: operation,
      };
    }

    // Save original query in context
    actionContext = actionContext.set(KeysInitQuery.query, operation);

    // If we need a physical query plan, store a physical query plan logger in the context, and collect it after exec
    let physicalQueryPlanLogger: IPhysicalQueryPlanLogger | undefined;
    if (explainMode === 'physical') {
      physicalQueryPlanLogger = new MemoryPhysicalQueryPlanLogger();
      actionContext = actionContext.set(KeysInitQuery.physicalQueryPlanLogger, physicalQueryPlanLogger);
    }

    // Execute query
    const output = await this.actorInitQuery.mediatorQueryOperation.mediate({
      context: actionContext,
      operation,
    });
    output.context = actionContext;

    const finalOutput = QueryEngineBase.internalToFinalResult(output);

    // Output physical query plan after query exec if needed
    if (physicalQueryPlanLogger) {
      // Make sure the whole result is produced
      switch (finalOutput.resultType) {
        case 'bindings':
          await (await finalOutput.execute()).toArray();
          break;
        case 'quads':
          await (await finalOutput.execute()).toArray();
          break;
        case 'boolean':
          await finalOutput.execute();
          break;
        case 'void':
          await finalOutput.execute();
          break;
      }

      return {
        explain: true,
        type: explainMode,
        data: physicalQueryPlanLogger.toJson(),
      };
    }

    return finalOutput;
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
   * @param {IQueryOperationResult} queryResult A query result.
   * @param {string} mediaType A media type.
   * @param {ActionContext} context An optional context.
   * @return {Promise<IActorQueryResultSerializeOutput>} A text stream.
   */
  public async resultToString(queryResult: RDF.Query<any>, mediaType?: string, context?: any):
  Promise<IActorQueryResultSerializeOutput> {
    context = ActionContext.ensureActionContext(context);
    if (!mediaType) {
      switch (queryResult.resultType) {
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
    const handle: IActionSparqlSerialize = { ...await QueryEngineBase.finalToInternalResult(queryResult), context };
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

  /**
   * Convert an internal query result to a final one.
   * @param internalResult An intermediary query result.
   */
  public static internalToFinalResult(internalResult: IQueryOperationResult): QueryType {
    switch (internalResult.type) {
      case 'bindings':
        return {
          resultType: 'bindings',
          execute: async() => internalResult.bindingsStream,
          metadata: async() => <any> await internalResult.metadata(),
          context: internalResult.context,
        };
      case 'quads':
        return {
          resultType: 'quads',
          execute: async() => internalResult.quadStream,
          metadata: async() => <any> await internalResult.metadata(),
          context: internalResult.context,
        };
      case 'boolean':
        return {
          resultType: 'boolean',
          execute: async() => internalResult.execute(),
          context: internalResult.context,
        };
      case 'void':
        return {
          resultType: 'void',
          execute: async() => internalResult.execute(),
          context: internalResult.context,
        };
    }
  }

  /**
   * Convert a final query result to an internal one.
   * @param finalResult A final query result.
   */
  public static async finalToInternalResult(finalResult: RDF.Query<any>): Promise<IQueryOperationResult> {
    switch (finalResult.resultType) {
      case 'bindings':
        return {
          type: 'bindings',
          bindingsStream: <BindingsStream> await finalResult.execute(),
          metadata: async() => <any> await finalResult.metadata(),
        };
      case 'quads':
        return {
          type: 'quads',
          quadStream: <AsyncIterator<RDF.Quad>> await finalResult.execute(),
          metadata: async() => <any> await finalResult.metadata(),
        };
      case 'boolean':
        return {
          type: 'boolean',
          execute: () => finalResult.execute(),
        };
      case 'void':
        return {
          type: 'void',
          execute: () => finalResult.execute(),
        };
    }
  }
}
