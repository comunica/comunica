import {Actor, IAction, IActorOutput, IActorTest} from "@comunica/core";
import {IActorArgs} from "@comunica/core/lib/Actor";
import * as RDF from "rdf-js";

/**
 * A base actor for dereferencing URLs to quad streams.
 *
 * Actor types:
 * * Input:  IActionRdfDereference:      A URL.
 * * Test:   <none>
 * * Output: IActorRdfDereferenceOutput: A quad stream.
 *
 * @see IActionRdfDereference
 * @see IActorRdfDereferenceOutput
 */
export abstract class ActorRdfDereference extends Actor<IActionRdfDereference, IActorTest, IActorRdfDereferenceOutput> {

  constructor(args: IActorArgs<IActionRdfDereference, IActorTest, IActorRdfDereferenceOutput>) {
    super(args);
  }

}

export interface IActionRdfDereference extends IAction {
  /**
   * The URL to dereference
   */
  url: string;
}

export interface IActorRdfDereferenceOutput extends IActorOutput {
  /**
   * The resulting quad stream.
   */
  quads: RDF.Stream;
}
