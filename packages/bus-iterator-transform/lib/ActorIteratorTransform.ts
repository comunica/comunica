import type { LogicalJoinType } from '@comunica/bus-rdf-join';
import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import { Actor } from '@comunica/core';
import type { IActionContext, MetadataBindings, MetadataQuads } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import type { types } from 'sparqlalgebrajs/lib/algebra';

/**
 * A comunica actor for transform-iterator events.
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
export abstract class ActorIteratorTransform<
T extends AsyncIterator<RDF.Bindings> | AsyncIterator<RDF.Quad>,
M extends MetadataBindings | MetadataQuads,
>
  extends Actor<IActionIteratorTransform<T, M>, IActorTest, IActorIteratorTransformOutput<T, M>> {
  public wraps: possibleOperationTypes[];
  /**
   * @param args - @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   */
  public constructor(args: IActorIteratorTransformArgs) {
    super(args);
  }

  public async run(action: IActionIteratorTransform<T, M>): Promise<IActorIteratorTransformOutput<T, M>> {
    const { stream, metadata } = await this.transformIterator(action);
    return {
      type: action.type,
      operation: action.operation,
      stream,
      metadata,
      originalAction: action.originalAction,
      context: action.context,
    
    };
  }

  public async test(
    action: IActionIteratorTransform<
    AsyncIterator<RDF.Bindings> | AsyncIterator<RDF.Quad>,
     MetadataBindings | MetadataQuads
     >,
  ): Promise<IActorTest> {
    if (!(this.wraps === undefined) && !this.wraps.includes(<possibleOperationTypes> action.operation)) {
      throw new Error(`Operation type not supported in configuration of ${this.name}`);
    }
    return true;
  }

  public abstract transformIterator<
  T extends AsyncIterator<RDF.Bindings> | AsyncIterator<RDF.Quad>,
  >(action: IActionIteratorTransform<T, M>): Promise<ITransformIteratorOutput<T, M>>;
}

export interface IActionIteratorTransform<T, M> extends IAction {
  /**
   * Whether the stream produces bindings or quads
   */
  type: 'bindings' | 'quads';
  /**
   * The operation that produced the stream
   */
  operation: string;
  /**
   * The stream to be transformed by the actor
   */
  stream: T;
  /**
   * Stream metadata
   */
  metadata: () => Promise<M>;
  /**
   * Action that produced the stream
   */
  originalAction: IAction;
}

export interface IActorIteratorTransformOutput<T, M> extends IActorOutput {
  /**
  * Whether the stream produces bindings or quads
  */
  type: 'bindings' | 'quads';
  /**
   * The operation that produced the stream
   */
  operation: string;
  /**
   * Transformed stream
   */
  stream: T;
  /**
   * Optionally transformed metadata
   */
  metadata: () => Promise<M>;
  /**
   * Action that produced the stream
   */
  originalAction: IAction;
  /**
   * (Unchanged)Context given in action
   */
  context: IActionContext;
}

export interface ITransformIteratorOutput<T, M> {
  /**
   * Transformed stream
   */
  stream: T;
  /**
   * Optionally transformed metadata
   */
  metadata: () => Promise<M>;
}

export interface IActorIteratorTransformArgs
  extends IActorArgs<IActionIteratorTransform<any, any>, IActorTest, IActorIteratorTransformOutput<any, any>> {
  /**
   * What types of operations the actor will wrap. If undefined the actor wraps every operation
   */
  wraps?: possibleOperationTypes[];
}

export type possibleOperationTypes = types | LogicalJoinType;

export type MediatorIteratorTransform = Mediate<IActionIteratorTransform<AsyncIterator<RDF.Bindings> |
AsyncIterator<RDF.Quad>, MetadataBindings | MetadataQuads>, IActorIteratorTransformOutput<
AsyncIterator<RDF.Bindings> | AsyncIterator<RDF.Quad>,
MetadataBindings | MetadataQuads
>>;
