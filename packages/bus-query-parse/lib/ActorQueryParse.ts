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
export abstract class ActorQueryParse<TS = undefined>
  extends Actor<IActionQueryParse, IActorTest, IActorQueryParseOutput, TS> {
  /* eslint-disable max-len */
  /**
   * @param args -
   *   \ @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   *   \ @defaultNested {Query parsing failed: none of the configured parsers were able to the query "${action.query}"} busFailMessage
   */
  /* eslint-enable max-len */
  public constructor(args: IActorQueryParseArgs<TS>) {
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

export type IActorQueryParseArgs<TS = undefined> =
  IActorArgs<IActionQueryParse, IActorTest, IActorQueryParseOutput, TS>;

export type MediatorQueryParse = Mediate<IActionQueryParse, IActorQueryParseOutput>;
