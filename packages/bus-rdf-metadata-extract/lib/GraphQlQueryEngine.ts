import type { ActorInitSparql } from '@comunica/actor-init-sparql';
import type { IQueryEngine } from 'graphql-ld';
import type { Algebra } from 'sparqlalgebrajs';
import * as stringifyStream from 'stream-to-string';

/**
 * A comunica-based GraphQL-LD query engine.
 */
export class GraphQlQueryEngine implements IQueryEngine {
  private readonly comunicaEngine: ActorInitSparql;

  public constructor(comunicaEngine: ActorInitSparql) {
    this.comunicaEngine = comunicaEngine;
  }

  public async query(query: Algebra.Operation, options?: any): Promise<any> {
    const { data } = await this.comunicaEngine.resultToString(
      await this.comunicaEngine.query(query, options), 'application/sparql-results+json',
    );
    return JSON.parse(await stringifyStream(data));
  }
}
