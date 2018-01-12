import {ActorInit, IActionInit, IActorOutputInit} from "@comunica/bus-init";
import {IActionQueryOperation, IActorQueryOperationOutput} from "@comunica/bus-query-operation";
import {IActionSparqlParse, IActorSparqlParseOutput} from "@comunica/bus-sparql-parse";
import {Actor, IActorArgs, IActorTest, Mediator} from "@comunica/core";
import {readFileSync} from "fs";
import minimist = require('minimist');
import {Algebra} from "sparqlalgebrajs";
import {Readable} from "stream";

/**
 * A browser-safe comunica SPARQL Init Actor.
 */
export class ActorInitSparql extends ActorInit implements IActorInitSparqlArgs {

  public readonly mediatorQueryOperation: Mediator<Actor<IActionQueryOperation, IActorTest, IActorQueryOperationOutput>,
    IActionQueryOperation, IActorTest, IActorQueryOperationOutput>;
  public readonly mediatorSparqlParse: Mediator<Actor<IActionSparqlParse, IActorTest, IActorSparqlParseOutput>,
    IActionSparqlParse, IActorTest, IActorSparqlParseOutput>;
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
  query?: string;
  context?: string;
}
