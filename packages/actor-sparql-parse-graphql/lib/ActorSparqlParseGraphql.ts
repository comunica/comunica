import {ActorSparqlParse, IActionSparqlParse, IActorSparqlParseOutput} from "@comunica/bus-sparql-parse";
import {IActorArgs, IActorTest} from "@comunica/core";
import {Converter} from "graphql-to-sparql";

/**
 * A comunica GraphQL SPARQL Parse Actor.
 */
export class ActorSparqlParseGraphql extends ActorSparqlParse {

  private readonly graphqlToSparql: Converter;

  constructor(args: IActorArgs<IActionSparqlParse, IActorTest, IActorSparqlParseOutput>) {
    super(args);
    this.graphqlToSparql = new Converter({ requireContext: true });
  }

  public async test(action: IActionSparqlParse): Promise<IActorTest> {
    if (action.queryFormat !== 'graphql') {
      throw new Error('This actor can only parse GraphQL queries');
    }
    return true;
  }

  public async run(action: IActionSparqlParse): Promise<IActorSparqlParseOutput> {
    return { operation: this.graphqlToSparql.graphqlToSparqlAlgebra(action.query,
      action.context && action.context.uriContext ? action.context.uriContext : {}) };
  }

}
