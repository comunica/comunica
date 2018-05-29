import {Actor, IAction, IActorArgs, IActorOutput, IActorTest} from "@comunica/core";
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

  /**
   * The mediatype of the source (if it can't be inferred from the source)
   */
  mediaType?: string;
}

export interface IActorRdfDereferenceOutput extends IActorOutput {
  /**
   * The page on which the output was found.
   *
   * This is not necessarily the same as the original input url,
   * as this may have changed due to redirects.
   */
  pageUrl: string;
  /**
   * The resulting quad stream.
   */
  quads: RDF.Stream;
  /**
   * An optional field indicating if the given quad stream originates from a triple-based serialization,
   * in which everything is serialized in the default graph.
   * If falsy, the quad stream contains actual quads, otherwise they should be interpreted as triples.
   */
  triples?: boolean;
}
