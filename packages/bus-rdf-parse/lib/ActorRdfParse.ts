import type {
  IActionAbstractMediaTyped,
  IActionAbstractMediaTypedHandle,
  IActionAbstractMediaTypedMediaTypes,
  IActorArgsMediaTyped,
  IActorOutputAbstractMediaTyped,
  IActorOutputAbstractMediaTypedHandle,
  IActorOutputAbstractMediaTypedMediaTypes,
  IActorTestAbstractMediaTyped,
  IActorTestAbstractMediaTypedHandle,
  IActorTestAbstractMediaTypedMediaTypes,
  IActionAbstractMediaTypedMediaTypeFormats,
  IActorOutputAbstractMediaTypedMediaTypeFormats,
  IActorTestAbstractMediaTypedMediaTypeFormats,
} from '@comunica/actor-abstract-mediatyped';
import { ActorAbstractMediaTyped } from '@comunica/actor-abstract-mediatyped';
import type { IActionParse, IActorParseOutput } from '@comunica/actor-abstract-parse';
import type { IActorTest, Mediate } from '@comunica/core';
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
export abstract class ActorRdfParse extends ActorAbstractMediaTyped<IActionRdfParse, IActorTest, IActorRdfParseOutput> {
  /**
   * @param args - @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   */
  public constructor(args: IActorRdfParseArgs) {
    super(args);
  }
}

/** Root action type for RDF parsing. */
export type IActionRootRdfParse = IActionAbstractMediaTyped<IActionRdfParse>;
/** Root test type for RDF parsing. */
export type IActorTestRootRdfParse = IActorTestAbstractMediaTyped<IActorTest>;
/** Root output type for RDF parsing. */
export type IActorOutputRootRdfParse = IActorOutputAbstractMediaTyped<IActorRdfParseOutput>;

/** Handle action type for RDF parsing. */
export type IActionRdfParseHandle = IActionAbstractMediaTypedHandle<IActionRdfParse>;
/** Handle test type for RDF parsing. */
export type IActorTestRdfParseHandle = IActorTestAbstractMediaTypedHandle<IActorTest>;
/** Handle output type for RDF parsing. */
export type IActorOutputRdfParseHandle = IActorOutputAbstractMediaTypedHandle<IActorRdfParseOutput>;

/** Media types action type for RDF parsing. */
export type IActionRdfParseMediaTypes = IActionAbstractMediaTypedMediaTypes;
/** Media types test type for RDF parsing. */
export type IActorTestRdfParseMediaTypes = IActorTestAbstractMediaTypedMediaTypes;
/** Media types output type for RDF parsing. */
export type IActorOutputRdfParseMediaTypes = IActorOutputAbstractMediaTypedMediaTypes;

/** Media type formats action type for RDF parsing. */
export type IActionRdfParseMediaTypeFormats = IActionAbstractMediaTypedMediaTypeFormats;
/** Media type formats test type for RDF parsing. */
export type IActorTestRdfParseMediaTypeFormats = IActorTestAbstractMediaTypedMediaTypeFormats;
/** Media type formats output type for RDF parsing. */
export type IActorOutputRdfParseMediaTypeFormats = IActorOutputAbstractMediaTypedMediaTypeFormats;

export interface IActionRdfParseMetadata {
  /**
   * The base IRI for parsed quads.
   */
  baseIRI?: string;
  /**
   * The version that was defined as media type parameter.
   */
  version?: string;
}

/**
 * The RDF parse input, which contains the input stream in the given media type.
 * One of the fields MUST be truthy.
 */
export type IActionRdfParse = IActionParse<IActionRdfParseMetadata>;

export interface IActorRdfParseOutputMetadata {
  /**
   * An optional field indicating if the given quad stream originates from a triple-based serialization,
   * in which everything is serialized in the default graph.
   * If falsy, the quad stream contain actual quads, otherwise they should be interpreted as triples.
   */
  triples?: boolean;
}

/**
 * Output type combining the parsed RDF quad stream and associated metadata.
 */
export type IActorRdfParseOutput = IActorParseOutput<RDF.Stream, IActorRdfParseOutputMetadata>;

/**
 * Constructor arguments for {@link ActorRdfParse}.
 */
export type IActorRdfParseArgs = IActorArgsMediaTyped<IActionRdfParse, IActorTest, IActorRdfParseOutput>;

/**
 * Mediator type for RDF parse handle actions.
 */
export type MediatorRdfParseHandle = Mediate<
IActionRdfParseHandle,
IActorOutputRdfParseHandle,
IActorTestRdfParseHandle
>;

/**
 * Mediator type for RDF parse media type queries.
 */
export type MediatorRdfParseMediaTypes = Mediate<
IActionRdfParseMediaTypes,
IActorOutputRdfParseMediaTypes,
IActorTestRdfParseMediaTypes
>;

/**
 * Mediator type for RDF parse media type format queries.
 */
export type MediatorRdfParseMediaTypeFormats = Mediate<
IActionRdfParseMediaTypeFormats,
IActorOutputRdfParseMediaTypeFormats,
IActorTestRdfParseMediaTypeFormats
>;
