import type { IActionAbstractMediaTyped, IActorArgsMediaTyped,
  IActorTestAbstractMediaTyped, IActorOutputAbstractMediaTypedHandle,
  IActionAbstractMediaTypedHandle,
  IActionAbstractMediaTypedMediaTypeFormats,
  IActionAbstractMediaTypedMediaTypes, IActorOutputAbstractMediaTypedMediaTypeFormats,
  IActorOutputAbstractMediaTypedMediaTypes,
  IActorTestAbstractMediaTypedHandle, IActorTestAbstractMediaTypedMediaTypeFormats,
  IActorTestAbstractMediaTypedMediaTypes } from '@comunica/actor-abstract-mediatyped';
import {
  ActorAbstractMediaTyped,
} from '@comunica/actor-abstract-mediatyped';
import type { IAction, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import type * as RDF from '@rdfjs/types';

/**
 * A comunica actor for RDF parse events.
 *
 * Actor types:
 * * Input:  IActionRdfSerialize:      A serialize input or a media type input.
 * * Test:   <none>
 * * Output: IActorRdfSerializeOutput: The serialized quads.
 *
 * @see IActionRdfSerialize
 * @see IActorRdfSerializeOutput
 */
export abstract class ActorRdfSerialize extends
  ActorAbstractMediaTyped<IActionRdfSerialize, IActorTest, IActorRdfSerializeOutput> {
  /**
   * @param args - @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   */
  public constructor(args: IActorRdfSerializeArgs) {
    super(args);
  }
}

export type IActionRootRdfSerialize = IActionAbstractMediaTyped<IActionRdfSerialize>;
export type IActorTestRootRdfSerialize = IActorTestAbstractMediaTyped<IActorTest>;
export type IActorOutputRootRdfSerialize = IActorOutputAbstractMediaTypedHandle<IActorRdfSerializeOutput>;

export type IActionRdfSerializeHandle = IActionAbstractMediaTypedHandle<IActionRdfSerialize>;
export type IActorTestRdfSerializeHandle = IActorTestAbstractMediaTypedHandle<IActorTest>;
export type IActorOutputRdfSerializeHandle = IActorOutputAbstractMediaTypedHandle<IActorRdfSerializeOutput>;

export type IActionRdfSerializeMediaTypes = IActionAbstractMediaTypedMediaTypes;
export type IActorTestRdfSerializeMediaTypes = IActorTestAbstractMediaTypedMediaTypes;
export type IActorOutputRdfSerializeMediaTypes = IActorOutputAbstractMediaTypedMediaTypes;

export type IActionRdfSerializeMediaTypeFormats = IActionAbstractMediaTypedMediaTypeFormats;
export type IActorTestRdfSerializeMediaTypeFormats = IActorTestAbstractMediaTypedMediaTypeFormats;
export type IActorOutputRdfSerializeMediaTypeFormats = IActorOutputAbstractMediaTypedMediaTypeFormats;

export interface IActionRdfSerialize extends IAction {
  /**
   * The stream of quads.
   */
  quadStream: RDF.Stream;
}

export interface IActorRdfSerializeOutput extends IActorOutput {
  /**
   * A readable string stream in a certain RDF serialization that was serialized.
   */
  data: NodeJS.ReadableStream;
  /**
   * An optional field indicating if the given output stream uses a triple-based serialization,
   * in which everything is serialized in the default graph.
   * If falsy, the quad stream contain actual quads, otherwise they should be interpreted as triples.
   */
  triples?: boolean;
}

export type IActorRdfSerializeArgs = IActorArgsMediaTyped<IActionRdfSerialize, IActorTest, IActorRdfSerializeOutput>;

export type MediatorRdfSerializeHandle = Mediate<
IActionRdfSerializeHandle, IActorOutputRdfSerializeHandle, IActorTestRdfSerializeHandle>;

export type MediatorRdfSerialize = Mediate<
IActionRootRdfSerialize, IActorOutputRootRdfSerialize, IActorTestRootRdfSerialize>;

export type MediatorRdfSerializeMediaTypes = Mediate<
IActionRdfSerializeMediaTypes, IActorOutputRdfSerializeMediaTypes, IActorTestRdfSerializeMediaTypes>;

export type MediatorRdfSerializeMediaTypeFormats = Mediate<
IActionRdfSerializeMediaTypeFormats, IActorOutputRdfSerializeMediaTypeFormats, IActorTestRdfSerializeMediaTypeFormats>;
