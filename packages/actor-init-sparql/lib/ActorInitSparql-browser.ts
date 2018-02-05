import {ActorInit, IActionInit, IActorOutputInit} from "@comunica/bus-init";
import {IActionQueryOperation, IActorQueryOperationOutput} from "@comunica/bus-query-operation";
import {IActionSparqlParse, IActorSparqlParseOutput} from "@comunica/bus-sparql-parse";
import {IActionRootSparqlParse, IActorOutputRootSparqlParse,
  IActorTestRootSparqlParse} from "@comunica/bus-sparql-serialize";
import {Actor, IActorArgs, IActorTest, Mediator} from "@comunica/core";
import {Algebra} from "sparqlalgebrajs";

/**
 * A browser-safe comunica SPARQL Init Actor.
 */
export class ActorInitSparql extends ActorInit implements IActorInitSparqlArgs {

  public readonly mediatorQueryOperation: Mediator<Actor<IActionQueryOperation, IActorTest, IActorQueryOperationOutput>,
    IActionQueryOperation, IActorTest, IActorQueryOperationOutput>;
  public readonly mediatorSparqlParse: Mediator<Actor<IActionSparqlParse, IActorTest, IActorSparqlParseOutput>,
    IActionSparqlParse, IActorTest, IActorSparqlParseOutput>;
  public readonly mediatorSparqlSerialize: Mediator<Actor<IActionRootSparqlParse, IActorTestRootSparqlParse,
    IActorOutputRootSparqlParse>, IActionRootSparqlParse, IActorTestRootSparqlParse, IActorOutputRootSparqlParse>;
  public readonly query?: string;
  public readonly context?: string;

  constructor(args: IActorInitSparqlArgs) {
    super(args);
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
  public async evaluateQuery(query: string, context?: any): Promise<IActorQueryOperationOutput> {
    const operation: Algebra.Operation = (await this.mediatorSparqlParse.mediate({ query })).operation;
    const resolve: IActionQueryOperation = { context, operation };
    return await this.mediatorQueryOperation.mediate(resolve);
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
  query?: string;
  context?: string;
}
