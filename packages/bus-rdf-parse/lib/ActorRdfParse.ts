import type { Readable } from 'stream';
import type { IActionAbstractMediaTyped,
  IActionAbstractMediaTypedHandle, IActionAbstractMediaTypedMediaTypes,
  IActorArgsMediaTyped,
  IActorOutputAbstractMediaTyped,
  IActorOutputAbstractMediaTypedHandle, IActorOutputAbstractMediaTypedMediaTypes,
  IActorTestAbstractMediaTyped,
  IActorTestAbstractMediaTypedHandle,
  IActorTestAbstractMediaTypedMediaTypes,
  IActionAbstractMediaTypedMediaTypeFormats,
  IActorOutputAbstractMediaTypedMediaTypeFormats,
  IActorTestAbstractMediaTypedMediaTypeFormats } from '@comunica/actor-abstract-mediatyped';
import {
  ActorAbstractMediaTyped,
} from '@comunica/actor-abstract-mediatyped';
import type { IAction, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import type * as RDF from '@rdfjs/types';

/**
 * A base actor for listening to RDF parse events.
 *
 * Actor types:
 * * Input:  IActionRdfParseOrMediaType:      A parse input or a media type input.
 * * Test:   <none>
 * * Output: IActorOutputRdfParseOrMediaType: The parsed quads.
 *
 * @see IActionInit
 */
export abstract class ActorRdfParse extends
  ActorAbstractMediaTyped<IActionRdfParse, IActorTest, IActorRdfParseOutput> {
  /**
   * @param args - @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   */
  public constructor(args: IActorRdfParseArgs) {
    super(args);
  }
}

export type IActionRootRdfParse = IActionAbstractMediaTyped<IActionRdfParse>;
export type IActorTestRootRdfParse = IActorTestAbstractMediaTyped<IActorTest>;
export type IActorOutputRootRdfParse = IActorOutputAbstractMediaTyped<IActorRdfParseOutput>;

export type IActionRdfParseHandle = IActionAbstractMediaTypedHandle<IActionRdfParse>;
export type IActorTestRdfParseHandle = IActorTestAbstractMediaTypedHandle<IActorTest>;
export type IActorOutputRdfParseHandle = IActorOutputAbstractMediaTypedHandle<IActorRdfParseOutput>;

export type IActionRdfParseMediaTypes = IActionAbstractMediaTypedMediaTypes;
export type IActorTestRdfParseMediaTypes = IActorTestAbstractMediaTypedMediaTypes;
export type IActorOutputRdfParseMediaTypes = IActorOutputAbstractMediaTypedMediaTypes;

export type IActionRdfParseMediaTypeFormats = IActionAbstractMediaTypedMediaTypeFormats;
export type IActorTestRdfParseMediaTypeFormats = IActorTestAbstractMediaTypedMediaTypeFormats;
export type IActorOutputRdfParseMediaTypeFormats = IActorOutputAbstractMediaTypedMediaTypeFormats;

/**
 * The RDF parse input, which contains the input stream in the given media type.
 * One of the fields MUST be truthy.
 */
export interface IActionRdfParse extends IAction {
  /**
   * A readable string stream in a certain RDF serialization that needs to be parsed.
   */
  input: NodeJS.ReadableStream;
  /**
   * The base IRI for parsed quads.
   */
  baseIRI: string;
  /**
   * The headers with which the RDF document should be parsed.
   */
  headers?: Headers;
}

export interface IActorRdfParseOutput extends IActorOutput {
  /**
   * The resulting quad stream.
   */
  quads: RDF.Stream & Readable;
  /**
   * An optional field indicating if the given quad stream originates from a triple-based serialization,
   * in which everything is serialized in the default graph.
   * If falsy, the quad stream contain actual quads, otherwise they should be interpreted as triples.
   */
  triples?: boolean;
}

export type IActorRdfParseArgs = IActorArgsMediaTyped<IActionRdfParse, IActorTest, IActorRdfParseOutput>;

export type MediatorRdfParseHandle = Mediate<
IActionRdfParseHandle, IActorOutputRdfParseHandle, IActorTestRdfParseHandle>;

export type MediatorRdfParseMediaTypes = Mediate<
IActionRdfParseMediaTypes, IActorOutputRdfParseMediaTypes, IActorTestRdfParseMediaTypes>;

export type MediatorRdfParseMediaTypeFormats = Mediate<
IActionRdfParseMediaTypeFormats, IActorOutputRdfParseMediaTypeFormats, IActorTestRdfParseMediaTypeFormats>;
