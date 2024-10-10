import type { LogicalJoinType } from '@comunica/bus-rdf-join';
import type { ActionContext, IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
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
  extends Actor<ActionIteratorTransform, IActorTest, 
    IActorIteratorTransformBindingsOutput | IActorIteratorTransformQuadOutput> {
  public wraps: possibleOperationTypes[];
  /**
   * @param args - @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   */
  public constructor(args: IActorIteratorTransformArgs) {
    super(args);
  }

  public async run(action: ActionIteratorTransform): 
    Promise<IActorIteratorTransformBindingsOutput | IActorIteratorTransformQuadOutput> {
    const { stream, metadata } = await this.transformIterator(action);
    return {
      type: returnType,
      operation: action.operation,
      stream,
      metadata,
      originalAction: action.originalAction,
      context: action.context,
    };  
  }

  public async test(
    action: ActionIteratorTransform,
  ): Promise<IActorTest> {
    if (!(this.wraps === undefined) && !this.wraps.includes(<possibleOperationTypes> action.operation)) {
      throw new Error(`Operation type not supported in configuration of ${this.name}`);
    }
    return true;
  }
  public abstract transformIteratorTest<T extends ActionIteratorTransform>(action: T):
    Promise<T extends {'type':'bindings'} ? ITransformIteratorOutput<AsyncIterator<RDF.Bindings>, MetadataBindings> :
    ITransformIteratorOutput<AsyncIterator<RDF.Quad>, MetadataQuads>>;

  public abstract transformIterator(action: IActionIteratorTransformBindings): 
    Promise<ITransformIteratorOutput<AsyncIterator<RDF.Bindings>, MetadataBindings>>;

  public abstract transformIterator(action: IActionIteratorTransformQuad): 
    Promise<ITransformIteratorOutput<AsyncIterator<RDF.Quad>, MetadataQuads>>;
  
  public abstract transformIterator(action: ActionIteratorTransform):
    Promise<ITransformIteratorOutput<AsyncIterator<RDF.Quad>, MetadataQuads>|ITransformIteratorOutput<AsyncIterator<RDF.Bindings>, MetadataBindings>>
}

export interface IActionIteratorTransform<T extends 'bindings'|'quad', S, M> extends IAction {
  /**
   * Whether the stream produces bindings or quads
   */
  type: T;
  /**
   * The operation that produced the stream
   */
  operation: string;
  /**
   * The stream to be transformed by the actor
   */
  stream: S;
  /**
   * Stream metadata
   */
  metadata: () => Promise<M>;
  /**
   * Action that produced the stream
   */
  originalAction: IAction;
}

export interface IActionIteratorTransformBindings 
  extends IActionIteratorTransform<'bindings', AsyncIterator<RDF.Bindings>, MetadataBindings>{
}

export interface IActionIteratorTransformQuad
extends IActionIteratorTransform<'quad', AsyncIterator<RDF.Quad>, MetadataQuads>{
}

export type ActionIteratorTransform = IActionIteratorTransformBindings | IActionIteratorTransformQuad;

export interface IActorIteratorTransformOutput<T extends 'bindings'|'quad', S, M> extends IActorOutput {
  /**
  * Whether the stream produces bindings or quads
  */
  type: T;
  /**
   * The operation that produced the stream
   */
  operation: string;
  /**
   * Transformed stream
   */
  stream: S;
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

export interface IActorIteratorTransformBindingsOutput 
  extends IActorIteratorTransformOutput<'bindings', AsyncIterator<RDF.Bindings>, MetadataBindings>{
}

export interface IActorIteratorTransformQuadOutput
  extends IActorIteratorTransformOutput<'quad', AsyncIterator<RDF.Quad>, MetadataQuads>{
}

export interface ITransformIteratorOutput<S, M> {
  /**
   * Transformed stream
   */
  stream: S;
  /**
   * Optionally transformed metadata
   */
  metadata: () => Promise<M>;
}

export interface IActorIteratorTransformArgs
  extends IActorArgs<IActionIteratorTransformBindings | IActionIteratorTransformQuad, 
    IActorTest, IActorIteratorTransformBindingsOutput | IActorIteratorTransformQuadOutput> {
  /**
   * What types of operations the actor will wrap. If undefined the actor wraps every operation
   */
  wraps?: possibleOperationTypes[];
}

export type possibleOperationTypes = types | LogicalJoinType;

export type MediatorIteratorTransform = Mediate<IActionIteratorTransformBindings | IActionIteratorTransformQuad, 
  IActorIteratorTransformBindingsOutput | IActorIteratorTransformQuadOutput>;
