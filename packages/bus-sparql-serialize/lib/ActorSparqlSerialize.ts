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
import type { IAction, IActorOutput, IActorTest } from '@comunica/core';
import type { IActorQueryOperationOutputBase } from '@comunica/types';

/**
 * A comunica actor for sparql-serialize events.
 *
 * Actor types:
 * * Input:  IActionSparqlSerialize:      SPARQL bindings or a quad stream.
 * * Test:   <none>
 * * Output: IActorSparqlSerializeOutput: A text stream.
 *
 * @see IActionSparqlSerialize
 * @see IActorSparqlSerializeOutput
 */
export abstract class ActorSparqlSerialize
  extends ActorAbstractMediaTyped<IActionSparqlSerialize, IActorTest, IActorSparqlSerializeOutput> {
  public constructor(args: IActorArgsMediaTyped<IActionSparqlSerialize, IActorTest, IActorSparqlSerializeOutput>) {
    super(args);
  }
}

export type IActionRootSparqlParse = IActionAbstractMediaTyped<IActionSparqlSerialize>;
export type IActorTestRootSparqlParse = IActorTestAbstractMediaTyped<IActorTest>;
export type IActorOutputRootSparqlParse = IActorOutputAbstractMediaTyped<IActorSparqlSerializeOutput>;

export type IActionSparqlSerializeHandle = IActionAbstractMediaTypedHandle<IActionSparqlSerialize>;
export type IActorTestSparqlSerializeHandle = IActorTestAbstractMediaTypedHandle<IActorTest>;
export type IActorOutputSparqlSerializeHandle = IActorOutputAbstractMediaTypedHandle<IActorSparqlSerializeOutput>;

export type IActionSparqlSerializeMediaTypes = IActionAbstractMediaTypedMediaTypes;
export type IActorTestSparqlSerializeMediaTypes = IActorTestAbstractMediaTypedMediaTypes;
export type IActorOutputSparqlSerializeMediaTypes = IActorOutputAbstractMediaTypedMediaTypes;

export type IActionSparqlSerializeMediaTypeFormats = IActionAbstractMediaTypedMediaTypeFormats;
export type IActorTestSparqlSerializeMediaTypeFormats = IActorTestAbstractMediaTypedMediaTypeFormats;
export type IActorOutputSparqlSerializeMediaTypeFormats = IActorOutputAbstractMediaTypedMediaTypeFormats;

export interface IActionSparqlSerialize extends IAction, IActorQueryOperationOutputBase {
}

export interface IActorSparqlSerializeOutput extends IActorOutput {
  /**
   * A readable string stream in a certain SPARQL serialization that was serialized.
   */
  data: NodeJS.ReadableStream;
}
