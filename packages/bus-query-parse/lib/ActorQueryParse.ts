import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import { Actor } from '@comunica/core';
import type * as RDF from '@rdfjs/types';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica actor for query-parse events.
 *
 * Actor types:
 * * Input:  IActionSparqlParse:      A SPARQL query string.
 * * Test:   <none>
 * * Output: IActorSparqlParseOutput: A parsed query in SPARQL query algebra.
 *
 * @see IActionQueryParse
 * @see IActorQueryParseOutput
 */
export abstract class ActorQueryParse extends Actor<IActionQueryParse, IActorTest, IActorQueryParseOutput> {
  /**
   * @param args - @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   */
  public constructor(args: IActorQueryParseArgs) {
    super(args);
  }
}

export interface IActionQueryParse extends IAction {
  /**
   * A query.
   */
  query: string;
  /**
   * The query format.
   */
  queryFormat?: RDF.QueryFormat;
  /**
   * The query's default base IRI.
   */
  baseIRI?: string;
}

export interface IActorQueryParseOutput extends IActorOutput {
  /**
   * A parsed query in SPARQL algebra.
   */
  operation: Algebra.Operation;
  /**
   * An optionally overridden base IRI.
   */
  baseIRI?: string;
}

export type IActorQueryParseArgs = IActorArgs<IActionQueryParse, IActorTest, IActorQueryParseOutput>;

export type MediatorQueryParse = Mediate<IActionQueryParse, IActorQueryParseOutput>;
