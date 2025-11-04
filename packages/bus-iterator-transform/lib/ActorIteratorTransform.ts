import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate, TestResult } from '@comunica/core';
import { Actor, failTest } from '@comunica/core';
import type { LogicalJoinType, IActionContext, MetadataBindings, MetadataQuads } from '@comunica/types';
import type { KnownOperation } from '@comunica/utils-algebra/lib/Algebra';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';

/**
 * A comunica actor for transform-iterator events.
 *
 * Actor types:
 *  Input:  IActionIteratorTransform: Data that denotes what type of stream is being wrapped,
 *   what actor produced this stream, and the stream itself
 * * Test:   <none>
 * * Output: IActorIteratorTransformOutput: The transformed stream and additional metadata.
 *
 * @see IActionIteratorTransform
 * @see IActorIteratorTransformOutput
 */
export abstract class ActorIteratorTransform<TS = undefined>
  extends Actor<ActionIteratorTransform, IActorTest, ActorIteratorTransformOutput, TS> {
  public wraps: possibleOperationTypes[] | undefined;
  /**
   * @param args - @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   */
  public constructor(args: IActorIteratorTransformArgs<TS>) {
    super(args);
    this.wraps = args.wraps;
  }

  public async run(action: ActionIteratorTransform):
  Promise<ActorIteratorTransformOutput> {
    if (action.type === 'bindings') {
      const { stream, metadata } = await this.transformIteratorBindings(action);
      return {
        type: action.type,
        operation: action.operation,
        stream,
        metadata,
        originalAction: action.originalAction,
        context: action.context,
      };
    }

    const { stream, metadata } = await this.transformIteratorQuads(action);
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
    action: ActionIteratorTransform,
  ): Promise<TestResult<IActorTest, TS>> {
    if (this.wraps && !this.wraps.includes(action.operation)) {
      return failTest(`Operation type not supported in configuration of ${this.name}`);
    }
    return this.testIteratorTransform(action);
  }

  protected abstract testIteratorTransform(action: ActionIteratorTransform):
  Promise<TestResult<IActorTest, TS>>;

  public abstract transformIteratorBindings(action: IActionIteratorTransformBindings):
  Promise<ITransformIteratorOutput<AsyncIterator<RDF.Bindings>, MetadataBindings>>;

  public abstract transformIteratorQuads(action: IActionIteratorTransformQuads):
  Promise<ITransformIteratorOutput<AsyncIterator<RDF.Quad>, MetadataQuads>>;
}

export interface IActionIteratorTransform<T extends 'bindings' | 'quads', S, M> extends IAction {
  /**
   * Whether the stream produces bindings or quads
   */
  type: T;
  /**
   * The operation that produced the stream
   */
  operation: possibleOperationTypes;
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
  extends IActionIteratorTransform<'bindings', AsyncIterator<RDF.Bindings>, MetadataBindings> {
}

export interface IActionIteratorTransformQuads
  extends IActionIteratorTransform<'quads', AsyncIterator<RDF.Quad>, MetadataQuads> {
}

export type ActionIteratorTransform = IActionIteratorTransformBindings | IActionIteratorTransformQuads;

export interface IActorIteratorTransformOutput<T extends 'bindings' | 'quads', S, M> extends IActorOutput {
  /**
   * Whether the stream produces bindings or quads
   */
  type: T;
  /**
   * The operation that produced the stream
   */
  operation: possibleOperationTypes;
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
  extends IActorIteratorTransformOutput<'bindings', AsyncIterator<RDF.Bindings>, MetadataBindings> {
}

export interface IActorIteratorTransformQuadOutput
  extends IActorIteratorTransformOutput<'quads', AsyncIterator<RDF.Quad>, MetadataQuads> {
}

export type ActorIteratorTransformOutput =
  IActorIteratorTransformBindingsOutput | IActorIteratorTransformQuadOutput;

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

export interface IActorIteratorTransformArgs<TS = undefined> extends IActorArgs<
  ActionIteratorTransform,
  IActorTest,
ActorIteratorTransformOutput,
TS
  > {
  /**
   * What types of operations the actor will wrap. If undefined the actor wraps every operation
   */
  wraps?: possibleOperationTypes[];
}

export type possibleOperationTypes = KnownOperation | LogicalJoinType | string;

export type MediatorIteratorTransform =
  Mediate<
  ActionIteratorTransform,
  ActorIteratorTransformOutput
  >;
