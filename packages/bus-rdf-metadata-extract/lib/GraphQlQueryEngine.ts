import type { IQueryEngine } from '@comunica/types';
import type { IQueryEngine as IGraphQlQueryEngine } from 'graphql-ld';
import type { Algebra } from 'sparqlalgebrajs';
import * as stringifyStream from 'stream-to-string';

/**
 * A comunica-based GraphQL-LD query engine.
 */
export class GraphQlQueryEngine implements IGraphQlQueryEngine {
  private readonly comunicaEngine: IQueryEngine;

  public constructor(comunicaEngine: IQueryEngine) {
    this.comunicaEngine = comunicaEngine;
  }

  public async query(query: Algebra.Operation, options?: any): Promise<any> {
    const { data } = await this.comunicaEngine.resultToString(
      await this.comunicaEngine.query(query, options), 'application/sparql-results+json',
    );
    return JSON.parse(await stringifyStream(data));
  }
}
