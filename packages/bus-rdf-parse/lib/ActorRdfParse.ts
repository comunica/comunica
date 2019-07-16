import {ActorAbstractMediaTyped, IActionAbstractMediaTyped, IActorArgsMediaTyped,
  IActorOutputAbstractMediaTyped, IActorTestAbstractMediaTyped} from "@comunica/actor-abstract-mediatyped";
import {IAction, IActorOutput, IActorTest} from "@comunica/core";
import * as RDF from "rdf-js";

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

  constructor(args: IActorArgsMediaTyped<IActionRdfParse, IActorTest, IActorRdfParseOutput>) {
    super(args);
  }

}

export type IActionRootRdfParse = IActionAbstractMediaTyped<IActionRdfParse>;
export type IActorTestRootRdfParse = IActorTestAbstractMediaTyped<IActorTest>;
export type IActorOutputRootRdfParse = IActorOutputAbstractMediaTyped<IActorRdfParseOutput>;

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
  quads: RDF.Stream;
  /**
   * An optional field indicating if the given quad stream originates from a triple-based serialization,
   * in which everything is serialized in the default graph.
   * If falsy, the quad stream contain actual quads, otherwise they should be interpreted as triples.
   */
  triples?: boolean;
}
