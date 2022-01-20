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
import type { IQueryableResultBase, IActionContext } from '@comunica/types';

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

export type IActionRootSparqlParse = IActionAbstractMediaTyped<IActionSparqlSerialize>;
export type IActorTestRootSparqlParse = IActorTestAbstractMediaTyped<IActorTest>;
export type IActorOutputRootSparqlParse = IActorOutputAbstractMediaTyped<IActorQueryResultSerializeOutput>;

export type IActionSparqlSerializeHandle = IActionAbstractMediaTypedHandle<IActionSparqlSerialize>;
export type IActorTestSparqlSerializeHandle = IActorTestAbstractMediaTypedHandle<IActorTest>;
export type IActorOutputSparqlSerializeHandle = IActorOutputAbstractMediaTypedHandle<IActorQueryResultSerializeOutput>;

export type IActionSparqlSerializeMediaTypes = IActionAbstractMediaTypedMediaTypes;
export type IActorTestSparqlSerializeMediaTypes = IActorTestAbstractMediaTypedMediaTypes;
export type IActorOutputSparqlSerializeMediaTypes = IActorOutputAbstractMediaTypedMediaTypes;

export type IActionSparqlSerializeMediaTypeFormats = IActionAbstractMediaTypedMediaTypeFormats;
export type IActorTestSparqlSerializeMediaTypeFormats = IActorTestAbstractMediaTypedMediaTypeFormats;
export type IActorOutputSparqlSerializeMediaTypeFormats = IActorOutputAbstractMediaTypedMediaTypeFormats;

export interface IActionSparqlSerialize extends IAction, IQueryableResultBase {
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

export type MediatorSparqlSerializeHandle = Mediate<
IActionSparqlSerializeHandle, IActorOutputSparqlSerializeHandle, IActorTestSparqlSerializeHandle>;

export type MediatorSparqlSerializeMediaTypes = Mediate<
IActionSparqlSerializeMediaTypes, IActorOutputSparqlSerializeMediaTypes, IActorTestSparqlSerializeMediaTypes>;

export type MediatorSparqlSerializeMediaTypeFormats = Mediate<IActionSparqlSerializeMediaTypeFormats,
IActorOutputSparqlSerializeMediaTypeFormats, IActorTestSparqlSerializeMediaTypeFormats>;
