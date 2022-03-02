import type { IActionAbstractMediaTyped,
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
  IActorTestAbstractMediaTypedMediaTypes } from '@comunica/actor-abstract-mediatyped';
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
  /**
   * @param args - @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   */
  public constructor(args: IActorQueryResultSerializeArgs) {
    super(args);
  }
}

export type IActionRootQueryResultSerialize = IActionAbstractMediaTyped<IActionSparqlSerialize>;
export type IActorTestRootQueryResultSerialize = IActorTestAbstractMediaTyped<IActorTest>;
export type IActorOutputRootQueryResultSerialize = IActorOutputAbstractMediaTyped<IActorQueryResultSerializeOutput>;

export type IActionQueryResultSerializeHandle = IActionAbstractMediaTypedHandle<IActionSparqlSerialize>;
export type IActorTestQueryResultSerializeHandle = IActorTestAbstractMediaTypedHandle<IActorTest>;
export type IActorOutputQueryResultSerializeHandle = IActorOutputAbstractMediaTypedHandle<
IActorQueryResultSerializeOutput>;

export type IActionQueryResultSerializeMediaTypes = IActionAbstractMediaTypedMediaTypes;
export type IActorTestQueryResultSerializeMediaTypes = IActorTestAbstractMediaTypedMediaTypes;
export type IActorOutputQueryResultSerializeMediaTypes = IActorOutputAbstractMediaTypedMediaTypes;

export type IActionQueryResultSerializeMediaTypeFormats = IActionAbstractMediaTypedMediaTypeFormats;
export type IActorTestQueryResultSerializeMediaTypeFormats = IActorTestAbstractMediaTypedMediaTypeFormats;
export type IActorOutputQueryResultSerializeMediaTypeFormats = IActorOutputAbstractMediaTypedMediaTypeFormats;

export interface IActionSparqlSerialize extends IAction, IQueryOperationResultBase {
  context: IActionContext;
}

export interface IActorQueryResultSerializeOutput extends IActorOutput {
  /**
   * A readable string stream in a certain SPARQL serialization that was serialized.
   */
  data: NodeJS.ReadableStream;
}

export type IActorQueryResultSerializeArgs = IActorArgsMediaTyped<
IActionSparqlSerialize, IActorTest, IActorQueryResultSerializeOutput>;

export type MediatorQueryResultSerializeHandle = Mediate<
IActionQueryResultSerializeHandle, IActorOutputQueryResultSerializeHandle, IActorTestQueryResultSerializeHandle>;

export type MediatorQueryResultSerializeMediaTypes = Mediate<
IActionQueryResultSerializeMediaTypes, IActorOutputQueryResultSerializeMediaTypes,
IActorTestQueryResultSerializeMediaTypes>;

export type MediatorQueryResultSerializeMediaTypeFormats = Mediate<IActionQueryResultSerializeMediaTypeFormats,
IActorOutputQueryResultSerializeMediaTypeFormats, IActorTestQueryResultSerializeMediaTypeFormats>;
