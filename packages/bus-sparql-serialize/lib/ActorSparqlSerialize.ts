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
import type { IAction, IActorOutput, IActorTest, Mediated } from '@comunica/core';
import type { IQueryableResultBase, IActionContext } from '@comunica/types';

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
  /**
   * @param args - @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   */
  public constructor(args: IActorSparqlSerializeArgs) {
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

export interface IActionSparqlSerialize extends IAction, IQueryableResultBase {
  context: IActionContext;
}

export interface IActorSparqlSerializeOutput extends IActorOutput {
  /**
   * A readable string stream in a certain SPARQL serialization that was serialized.
   */
  data: NodeJS.ReadableStream;
}

export type IActorSparqlSerializeArgs = IActorArgsMediaTyped<
IActionSparqlSerialize, IActorTest, IActorSparqlSerializeOutput>;

export type MediatorSparqlSerializeHandle = Mediated<
IActionSparqlSerializeHandle, IActorOutputSparqlSerializeHandle, IActorTestSparqlSerializeHandle>;

export type MediatorSparqlSerializeMediaTypes = Mediated<
IActionSparqlSerializeMediaTypes, IActorOutputSparqlSerializeMediaTypes, IActorTestSparqlSerializeMediaTypes>;

export type MediatorSparqlSerializeMediaTypeFormats = Mediated<IActionSparqlSerializeMediaTypeFormats,
IActorOutputSparqlSerializeMediaTypeFormats, IActorTestSparqlSerializeMediaTypeFormats>;
