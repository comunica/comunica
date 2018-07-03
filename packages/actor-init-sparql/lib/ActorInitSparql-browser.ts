import {IActionContextPreprocess, IActorContextPreprocessOutput} from "@comunica/bus-context-preprocess";
import {ActorInit, IActionInit, IActorOutputInit} from "@comunica/bus-init";
import {Bindings, IActionQueryOperation, IActorQueryOperationOutput} from "@comunica/bus-query-operation";
import {IActionSparqlParse, IActorSparqlParseOutput} from "@comunica/bus-sparql-parse";
import {IActionRootSparqlParse, IActorOutputRootSparqlParse,
  IActorTestRootSparqlParse} from "@comunica/bus-sparql-serialize";
import {IActorSparqlSerializeOutput} from "@comunica/bus-sparql-serialize";
import {Actor, IActorArgs, IActorTest, Mediator} from "@comunica/core";
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
  public readonly mediatorContextPreprocess: Mediator<Actor<IActionContextPreprocess, IActorTest,
    IActorContextPreprocessOutput>, IActionContextPreprocess, IActorTest, IActorContextPreprocessOutput>;
  public readonly queryString?: string;
  public readonly context?: string;

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
    // Start, but don't await, context pre-processing
    const combinationPromise = this.mediatorContextPreprocess.mediate({ context });

    // Parse query
    let operation: Algebra.Operation = (await this.mediatorSparqlParse.mediate({ query })).operation;

    // Block until context has been processed
    context = (await combinationPromise).context;

    // Apply initial bindings in context
    if (context.initialBindings) {
      operation = ActorInitSparql.applyInitialBindings(operation, context.initialBindings);
    }

    // Execute query
    const resolve: IActionQueryOperation = { context, operation };
    return await this.mediatorQueryOperation.mediate(resolve);
  }

  /**
   * @return {Promise<{[p: string]: number}>} All available SPARQL (weighted) result media types.
   */
  public async getResultMediaTypes(): Promise<{[id: string]: number}> {
    return (await this.mediatorSparqlSerializeMediaTypeCombiner.mediate({ mediaTypes: true })).mediaTypes;
  }

  /**
   * Convert a query result to a string stream based on a certain media type.
   * @param {IActorQueryOperationOutput} queryResult A query result.
   * @param {string} mediaType A media type.
   * @return {Promise<IActorSparqlSerializeOutput>} A text stream.
   */
  public async resultToString(queryResult: IActorQueryOperationOutput, mediaType?: string)
  : Promise<IActorSparqlSerializeOutput> {
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
    return (await this.mediatorSparqlSerialize.mediate({ handle: queryResult, handleMediaType: mediaType })).handle;
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
  mediatorContextPreprocess: Mediator<Actor<IActionContextPreprocess, IActorTest, IActorContextPreprocessOutput>,
    IActionContextPreprocess, IActorTest, IActorContextPreprocessOutput>;
  queryString?: string;
  context?: string;
}
