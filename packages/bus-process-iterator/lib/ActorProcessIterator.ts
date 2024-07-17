import { Actor, IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import type { AsyncIterator } from 'asynciterator';
import type * as RDF from '@rdfjs/types';

// TODO: Maybe make this class generic and have seperate implementation for Quads, bindings, etc.

/**
 * A comunica actor for process-iterator events.
 *
 * Actor types:
 * * Input:  IActionProcessIterator:      TODO: fill in.
 * * Test:   <none>
 * * Output: IActorProcessIteratorOutput: TODO: fill in.
 *
 * @see IActionProcessIterator
 * @see IActorProcessIteratorOutput
 */
export abstract class ActorProcessIterator extends Actor<IActionProcessIterator, IActorTest, IActorProcessIteratorOutput> {

  /**
  * @param args - @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
  */
  public constructor(args: IActorProcessIteratorArgs) {
    super(args);
  }

  abstract processBindingsIterator(bindingsStream: AsyncIterator<RDF.Bindings>): AsyncIterator<RDF.Bindings>;

  abstract processQuadsIterator(quadStream: AsyncIterator<RDF.Quad>): AsyncIterator<RDF.Quad>

}

export interface IActionProcessIterator extends IAction {
  /**
   * Type of stream that will be processed
   */
  type: "binding" | "quad";
  /**
   * The name of the actor that produced the stream
   */
  streamSource: string;
  /**
   * The stream that will be processed by the actor
   */
  stream: AsyncIterator<any>;
}

export interface IActorProcessIteratorOutput extends IActorOutput {
  /**
   * Processed stream
   */
  stream: AsyncIterator<any>;
}

export type IActorProcessIteratorArgs = IActorArgs<
IActionProcessIterator, IActorTest, IActorProcessIteratorOutput>;

export type MediatorProcessIterator = Mediate<
IActionProcessIterator, IActorProcessIteratorOutput>;

