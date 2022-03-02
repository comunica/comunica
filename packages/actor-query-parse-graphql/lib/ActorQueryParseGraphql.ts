import type { IActionQueryParse, IActorQueryParseArgs, IActorQueryParseOutput } from '@comunica/bus-query-parse';
import { ActorQueryParse } from '@comunica/bus-query-parse';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest } from '@comunica/core';
import { Converter } from 'graphql-to-sparql';

/**
 * A comunica GraphQL SPARQL Parse Actor.
 */
export class ActorQueryParseGraphql extends ActorQueryParse {
  private readonly graphqlToSparql: Converter;

  public constructor(args: IActorQueryParseArgs) {
    super(args);
    this.graphqlToSparql = new Converter({ requireContext: true });
  }

  public async test(action: IActionQueryParse): Promise<IActorTest> {
    if (action.queryFormat?.language !== 'graphql') {
      throw new Error('This actor can only parse GraphQL queries');
    }
    return true;
  }

  public async run(action: IActionQueryParse): Promise<IActorQueryParseOutput> {
    const context: any = action.context.get(KeysInitQuery.jsonLdContext) || {};
    const options = {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      singularizeVariables: <any> action.context.get(KeysInitQuery.graphqlSingularizeVariables),
    };
    return { operation: await this.graphqlToSparql.graphqlToSparqlAlgebra(action.query, context, options) };
  }
}
