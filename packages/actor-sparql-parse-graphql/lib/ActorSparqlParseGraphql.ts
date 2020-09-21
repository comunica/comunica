import type { IActionSparqlParse, IActorSparqlParseOutput } from '@comunica/bus-sparql-parse';
import { ActorSparqlParse } from '@comunica/bus-sparql-parse';
import type { IActorArgs, IActorTest } from '@comunica/core';
import { Converter } from 'graphql-to-sparql';

/**
 * A comunica GraphQL SPARQL Parse Actor.
 */
export class ActorSparqlParseGraphql extends ActorSparqlParse {
  private readonly graphqlToSparql: Converter;

  public constructor(args: IActorArgs<IActionSparqlParse, IActorTest, IActorSparqlParseOutput>) {
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
    const context = action.context && action.context.has('@context') ? action.context.get('@context') : {};
    const options = {
      singularizeVariables: action.context && action.context.get('@comunica/actor-init-sparql:singularizeVariables'),
    };
    return { operation: await this.graphqlToSparql.graphqlToSparqlAlgebra(action.query, context, options) };
  }
}
