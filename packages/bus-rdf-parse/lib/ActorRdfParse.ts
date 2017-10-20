import {Actor, IAction, IActorOutput, IActorTest} from "@comunica/core";
import {IActorArgs} from "@comunica/core/lib/Actor";
import * as RDF from "rdf-js";
import {Readable} from "stream";

/**
 * A base actor for listening to init events.
 *
 * Actor types:
 * * Input:  IActionRdfParse:      The input stream in a certain RDF serialization.
 * * Test:   <none>
 * * Output: IActorRdfParseOutput: The parsed quads.
 *
 * @see IActionInit
 */
export abstract class ActorRdfParse extends Actor<IActionRdfParse, IActorTest, IActorRdfParseOutput> {

  constructor(args: IActorArgs<IActionRdfParse, IActorTest, IActorRdfParseOutput>) {
    super(args);
  }

}

/**
 * The RDF parse input, which contains the input stream in the given media type.
 */
export interface IActionRdfParse extends IAction {
  /**
   * A readable string stream in a certain RDF serialization that needs to be parsed.
   */
  input: Readable;
  /**
   * Media type that identifies the RDF serialization of the given input.
   */
  mediaType: string;
}

export interface IActorRdfParseOutput extends IActorOutput {
  /**
   * The resulting quad stream.
   */
  quads: RDF.Stream;
}
