import {IActorContextPreprocessOutput} from "@comunica/bus-context-preprocess";
import {ActorInit, IActionInit, IActorOutputInit} from "@comunica/bus-init";
import {Bindings, IActionQueryOperation, IActorQueryOperationOutput} from "@comunica/bus-query-operation";
import {KEY_CONTEXT_SOURCES} from "@comunica/bus-rdf-resolve-quad-pattern";
import {IActionSparqlParse, IActorSparqlParseOutput} from "@comunica/bus-sparql-parse";
import {IActionSparqlSerialize} from "@comunica/bus-sparql-serialize";
import {IActionRootSparqlParse, IActorOutputRootSparqlParse,
  IActorTestRootSparqlParse} from "@comunica/bus-sparql-serialize";
import {IActorSparqlSerializeOutput} from "@comunica/bus-sparql-serialize";
import {ActionContext, Actor, IAction, IActorArgs, IActorTest, KEY_CONTEXT_LOG, Logger, Mediator} from "@comunica/core";
import {AsyncReiterableArray} from "asyncreiterable";
import * as RDF from "rdf-js";
import {termToString} from "rdf-string";
import {QUAD_TERM_NAMES} from "rdf-terms";
import {Algebra} from "sparqlalgebrajs";

/**
 * A browser-safe comunica SPARQL Init Actor.
 */
export class ActorInitSparql extends ActorInit implements IActorInitSparqlArgs {

  private static ALGEBRA_TYPES: string[] = Object.keys(Algebra.types).map((key) => (<any> Algebra.types)[key]);

  public readonly mediatorQueryOperation: Mediator<Actor<IActionQueryOperation, IActorTest, IActorQueryOperationOutput>,
    IActionQueryOperation, IActorTest, IActorQueryOperationOutput>;
  public readonly mediatorSparqlParse: Mediator<Actor<IActionSparqlParse, IActorTest, IActorSparqlParseOutput>,
    IActionSparqlParse, IActorTest, IActorSparqlParseOutput>;
  public readonly mediatorSparqlSerialize: Mediator<Actor<IActionRootSparqlParse, IActorTestRootSparqlParse,
    IActorOutputRootSparqlParse>, IActionRootSparqlParse, IActorTestRootSparqlParse, IActorOutputRootSparqlParse>;
  public readonly mediatorSparqlSerializeMediaTypeCombiner: Mediator<Actor<IActionRootSparqlParse,
    IActorTestRootSparqlParse, IActorOutputRootSparqlParse>, IActionRootSparqlParse, IActorTestRootSparqlParse,
    IActorOutputRootSparqlParse>;
  public readonly mediatorContextPreprocess: Mediator<Actor<IAction, IActorTest,
    IActorContextPreprocessOutput>, IAction, IActorTest, IActorContextPreprocessOutput>;
  public readonly logger: Logger;
  public readonly queryString?: string;
  public readonly defaultQueryInputFormat?: string;
  public readonly context?: string;
  public readonly contextKeyShortcuts: {[shortcut: string]: string};

  constructor(args: IActorInitSparqlArgs) {
    super(args);
  }

  /**
   * Create a copy of the given operation in which all given bindings are applied.
   * The bindings are applied to all quad patterns and path expressions.
   *
   * @param {Operation} operation An operation.
   * @param {Bindings} initialBindings Bindings to apply.
   * @return {Operation} A copy of the given operation where all given bindings are applied.
   */
  public static applyInitialBindings(operation: Algebra.Operation, initialBindings: Bindings): Algebra.Operation {
    const copiedOperation: Algebra.Operation = <any> {};
    for (const key of Object.keys(operation)) {
      if (Array.isArray(operation[key])) {
        if (key === 'variables') {
          copiedOperation[key] = operation[key].filter(
            (variable: RDF.Variable) => initialBindings.keySeq().indexOf(termToString(variable)) < 0);
        } else {
          copiedOperation[key] = operation[key].map(
            (subOperation: Algebra.Operation) => ActorInitSparql.applyInitialBindings(subOperation, initialBindings));
        }
      } else if (ActorInitSparql.ALGEBRA_TYPES.indexOf(operation[key].type) >= 0) {
        copiedOperation[key] = ActorInitSparql.applyInitialBindings(operation[key], initialBindings);
      } else {
        copiedOperation[key] = operation[key];
      }

      if (operation.type === Algebra.types.PATTERN || operation.type === Algebra.types.PATH) {
        for (const quadTerm of QUAD_TERM_NAMES) {
          if (!(operation.type === Algebra.types.PATH && quadTerm === 'predicate')) {
            const term: RDF.Term = operation[quadTerm];
            if (term.termType === 'Variable') {
              const termString: string = termToString(term);
              const binding: RDF.Term = initialBindings.get(termString);
              if (binding) {
                copiedOperation[quadTerm] = binding;
              }
            }
          }
        }
      }
    }
    return copiedOperation;
  }

  public async test(action: IActionInit): Promise<IActorTest> {
    return true;
  }

  /**
   * Evaluate the given query
   * @param {string} query A query string.
   * @param context An optional query context.
   * @return {Promise<IActorQueryOperationOutput>} A promise that resolves to the query output.
   */
  public async query(query: string, context?: any): Promise<IActorQueryOperationOutput> {
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

    // Ensure sources are an async re-iterable
    if (Array.isArray(context[KEY_CONTEXT_SOURCES])) {
      context[KEY_CONTEXT_SOURCES] = AsyncReiterableArray.fromFixedData(context[KEY_CONTEXT_SOURCES]);
    }

    context = ActionContext(context);

    // Start, but don't await, context pre-processing
    const combinationPromise = this.mediatorContextPreprocess.mediate({ context });

    // Parse query
    let queryFormat: string = 'sparql';
    if (context && context.has(KEY_CONTEXT_QUERYFORMAT)) {
      queryFormat = context.get(KEY_CONTEXT_QUERYFORMAT);
      context = context.delete(KEY_CONTEXT_QUERYFORMAT);
    }
    let operation: Algebra.Operation = (await this.mediatorSparqlParse.mediate(
      { context, query, queryFormat })).operation;

    // Block until context has been processed
    context = (await combinationPromise).context;

    // Apply initial bindings in context
    if (context.has(KEY_CONTEXT_INITIALBINDINGS)) {
      operation = ActorInitSparql.applyInitialBindings(operation, context.get(KEY_CONTEXT_INITIALBINDINGS));
    }

    // Execute query
    const resolve: IActionQueryOperation = { context, operation };
    return await this.mediatorQueryOperation.mediate(resolve);
  }

  /**
   * @param context An optional context.
   * @return {Promise<{[p: string]: number}>} All available SPARQL (weighted) result media types.
   */
  public async getResultMediaTypes(context: ActionContext): Promise<{[id: string]: number}> {
    return (await this.mediatorSparqlSerializeMediaTypeCombiner.mediate({ context, mediaTypes: true })).mediaTypes;
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

  public async run(action: IActionInit): Promise<IActorOutputInit> {
    throw new Error('ActorInitSparql#run is not supported in the browser.');
  }

}

export interface IActorInitSparqlArgs extends IActorArgs<IActionInit, IActorTest, IActorOutputInit> {
  mediatorQueryOperation: Mediator<Actor<IActionQueryOperation, IActorTest, IActorQueryOperationOutput>,
    IActionQueryOperation, IActorTest, IActorQueryOperationOutput>;
  mediatorSparqlParse: Mediator<Actor<IActionSparqlParse, IActorTest, IActorSparqlParseOutput>,
    IActionSparqlParse, IActorTest, IActorSparqlParseOutput>;
  mediatorSparqlSerialize: Mediator<Actor<IActionRootSparqlParse, IActorTestRootSparqlParse,
    IActorOutputRootSparqlParse>, IActionRootSparqlParse, IActorTestRootSparqlParse, IActorOutputRootSparqlParse>;
  mediatorSparqlSerializeMediaTypeCombiner: Mediator<Actor<IActionRootSparqlParse,
    IActorTestRootSparqlParse, IActorOutputRootSparqlParse>, IActionRootSparqlParse, IActorTestRootSparqlParse,
    IActorOutputRootSparqlParse>;
  mediatorContextPreprocess: Mediator<Actor<IAction, IActorTest, IActorContextPreprocessOutput>,
    IAction, IActorTest, IActorContextPreprocessOutput>;
  logger: Logger;
  queryString?: string;
  defaultQueryInputFormat?: string;
  context?: string;
  contextKeyShortcuts: {[shortcut: string]: string};
}

export const KEY_CONTEXT_INITIALBINDINGS: string = '@comunica/actor-init-sparql:initialBindings';
export const KEY_CONTEXT_QUERYFORMAT: string = '@comunica/actor-init-sparql:queryFormat';
