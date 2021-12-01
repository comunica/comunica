import { BindingsFactory } from '@comunica/bindings-factory';
import type { IActorContextPreprocessOutput } from '@comunica/bus-context-preprocess';
import type { IActionHttpInvalidate, IActorHttpInvalidateOutput } from '@comunica/bus-http-invalidate';
import type { IActionInit, IActorOutputInit } from '@comunica/bus-init';
import { ActorInit } from '@comunica/bus-init';
import type {
  IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationOutput,
} from '@comunica/bus-optimize-query-operation';
import type { IActionQueryOperation } from '@comunica/bus-query-operation';
import { materializeOperation } from '@comunica/bus-query-operation';
import type { IActionSparqlParse, IActorSparqlParseOutput } from '@comunica/bus-sparql-parse';
import type {
  IActionSparqlSerialize,
  IActionSparqlSerializeHandle,
  IActionSparqlSerializeMediaTypeFormats,
  IActionSparqlSerializeMediaTypes,
  IActorOutputSparqlSerializeHandle, IActorOutputSparqlSerializeMediaTypeFormats,
  IActorOutputSparqlSerializeMediaTypes,
  IActorSparqlSerializeOutput,
  IActorTestSparqlSerializeHandle, IActorTestSparqlSerializeMediaTypeFormats,
  IActorTestSparqlSerializeMediaTypes,
} from '@comunica/bus-sparql-serialize';
import { KeysInitSparql, KeysCore } from '@comunica/context-entries';
import type { Actor, IAction, IActorArgs, IActorTest, Logger, Mediator } from '@comunica/core';
import { ActionContext } from '@comunica/core';
import type {
  IQueryableResult,
  Bindings,
  IQueryEngine,
  IQueryExplained,
  IPhysicalQueryPlanLogger,
  IQueryableResultEnhanced,
  IQueryableResultBindingsEnhanced,
  IQueryableResultQuadsEnhanced,
} from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { Algebra } from 'sparqlalgebrajs';
import { MemoryPhysicalQueryPlanLogger } from './MemoryPhysicalQueryPlanLogger';

const BF = new BindingsFactory();

/**
 * A browser-safe comunica SPARQL Init Actor.
 */
export class ActorInitSparqlBase extends ActorInit implements IActorInitSparqlBaseArgs, IQueryEngine {
  private static readonly ALGEBRA_TYPES: Record<string, boolean> = Object.fromEntries(Object.keys(Algebra.types)
    .map(key => [ (<any> Algebra.types)[key], true ]));

  public readonly mediatorOptimizeQueryOperation: Mediator<Actor<IActionOptimizeQueryOperation, IActorTest,
  IActorOptimizeQueryOperationOutput>, IActionOptimizeQueryOperation, IActorTest, IActorOptimizeQueryOperationOutput>;

  public readonly mediatorQueryOperation: Mediator<Actor<IActionQueryOperation, IActorTest, IQueryableResult>,
  IActionQueryOperation, IActorTest, IQueryableResult>;

  public readonly mediatorSparqlParse: Mediator<Actor<IActionSparqlParse, IActorTest, IActorSparqlParseOutput>,
  IActionSparqlParse, IActorTest, IActorSparqlParseOutput>;

  public readonly mediatorSparqlSerialize: Mediator<
  Actor<IActionSparqlSerializeHandle, IActorTestSparqlSerializeHandle, IActorOutputSparqlSerializeHandle>,
  IActionSparqlSerializeHandle, IActorTestSparqlSerializeHandle, IActorOutputSparqlSerializeHandle>;

  public readonly mediatorSparqlSerializeMediaTypeCombiner: Mediator<
  Actor<IActionSparqlSerializeMediaTypes, IActorTestSparqlSerializeMediaTypes, IActorOutputSparqlSerializeMediaTypes>,
  IActionSparqlSerializeMediaTypes, IActorTestSparqlSerializeMediaTypes, IActorOutputSparqlSerializeMediaTypes>;

  public readonly mediatorSparqlSerializeMediaTypeFormatCombiner: Mediator<
  Actor<IActionSparqlSerializeMediaTypeFormats, IActorTestSparqlSerializeMediaTypeFormats,
  IActorOutputSparqlSerializeMediaTypeFormats>,
  IActionSparqlSerializeMediaTypeFormats, IActorTestSparqlSerializeMediaTypeFormats,
  IActorOutputSparqlSerializeMediaTypeFormats>;

  public readonly mediatorContextPreprocess: Mediator<Actor<IAction, IActorTest,
  IActorContextPreprocessOutput>, IAction, IActorTest, IActorContextPreprocessOutput>;

  public readonly mediatorHttpInvalidate: Mediator<Actor<IActionHttpInvalidate, IActorTest, IActorHttpInvalidateOutput>,
  IActionHttpInvalidate, IActorTest, IActorHttpInvalidateOutput>;

  public readonly logger: Logger;
  public readonly queryString?: string;
  public readonly defaultQueryInputFormat?: string;
  public readonly context?: string;
  public readonly contextKeyShortcuts: Record<string, string>;

  public constructor(args: IActorInitSparqlBaseArgs) {
    super(args);
  }

  /**
   * Add convenience methods to query results
   * @param {IQueryableResult} results Basic query results.
   * @return {IQueryResult} Same query results with added fields.
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

  public async test(action: IActionInit): Promise<IActorTest> {
    return true;
  }

  /**
   * Evaluate the given query
   * @param {string | Algebra.Operation} query A query string or algebra.
   * @param context An optional query context.
   * @return {Promise<IQueryResult>} A promise that resolves to the query output.
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
   * @return {Promise<IQueryResult | IQueryExplained>} A promise that resolves to the query output or explanation.
   */
  public async queryOrExplain(
    query: string | Algebra.Operation,
    context?: any,
  ): Promise<IQueryableResultEnhanced | IQueryExplained> {
    context = context || {};

    // Expand shortcuts
    for (const key in context) {
      if (this.contextKeyShortcuts[key]) {
        const existingEntry = context[key];
        context[this.contextKeyShortcuts[key]] = existingEntry;
        delete context[key];
      }
    }

    // Set the default logger if none is provided
    if (!context[KeysCore.log]) {
      context[KeysCore.log] = this.logger;
    }

    if (!context[KeysInitSparql.queryTimestamp]) {
      context[KeysInitSparql.queryTimestamp] = new Date();
    }

    // Prepare context
    context = ActionContext(context);
    let queryFormat = 'sparql';
    if (context && context.has(KeysInitSparql.queryFormat)) {
      queryFormat = context.get(KeysInitSparql.queryFormat);
      context = context.delete(KeysInitSparql.queryFormat);
      if (queryFormat === 'graphql' && !context.has(KeysInitSparql.graphqlSingularizeVariables)) {
        context = context.set(KeysInitSparql.graphqlSingularizeVariables, {});
      }
    }
    let baseIRI: string | undefined;
    if (context && context.has(KeysInitSparql.baseIRI)) {
      baseIRI = context.get(KeysInitSparql.baseIRI);
    }

    // Pre-processing the context
    context = (await this.mediatorContextPreprocess.mediate({ context })).context;

    // Determine explain mode
    const explainMode = context.get(KeysInitSparql.explain);

    // Parse query
    let operation: Algebra.Operation;
    if (typeof query === 'string') {
      // Save the original query string in the context
      context = context.set(KeysInitSparql.queryString, query);
      const queryParseOutput = await this.mediatorSparqlParse.mediate({ context, query, queryFormat, baseIRI });
      operation = queryParseOutput.operation;
      // Update the baseIRI in the context if the query modified it.
      if (queryParseOutput.baseIRI) {
        context = context.set(KeysInitSparql.baseIRI, queryParseOutput.baseIRI);
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
    if (context.has(KeysInitSparql.initialBindings)) {
      const bindings = context.get(KeysInitSparql.initialBindings);
      operation = materializeOperation(operation, BF.ensureBindings(bindings));
    }

    // Optimize the query operation
    const mediatorResult = await this.mediatorOptimizeQueryOperation.mediate({ context, operation });
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
    context = context.set(KeysInitSparql.query, operation);

    // If we need a physical query plan, store a physical query plan logger in the context, and collect it after exec
    let physicalQueryPlanLogger: IPhysicalQueryPlanLogger | undefined;
    if (explainMode === 'physical') {
      physicalQueryPlanLogger = new MemoryPhysicalQueryPlanLogger();
      context = context.set(KeysInitSparql.physicalQueryPlanLogger, physicalQueryPlanLogger);
    }

    // Execute query
    const output = ActorInitSparqlBase.enhanceQueryResults(await this.mediatorQueryOperation.mediate({
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
  public async getResultMediaTypes(context?: ActionContext): Promise<Record<string, number>> {
    return (await this.mediatorSparqlSerializeMediaTypeCombiner.mediate({ context, mediaTypes: true })).mediaTypes;
  }

  /**
   * @param context An optional context.
   * @return {Promise<{[p: string]: number}>} All available SPARQL result media type formats.
   */
  public async getResultMediaTypeFormats(context?: ActionContext): Promise<Record<string, string>> {
    return (await this.mediatorSparqlSerializeMediaTypeFormatCombiner.mediate({ context, mediaTypeFormats: true }))
      .mediaTypeFormats;
  }

  /**
   * Convert a query result to a string stream based on a certain media type.
   * @param {IQueryableResult} queryResult A query result.
   * @param {string} mediaType A media type.
   * @param {ActionContext} context An optional context.
   * @return {Promise<IActorSparqlSerializeOutput>} A text stream.
   */
  public async resultToString(queryResult: IQueryableResult, mediaType?: string, context?: any):
  Promise<IActorSparqlSerializeOutput> {
    context = ActionContext(context);

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
    const handle: IActionSparqlSerialize = queryResult;
    handle.context = context;
    return (await this.mediatorSparqlSerialize.mediate({ context, handle, handleMediaType: mediaType })).handle;
  }

  /**
   * Invalidate all internal caches related to the given page URL.
   * If no page URL is given, then all pages will be invalidated.
   * @param {string} url The page URL to invalidate.
   * @return {Promise<any>} A promise resolving when the caches have been invalidated.
   */
  public invalidateHttpCache(url?: string): Promise<any> {
    return this.mediatorHttpInvalidate.mediate({ url });
  }

  public async run(action: IActionInit): Promise<IActorOutputInit> {
    throw new Error('ActorInitSparql#run is not supported in the browser.');
  }
}

export interface IActorInitSparqlBaseArgs extends IActorArgs<IActionInit, IActorTest, IActorOutputInit> {
  /**
   * The query operation optimize mediator
   */
  mediatorOptimizeQueryOperation: Mediator<Actor<IActionOptimizeQueryOperation, IActorTest,
  IActorOptimizeQueryOperationOutput>, IActionOptimizeQueryOperation, IActorTest, IActorOptimizeQueryOperationOutput>;
  /**
   * The query operation mediator
   */
  mediatorQueryOperation: Mediator<Actor<IActionQueryOperation, IActorTest, IQueryableResult>,
  IActionQueryOperation, IActorTest, IQueryableResult>;
  /**
   * The query parse mediator
   */
  mediatorSparqlParse: Mediator<Actor<IActionSparqlParse, IActorTest, IActorSparqlParseOutput>,
  IActionSparqlParse, IActorTest, IActorSparqlParseOutput>;
  /**
   * The query serialize mediator
   */
  mediatorSparqlSerialize: Mediator<
  Actor<IActionSparqlSerializeHandle, IActorTestSparqlSerializeHandle, IActorOutputSparqlSerializeHandle>,
  IActionSparqlSerializeHandle, IActorTestSparqlSerializeHandle, IActorOutputSparqlSerializeHandle>;
  /**
   * The query serialize media type combinator
   */
  mediatorSparqlSerializeMediaTypeCombiner: Mediator<
  Actor<IActionSparqlSerializeMediaTypes, IActorTestSparqlSerializeMediaTypes, IActorOutputSparqlSerializeMediaTypes>,
  IActionSparqlSerializeMediaTypes, IActorTestSparqlSerializeMediaTypes, IActorOutputSparqlSerializeMediaTypes>;
  /**
   * The query serialize media type format combinator
   */
  mediatorSparqlSerializeMediaTypeFormatCombiner: Mediator<
  Actor<IActionSparqlSerializeMediaTypeFormats, IActorTestSparqlSerializeMediaTypeFormats,
  IActorOutputSparqlSerializeMediaTypeFormats>,
  IActionSparqlSerializeMediaTypeFormats, IActorTestSparqlSerializeMediaTypeFormats,
  IActorOutputSparqlSerializeMediaTypeFormats>;
  /**
   * The context processing combinator
   */
  mediatorContextPreprocess: Mediator<Actor<IAction, IActorTest, IActorContextPreprocessOutput>,
  IAction, IActorTest, IActorContextPreprocessOutput>;
  /**
   * The HTTP cache invalidation mediator
   */
  mediatorHttpInvalidate: Mediator<Actor<IActionHttpInvalidate, IActorTest, IActorHttpInvalidateOutput>,
  IActionHttpInvalidate, IActorTest, IActorHttpInvalidateOutput>;
  /**
   * The logger of this actor
   * @default {a <npmd:@comunica/logger-void/^2.0.0/components/LoggerVoid.jsonld#LoggerVoid>}
   */
  logger: Logger;
  /**
   * A SPARQL query string
   */
  queryString?: string;
  /**
   * The default query input format
   */
  defaultQueryInputFormat?: string;
  /**
   * A JSON string of a query operation context
   */
  context?: string;
  /**
   * A record of context shortcuts to full context keys (as defined in @comunica/context-entries).
   * @range {json}
   * @default {{
   *   "source": "@comunica/bus-rdf-resolve-quad-pattern:source",
   *   "sources": "@comunica/bus-rdf-resolve-quad-pattern:sources",
   *   "destination": "@comunica/bus-rdf-update-quads:destination",
   *   "initialBindings": "@comunica/actor-init-sparql:initialBindings",
   *   "queryFormat": "@comunica/actor-init-sparql:queryFormat",
   *   "baseIRI": "@comunica/actor-init-sparql:baseIRI",
   *   "log": "@comunica/core:log",
   *   "datetime": "@comunica/actor-http-memento:datetime",
   *   "queryTimestamp": "@comunica/actor-init-sparql:queryTimestamp",
   *   "httpProxyHandler": "@comunica/actor-http-proxy:httpProxyHandler",
   *   "lenient": "@comunica/actor-init-sparql:lenient",
   *   "httpIncludeCredentials": "@comunica/bus-http:include-credentials",
   *   "httpAuth": "@comunica/bus-http:auth",
   *   "fetch": "@comunica/bus-http:fetch",
   *   "readOnly": "@comunica/bus-query-operation:readOnly",
   *   "extensionFunctions": "@comunica/actor-init-sparql:extensionFunctions",
   *   "extensionFunctionCreator": "@comunica/actor-init-sparql:extensionFunctionCreator",
   *   "explain": "@comunica/actor-init-sparql:explain"
   * }}
   */
  contextKeyShortcuts: Record<string, string>;
}
