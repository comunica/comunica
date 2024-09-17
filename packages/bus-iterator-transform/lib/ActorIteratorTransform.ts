import type { LogicalJoinType } from '@comunica/bus-rdf-join';
import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import { Actor } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import type { types } from 'sparqlalgebrajs/lib/algebra';

/**
 * A comunica actor for iterator-transform events.
 *
 * Actor types:
 *  Input:  IActionIteratorTransform: Data that denotes what type of stream is being wrapped,
 *   what actor produced this stream, and the stream itself
 * * Test:   <none>
 * * Output: IActorIteratorTransformOutput: The wrapped stream with the
 *
 * @see IActionIteratorTransform
 * @see IActorIteratorTransformOutput
 */
export abstract class ActorIteratorTransform<T extends AsyncIterator<RDF.Bindings> | AsyncIterator<RDF.Quad>>
  extends Actor<IActionIteratorTransform<T>, IActorTest, IActorIteratorTransformOutput<T>> {
  public wraps: possibleOperationTypes[];
  /**
   * @param args - @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   */
  public constructor(args: IActorIteratorTransformArgs) {
    super(args);
  }

  public async run(action: IActionIteratorTransform<T>): Promise<IActorIteratorTransformOutput<T>> {
    // TODO: Possibly remove redundant run / processStream seperation, as most of the logic will need
    // reside in processStream anyways
    action.stream = this.transformIterator(action.operation, action.stream, action.context, action.metadata);
    return action;
  }

  /**
   * Test will only succeed if the operation we're wrapping is included in the types
   * @param action
   * @returns
   */
  public async test(
    action: IActionIteratorTransform<AsyncIterator<RDF.Bindings> | AsyncIterator<RDF.Quad>>,
  ): Promise<IActorTest> {
    if (!this.wraps === undefined && !this.wraps.includes(action.operation as possibleOperationTypes)) {
      throw new Error(`Operation type not supported in configuration of ${this.name}`);
    }
    return true;
  }

  abstract transformIterator<T extends AsyncIterator<RDF.Bindings> | AsyncIterator<RDF.Quad>>(operation: string,
    stream: T, context: IActionContext, metadata?: Record<string, any>): T;
}

export interface IActionIteratorTransform<T> extends IAction {
  /**
   * The operation that produced the stream
   */
  operation: string;
  /**
   * The stream to be transformed by the actor
   */
  stream: T;
  /**
   * Optional metadata
   */
  metadata?: Record<string, any>;
}

export interface IActorIteratorTransformOutput<T> extends IActorOutput {
  /**
   * Transformed stream
   */
  stream: T;
}

export interface IActorIteratorTransformArgs
  extends IActorArgs<IActionIteratorTransform<any>, IActorTest, IActorIteratorTransformOutput<any>> {
  /**
   * What types of operations the actor will wrap. If undefined the actor wraps every operation
   */
  wraps?: possibleOperationTypes[];
}

export type possibleOperationTypes = types | LogicalJoinType;

export type MediatorIteratorTransform= Mediate<IActionIteratorTransform<AsyncIterator<RDF.Bindings> | 
AsyncIterator<RDF.Quad>>, IActorIteratorTransformOutput<
AsyncIterator<RDF.Bindings> | AsyncIterator<RDF.Quad>>>;
