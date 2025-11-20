import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import { Actor } from '@comunica/core';
import type { Algebra } from '@comunica/utils-algebra';
import type * as RDF from '@rdfjs/types';

/**
 * A comunica actor for query-serialize events.
 *
 * Actor types:
 * * Input:  IActionQuerySerialize:      Query algebra.
 * * Test:   <none>
 * * Output: IActorQuerySerializeOutput: A serialized query string.
 *
 * @see IActionQuerySerialize
 * @see IActorQuerySerializeOutput
 */
export abstract class ActorQuerySerialize<TS = undefined>
  extends Actor<IActionQuerySerialize, IActorTest, IActorQuerySerializeOutput, TS> {
  /* eslint-disable max-len */
  /**
   * @param args -
   *   \ @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   *   \ @defaultNested {Query serializing failed: none of the configured parsers were able to serialize for the query language "${action.queryFormat.language}" at version "${action.queryFormat.version}"} busFailMessage
   */
  /* eslint-enable max-len */
  public constructor(args: IActorQuerySerializeArgs<TS>) {
    super(args);
  }
}

export interface IActionQuerySerialize extends IAction {
  /**
   * The query format to serialize to.
   */
  queryFormat: RDF.QueryFormat;
  /**
   * A query in SPARQL algebra.
   */
  operation: Algebra.Operation;
  /**
   * If newlines should be printed.
   */
  newlines?: boolean;
  /**
   * Number of whitespace character to indent.
   */
  indentWidth?: number;
}

export interface IActorQuerySerializeOutput extends IActorOutput {
  /**
   * The serialized query.
   */
  query: string;
}

export type IActorQuerySerializeArgs<TS = undefined> =
  IActorArgs<IActionQuerySerialize, IActorTest, IActorQuerySerializeOutput, TS>;

export type MediatorQuerySerialize = Mediate<IActionQuerySerialize, IActorQuerySerializeOutput>;
