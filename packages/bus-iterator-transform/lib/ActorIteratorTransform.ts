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
  /**
   * The operation types this actor wraps, or undefined to wrap all operation types.
   */
  public wraps: possibleOperationTypes[] | undefined;
  /**
   * @param args - @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   */
  public constructor(args: IActorIteratorTransformArgs<TS>) {
    super(args);
    this.wraps = args.wraps;
  }

  /**
   * Runs the iterator transform action by delegating to the appropriate bindings or quads transformer.
   * @param action The iterator transform action to run.
   * @return The transformed iterator output.
   */
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

  /**
   * Tests whether this actor can handle the given transform action based on the configured operation types.
   * @param action The iterator transform action to test.
   * @return A test result indicating whether this actor can handle the action.
   */
  public async test(
    action: ActionIteratorTransform,
  ): Promise<TestResult<IActorTest, TS>> {
    if (this.wraps && !this.wraps.includes(action.operation)) {
      return failTest(`Operation type not supported in configuration of ${this.name}`);
    }
    return this.testIteratorTransform(action);
  }

  /**
   * Tests actor-specific transform capability beyond the operation type check.
   * @param action The iterator transform action to test.
   * @return A test result indicating whether this actor can handle the action.
   */
  protected abstract testIteratorTransform(action: ActionIteratorTransform):
  Promise<TestResult<IActorTest, TS>>;

  /**
   * Transforms a bindings iterator stream.
   * @param action The bindings iterator transform action.
   * @return The transformed bindings stream and metadata.
   */
  public abstract transformIteratorBindings(action: IActionIteratorTransformBindings):
  Promise<ITransformIteratorOutput<AsyncIterator<RDF.Bindings>, MetadataBindings>>;

  /**
   * Transforms a quads iterator stream.
   * @param action The quads iterator transform action.
   * @return The transformed quads stream and metadata.
   */
  public abstract transformIteratorQuads(action: IActionIteratorTransformQuads):
  Promise<ITransformIteratorOutput<AsyncIterator<RDF.Quad>, MetadataQuads>>;
}

/**
 * Action input for iterator transform operations.
 * @template T The stream type discriminator, either 'bindings' or 'quads'.
 * @template S The stream type.
 * @template M The metadata type.
 */
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

/**
 * Action input for bindings iterator transforms.
 */
export interface IActionIteratorTransformBindings
  extends IActionIteratorTransform<'bindings', AsyncIterator<RDF.Bindings>, MetadataBindings> {
}

/**
 * Action input for quads iterator transforms.
 */
export interface IActionIteratorTransformQuads
  extends IActionIteratorTransform<'quads', AsyncIterator<RDF.Quad>, MetadataQuads> {
}

/**
 * Union type of bindings and quads transform actions.
 */
export type ActionIteratorTransform = IActionIteratorTransformBindings | IActionIteratorTransformQuads;

/**
 * Output of an iterator transform actor.
 * @template T The stream type discriminator, either 'bindings' or 'quads'.
 * @template S The stream type.
 * @template M The metadata type.
 */
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

/**
 * Output for bindings iterator transforms.
 */
export interface IActorIteratorTransformBindingsOutput
  extends IActorIteratorTransformOutput<'bindings', AsyncIterator<RDF.Bindings>, MetadataBindings> {
}

/**
 * Output for quads iterator transforms.
 */
export interface IActorIteratorTransformQuadOutput
  extends IActorIteratorTransformOutput<'quads', AsyncIterator<RDF.Quad>, MetadataQuads> {
}

/**
 * Union type of bindings and quads transform outputs.
 */
export type ActorIteratorTransformOutput =
  IActorIteratorTransformBindingsOutput | IActorIteratorTransformQuadOutput;

/**
 * The result of a stream transformation.
 * @template S The stream type.
 * @template M The metadata type.
 */
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

/**
 * Constructor arguments for {@link ActorIteratorTransform}.
 * @template TS The test side-data type.
 */
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

/**
 * The possible operation types an iterator transform actor can wrap.
 */
export type possibleOperationTypes = KnownOperation | LogicalJoinType | string;

/**
 * Mediator type for iterator transform actors.
 */
export type MediatorIteratorTransform =
  Mediate<
  ActionIteratorTransform,
  ActorIteratorTransformOutput
  >;
