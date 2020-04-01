import {IActorContextPreprocessOutput} from "@comunica/bus-context-preprocess";
import {IActionHttpInvalidate, IActorHttpInvalidateOutput} from "@comunica/bus-http-invalidate";
import {ActorInit, IActionInit, IActorOutputInit} from "@comunica/bus-init";
import {
  IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationOutput,
} from "@comunica/bus-optimize-query-operation";
import {
  ensureBindings,
  IActionQueryOperation,
  IActorQueryOperationOutput,
  KEY_CONTEXT_BASEIRI,
  KEY_CONTEXT_QUERY_TIMESTAMP,
  materializeOperation,
} from "@comunica/bus-query-operation";
import {IDataSource, KEY_CONTEXT_SOURCES} from "@comunica/bus-rdf-resolve-quad-pattern";
import {IActionSparqlParse, IActorSparqlParseOutput} from "@comunica/bus-sparql-parse";
import {
  IActionRootSparqlParse,
  IActionSparqlSerialize,
  IActorOutputRootSparqlParse,
  IActorSparqlSerializeOutput,
  IActorTestRootSparqlParse,
} from "@comunica/bus-sparql-serialize";
import {ActionContext, Actor, IAction, IActorArgs, IActorTest, KEY_CONTEXT_LOG, Logger, Mediator} from "@comunica/core";
import {AsyncReiterableArray} from "asyncreiterable";
import {Algebra} from "sparqlalgebrajs";

/**
 * A browser-safe comunica SPARQL Init Actor.
 */
export class ActorInitSparql extends ActorInit implements IActorInitSparqlArgs {

  private static ALGEBRA_TYPES: {[type: string]: boolean} = Object.keys(Algebra.types)
    .reduce((acc: {[type: string]: boolean}, key) => { acc[(<any> Algebra.types)[key]] = true; return acc; }, {});

  public readonly mediatorOptimizeQueryOperation: Mediator<Actor<IActionOptimizeQueryOperation, IActorTest,
    IActorOptimizeQueryOperationOutput>, IActionOptimizeQueryOperation, IActorTest, IActorOptimizeQueryOperationOutput>;
  public readonly mediatorQueryOperation: Mediator<Actor<IActionQueryOperation, IActorTest, IActorQueryOperationOutput>,
    IActionQueryOperation, IActorTest, IActorQueryOperationOutput>;
  public readonly mediatorSparqlParse: Mediator<Actor<IActionSparqlParse, IActorTest, IActorSparqlParseOutput>,
    IActionSparqlParse, IActorTest, IActorSparqlParseOutput>;
  public readonly mediatorSparqlSerialize: Mediator<Actor<IActionRootSparqlParse, IActorTestRootSparqlParse,
    IActorOutputRootSparqlParse>, IActionRootSparqlParse, IActorTestRootSparqlParse, IActorOutputRootSparqlParse>;
  public readonly mediatorSparqlSerializeMediaTypeCombiner: Mediator<Actor<IActionRootSparqlParse,
    IActorTestRootSparqlParse, IActorOutputRootSparqlParse>, IActionRootSparqlParse, IActorTestRootSparqlParse,
    IActorOutputRootSparqlParse>;
  public readonly mediatorSparqlSerializeMediaTypeFormatCombiner: Mediator<Actor<IActionRootSparqlParse,
    IActorTestRootSparqlParse, IActorOutputRootSparqlParse>, IActionRootSparqlParse, IActorTestRootSparqlParse,
    IActorOutputRootSparqlParse>;
  public readonly mediatorContextPreprocess: Mediator<Actor<IAction, IActorTest,
    IActorContextPreprocessOutput>, IAction, IActorTest, IActorContextPreprocessOutput>;
  public readonly mediatorHttpInvalidate: Mediator<Actor<IActionHttpInvalidate, IActorTest, IActorHttpInvalidateOutput>,
    IActionHttpInvalidate, IActorTest, IActorHttpInvalidateOutput>;
  public readonly logger: Logger;
  public readonly queryString?: string;
  public readonly defaultQueryInputFormat?: string;
  public readonly context?: string;
  public readonly contextKeyShortcuts: {[shortcut: string]: string};

  constructor(args: IActorInitSparqlArgs) {
    super(args);
  }

  public async test(action: IActionInit): Promise<IActorTest> {
    return true;
  }

  /**
   * Evaluate the given query
   * @param {string | Algebra.Operation} query A query string or algebra.
   * @param context An optional query context.
   * @return {Promise<IActorQueryOperationOutput>} A promise that resolves to the query output.
   */
  public async query(query: string | Algebra.Operation, context?: any): Promise<IActorQueryOperationOutput> {
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
    if (!context[KEY_CONTEXT_LOG]) {
      context[KEY_CONTEXT_LOG] = this.logger;
    }

    if (!context[KEY_CONTEXT_QUERY_TIMESTAMP]) {
      context[KEY_CONTEXT_QUERY_TIMESTAMP] = new Date();
    }

    // Ensure sources are an async re-iterable
    if (Array.isArray(context[KEY_CONTEXT_SOURCES])) {
      // TODO: backwards compatibility
      context[KEY_CONTEXT_SOURCES].map((source: IDataSource) => {
        if (typeof source !== 'string' && (source.type === 'auto' || source.type === 'hypermedia')) {
          delete source.type;
        }
      });
      context[KEY_CONTEXT_SOURCES] = AsyncReiterableArray.fromFixedData(context[KEY_CONTEXT_SOURCES]);
    }

    // Prepare context
    context = ActionContext(context);
    let queryFormat: string = 'sparql';
    if (context && context.has(KEY_CONTEXT_QUERYFORMAT)) {
      queryFormat = context.get(KEY_CONTEXT_QUERYFORMAT);
      context = context.delete(KEY_CONTEXT_QUERYFORMAT);
      if (queryFormat === 'graphql' && !context.has(KEY_CONTEXT_GRAPHQL_SINGULARIZEVARIABLES)) {
        context = context.set(KEY_CONTEXT_GRAPHQL_SINGULARIZEVARIABLES, {});
      }
    }
    let baseIRI: string;
    if (context && context.has(KEY_CONTEXT_BASEIRI)) {
      baseIRI = context.get(KEY_CONTEXT_BASEIRI);
    }

    // Pre-processing the context
    context = (await this.mediatorContextPreprocess.mediate({ context })).context;

    // Parse query
    let operation: Algebra.Operation;
    if (typeof query === 'string') {
      const queryParseOutput = await this.mediatorSparqlParse.mediate({ context, query, queryFormat, baseIRI });
      operation = queryParseOutput.operation;
      // Update the baseIRI in the context if the query modified it.
      if (queryParseOutput.baseIRI) {
        context = context.set(KEY_CONTEXT_BASEIRI, queryParseOutput.baseIRI);
      }
    } else {
      operation = query;
    }

    // Apply initial bindings in context
    if (context.has(KEY_CONTEXT_INITIALBINDINGS)) {
      const bindings = context.get(KEY_CONTEXT_INITIALBINDINGS);
      operation = materializeOperation(operation, ensureBindings(bindings));
    }

    // Optimize the query operation
    operation = (await this.mediatorOptimizeQueryOperation.mediate({ context, operation })).operation;

    // Execute query
    const resolve: IActionQueryOperation = { context, operation };
    const output = await this.mediatorQueryOperation.mediate(resolve);
    output.context = context;
    return output;
  }

  /**
   * @param context An optional context.
   * @return {Promise<{[p: string]: number}>} All available SPARQL (weighted) result media types.
   */
  public async getResultMediaTypes(context: ActionContext): Promise<{[id: string]: number}> {
    return (await this.mediatorSparqlSerializeMediaTypeCombiner.mediate({ context, mediaTypes: true })).mediaTypes;
  }

  /**
   * @param context An optional context.
   * @return {Promise<{[p: string]: number}>} All available SPARQL result media type formats.
   */
  public async getResultMediaTypeFormats(context: ActionContext): Promise<{[id: string]: string}> {
    return (await this.mediatorSparqlSerializeMediaTypeFormatCombiner.mediate({ context, mediaTypeFormats: true })).mediaTypeFormats;
  }

  /**
   * Convert a query result to a string stream based on a certain media type.
   * @param {IActorQueryOperationOutput} queryResult A query result.
   * @param {string} mediaType A media type.
   * @param {ActionContext} context An optional context.
   * @return {Promise<IActorSparqlSerializeOutput>} A text stream.
   */
  public async resultToString(queryResult: IActorQueryOperationOutput, mediaType?: string, context?: any)
  : Promise<IActorSparqlSerializeOutput> {
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

export interface IActorInitSparqlArgs extends IActorArgs<IActionInit, IActorTest, IActorOutputInit> {
  mediatorOptimizeQueryOperation: Mediator<Actor<IActionOptimizeQueryOperation, IActorTest,
    IActorOptimizeQueryOperationOutput>, IActionOptimizeQueryOperation, IActorTest, IActorOptimizeQueryOperationOutput>;
  mediatorQueryOperation: Mediator<Actor<IActionQueryOperation, IActorTest, IActorQueryOperationOutput>,
    IActionQueryOperation, IActorTest, IActorQueryOperationOutput>;
  mediatorSparqlParse: Mediator<Actor<IActionSparqlParse, IActorTest, IActorSparqlParseOutput>,
    IActionSparqlParse, IActorTest, IActorSparqlParseOutput>;
  mediatorSparqlSerialize: Mediator<Actor<IActionRootSparqlParse, IActorTestRootSparqlParse,
    IActorOutputRootSparqlParse>, IActionRootSparqlParse, IActorTestRootSparqlParse, IActorOutputRootSparqlParse>;
  mediatorSparqlSerializeMediaTypeCombiner: Mediator<Actor<IActionRootSparqlParse,
    IActorTestRootSparqlParse, IActorOutputRootSparqlParse>, IActionRootSparqlParse, IActorTestRootSparqlParse,
    IActorOutputRootSparqlParse>;
  mediatorSparqlSerializeMediaTypeFormatCombiner: Mediator<Actor<IActionRootSparqlParse,
    IActorTestRootSparqlParse, IActorOutputRootSparqlParse>, IActionRootSparqlParse, IActorTestRootSparqlParse,
    IActorOutputRootSparqlParse>;
  mediatorContextPreprocess: Mediator<Actor<IAction, IActorTest, IActorContextPreprocessOutput>,
    IAction, IActorTest, IActorContextPreprocessOutput>;
  mediatorHttpInvalidate: Mediator<Actor<IActionHttpInvalidate, IActorTest, IActorHttpInvalidateOutput>,
    IActionHttpInvalidate, IActorTest, IActorHttpInvalidateOutput>;
  logger: Logger;
  queryString?: string;
  defaultQueryInputFormat?: string;
  context?: string;
  contextKeyShortcuts: {[shortcut: string]: string};
}

export const KEY_CONTEXT_INITIALBINDINGS: string = '@comunica/actor-init-sparql:initialBindings';
export const KEY_CONTEXT_QUERYFORMAT: string = '@comunica/actor-init-sparql:queryFormat';
export const KEY_CONTEXT_GRAPHQL_SINGULARIZEVARIABLES: string = '@comunica/actor-init-sparql:singularizeVariables';
export const KEY_CONTEXT_LENIENT: string = '@comunica/actor-init-sparql:lenient';
