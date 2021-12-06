import type { IActionSparqlParse, IActorSparqlParseArgs, IActorSparqlParseOutput } from '@comunica/bus-sparql-parse';
import { ActorSparqlParse } from '@comunica/bus-sparql-parse';
import { KeysInitSparql } from '@comunica/context-entries';
import type { IActorTest } from '@comunica/core';
import { Converter } from 'graphql-to-sparql';

/**
 * A comunica GraphQL SPARQL Parse Actor.
 */
export class ActorSparqlParseGraphql extends ActorSparqlParse {
  private readonly graphqlToSparql: Converter;

  public constructor(args: IActorSparqlParseArgs) {
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
    const context: any = action.context?.get(KeysInitSparql.jsonLdContext) || {};
    const options = {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      singularizeVariables: <any> action.context?.get(KeysInitSparql.graphqlSingularizeVariables),
    };
    return { operation: await this.graphqlToSparql.graphqlToSparqlAlgebra(action.query, context, options) };
  }
}
