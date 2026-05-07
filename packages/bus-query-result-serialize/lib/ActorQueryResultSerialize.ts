import type {
  IActionAbstractMediaTyped,
  IActionAbstractMediaTypedHandle,
  IActionAbstractMediaTypedMediaTypeFormats,
  IActionAbstractMediaTypedMediaTypes,
  IActorArgsMediaTyped,
  IActorOutputAbstractMediaTyped,
  IActorOutputAbstractMediaTypedHandle,
  IActorOutputAbstractMediaTypedMediaTypeFormats,
  IActorOutputAbstractMediaTypedMediaTypes,
  IActorTestAbstractMediaTyped,
  IActorTestAbstractMediaTypedHandle,
  IActorTestAbstractMediaTypedMediaTypeFormats,
  IActorTestAbstractMediaTypedMediaTypes,
} from '@comunica/actor-abstract-mediatyped';
import {
  ActorAbstractMediaTyped,
} from '@comunica/actor-abstract-mediatyped';
import type { IAction, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import type { IQueryOperationResultBase, IActionContext } from '@comunica/types';

/**
 * A comunica actor for query-result-serialize events.
 *
 * Actor types:
 * * Input:  IActionSparqlSerialize:      SPARQL bindings or a quad stream.
 * * Test:   <none>
 * * Output: IActorQueryResultSerializeOutput: A text stream.
 *
 * @see IActionSparqlSerialize
 * @see IActorQueryResultSerializeOutput
 */
export abstract class ActorQueryResultSerialize
  extends ActorAbstractMediaTyped<IActionSparqlSerialize, IActorTest, IActorQueryResultSerializeOutput> {
  /* eslint-disable max-len */
  /**
   * @param args -
   *   \ @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   *   \ @defaultNested {Query result serialization failed: none of the configured actors were able to serialize for type ${action.handle.type}} busFailMessage
   */
  /* eslint-enable max-len */
  public constructor(args: IActorQueryResultSerializeArgs) {
    super(args);
  }
}

/** Root action type for query result serialization. */
export type IActionRootQueryResultSerialize = IActionAbstractMediaTyped<IActionSparqlSerialize>;
/** Root test type for query result serialization. */
export type IActorTestRootQueryResultSerialize = IActorTestAbstractMediaTyped<IActorTest>;
/** Root output type for query result serialization. */
export type IActorOutputRootQueryResultSerialize = IActorOutputAbstractMediaTyped<IActorQueryResultSerializeOutput>;

/** Handle action type for query result serialization. */
export type IActionQueryResultSerializeHandle = IActionAbstractMediaTypedHandle<IActionSparqlSerialize>;
/** Handle test type for query result serialization. */
export type IActorTestQueryResultSerializeHandle = IActorTestAbstractMediaTypedHandle<IActorTest>;
/** Handle output type for query result serialization. */
export type IActorOutputQueryResultSerializeHandle = IActorOutputAbstractMediaTypedHandle<
IActorQueryResultSerializeOutput
>;

/** Media types action type for query result serialization. */
export type IActionQueryResultSerializeMediaTypes = IActionAbstractMediaTypedMediaTypes;
/** Media types test type for query result serialization. */
export type IActorTestQueryResultSerializeMediaTypes = IActorTestAbstractMediaTypedMediaTypes;
/** Media types output type for query result serialization. */
export type IActorOutputQueryResultSerializeMediaTypes = IActorOutputAbstractMediaTypedMediaTypes;

/** Media type formats action type for query result serialization. */
export type IActionQueryResultSerializeMediaTypeFormats = IActionAbstractMediaTypedMediaTypeFormats;
/** Media type formats test type for query result serialization. */
export type IActorTestQueryResultSerializeMediaTypeFormats = IActorTestAbstractMediaTypedMediaTypeFormats;
/** Media type formats output type for query result serialization. */
export type IActorOutputQueryResultSerializeMediaTypeFormats = IActorOutputAbstractMediaTypedMediaTypeFormats;

/**
 * Action input for SPARQL query result serialization, combining the query context with result metadata.
 */
export interface IActionSparqlSerialize extends IAction, IQueryOperationResultBase {
  context: IActionContext;
}

export interface IActorQueryResultSerializeOutput extends IActorOutput {
  /**
   * A readable string stream in a certain SPARQL serialization that was serialized.
   */
  data: NodeJS.ReadableStream;
}

/**
 * Constructor arguments for {@link ActorQueryResultSerialize}.
 */
export type IActorQueryResultSerializeArgs = IActorArgsMediaTyped<
IActionSparqlSerialize,
IActorTest,
IActorQueryResultSerializeOutput
>;

/**
 * Mediator type for query result serialization handle actions.
 */
export type MediatorQueryResultSerializeHandle = Mediate<
IActionQueryResultSerializeHandle,
IActorOutputQueryResultSerializeHandle,
IActorTestQueryResultSerializeHandle
>;

/**
 * Mediator type for query result serialization media type queries.
 */
export type MediatorQueryResultSerializeMediaTypes = Mediate<
IActionQueryResultSerializeMediaTypes,
IActorOutputQueryResultSerializeMediaTypes,
IActorTestQueryResultSerializeMediaTypes
>;

/**
 * Mediator type for query result serialization media type format queries.
 */
export type MediatorQueryResultSerializeMediaTypeFormats = Mediate<
  IActionQueryResultSerializeMediaTypeFormats,
IActorOutputQueryResultSerializeMediaTypeFormats,
IActorTestQueryResultSerializeMediaTypeFormats
>;
