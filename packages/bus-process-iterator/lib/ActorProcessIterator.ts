import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import { Actor } from '@comunica/core';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';

/**
 * A comunica actor for process-iterator events.
 *
 * Actor types:
 *  Input:  IActionProcessIterator: Data that denotes what type of stream is being wrapped,
 *   what actor produced this stream, and the stream itself
 * * Test:   <none>
 * * Output: IActorProcessIteratorOutput: The wrapped stream with the
 *
 * @see IActionProcessIterator
 * @see IActorProcessIteratorOutput
 */
export abstract class ActorProcessIterator<T extends AsyncIterator<RDF.Bindings> | AsyncIterator<RDF.Quad>>
  extends Actor<IActionProcessIterator<T>, IActorTest, IActorProcessIteratorOutput<T>> {
  /**
   * @param args - @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   */
  public constructor(args: IActorProcessIteratorArgs) {
    super(args);
  }

  public async run(action: IActionProcessIterator<T>): Promise<IActorProcessIteratorOutput<T>> {
    // TODO: Possibly remove redundant run / processStream seperation, as most of the logic will need
    // reside in processStream anyways, like checken if we event want to process the stream. (depending on operation)
    action.stream = this.processStream(action.stream, action.metadata);
    return action;
  }

  abstract processStream<T extends AsyncIterator<RDF.Bindings> | AsyncIterator<RDF.Quad>>(stream: T,
    metadata?: Record<string, any>): T;
}

export interface IActionProcessIterator<T> extends IAction {
  /**
   * The operation that produced the stream
   */
  operation: string;
  /**
   * The stream that will be processed by the actor
   */
  stream: T;
  /**
   * Optional metadata
   */
  metadata?: Record<string, any>;
}

export interface IActorProcessIteratorOutput<T> extends IActorOutput {
  /**
   * Processed stream
   */
  stream: T;
}

export type IActorProcessIteratorArgs
 = IActorArgs<IActionProcessIterator<any>, IActorTest, IActorProcessIteratorOutput<any>>;

export type MediatorProcessIterator
= Mediate<IActionProcessIterator<AsyncIterator<RDF.Bindings> | AsyncIterator<RDF.Quad>>, IActorProcessIteratorOutput<AsyncIterator<RDF.Bindings> | AsyncIterator<RDF.Quad>>>;
