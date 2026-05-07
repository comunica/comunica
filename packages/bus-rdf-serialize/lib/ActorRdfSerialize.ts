import type {
  IActionAbstractMediaTyped,
  IActorArgsMediaTyped,
  IActorTestAbstractMediaTyped,
  IActorOutputAbstractMediaTypedHandle,
  IActionAbstractMediaTypedHandle,
  IActionAbstractMediaTypedMediaTypeFormats,
  IActionAbstractMediaTypedMediaTypes,
  IActorOutputAbstractMediaTypedMediaTypeFormats,
  IActorOutputAbstractMediaTypedMediaTypes,
  IActorTestAbstractMediaTypedHandle,
  IActorTestAbstractMediaTypedMediaTypeFormats,
  IActorTestAbstractMediaTypedMediaTypes,
} from '@comunica/actor-abstract-mediatyped';
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

/** Root action type for RDF serialization. */
export type IActionRootRdfSerialize = IActionAbstractMediaTyped<IActionRdfSerialize>;
/** Root test type for RDF serialization. */
export type IActorTestRootRdfSerialize = IActorTestAbstractMediaTyped<IActorTest>;
/** Root output type for RDF serialization. */
export type IActorOutputRootRdfSerialize = IActorOutputAbstractMediaTypedHandle<IActorRdfSerializeOutput>;

/** Handle action type for RDF serialization. */
export type IActionRdfSerializeHandle = IActionAbstractMediaTypedHandle<IActionRdfSerialize>;
/** Handle test type for RDF serialization. */
export type IActorTestRdfSerializeHandle = IActorTestAbstractMediaTypedHandle<IActorTest>;
/** Handle output type for RDF serialization. */
export type IActorOutputRdfSerializeHandle = IActorOutputAbstractMediaTypedHandle<IActorRdfSerializeOutput>;

/** Media types action type for RDF serialization. */
export type IActionRdfSerializeMediaTypes = IActionAbstractMediaTypedMediaTypes;
/** Media types test type for RDF serialization. */
export type IActorTestRdfSerializeMediaTypes = IActorTestAbstractMediaTypedMediaTypes;
/** Media types output type for RDF serialization. */
export type IActorOutputRdfSerializeMediaTypes = IActorOutputAbstractMediaTypedMediaTypes;

/** Media type formats action type for RDF serialization. */
export type IActionRdfSerializeMediaTypeFormats = IActionAbstractMediaTypedMediaTypeFormats;
/** Media type formats test type for RDF serialization. */
export type IActorTestRdfSerializeMediaTypeFormats = IActorTestAbstractMediaTypedMediaTypeFormats;
/** Media type formats output type for RDF serialization. */
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

/**
 * Constructor arguments for {@link ActorRdfSerialize}.
 */
export type IActorRdfSerializeArgs = IActorArgsMediaTyped<IActionRdfSerialize, IActorTest, IActorRdfSerializeOutput>;

/**
 * Mediator type for RDF serialization handle actions.
 */
export type MediatorRdfSerializeHandle = Mediate<
IActionRdfSerializeHandle,
IActorOutputRdfSerializeHandle,
IActorTestRdfSerializeHandle
>;

/**
 * Mediator type for RDF serialization root actions.
 */
export type MediatorRdfSerialize = Mediate<
IActionRootRdfSerialize,
IActorOutputRootRdfSerialize,
IActorTestRootRdfSerialize
>;

/**
 * Mediator type for RDF serialization media type queries.
 */
export type MediatorRdfSerializeMediaTypes = Mediate<
IActionRdfSerializeMediaTypes,
IActorOutputRdfSerializeMediaTypes,
IActorTestRdfSerializeMediaTypes
>;

/**
 * Mediator type for RDF serialization media type format queries.
 */
export type MediatorRdfSerializeMediaTypeFormats = Mediate<
IActionRdfSerializeMediaTypeFormats,
IActorOutputRdfSerializeMediaTypeFormats,
IActorTestRdfSerializeMediaTypeFormats
>;
