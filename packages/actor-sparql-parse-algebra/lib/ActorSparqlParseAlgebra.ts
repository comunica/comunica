import {ActorSparqlParse, IActionSparqlParse, IActorSparqlParseOutput} from "@comunica/bus-sparql-parse";
import {IActorArgs, IActorTest} from "@comunica/core";
import {translate} from "sparqlalgebrajs";

/**
 * A comunica Algebra SPARQL Parse Actor.
 */
export class ActorSparqlParseAlgebra extends ActorSparqlParse {

  constructor(args: IActorArgs<IActionSparqlParse, IActorTest, IActorSparqlParseOutput>) {
    super(args);
  }

  public async test(action: IActionSparqlParse): Promise<IActorTest> {
    if (action.queryFormat && action.queryFormat !== 'sparql') {
      throw new Error('This actor can only parse SPARQL queries');
    }
    return true;
  }

  public async run(action: IActionSparqlParse): Promise<IActorSparqlParseOutput> {
    return { operation: translate(action.query, { quads: true }) };
  }

}
