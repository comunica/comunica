import {Actor, IAction, IActorArgs, IActorOutput, IActorTest} from "@comunica/core";
import {AsyncIterator} from "asynciterator";
import * as RDF from "rdf-js";

/**
 * A base actor for dereferencing URLs to quad streams and following pages.
 *
 * Actor types:
 * * Input:  IActionRdfDereferencePaged:      A URL.
 * * Test:   <none>
 * * Output: IActorRdfDereferencePagedOutput: A quad data and optional metadata stream
 *
 * @see IActionRdfDereference
 * @see IActorRdfDereferenceOutput
 */
export abstract class ActorRdfDereferencePaged
  extends Actor<IActionRdfDereferencePaged, IActorTest, IActorRdfDereferencePagedOutput> {

  constructor(args: IActorArgs<IActionRdfDereferencePaged, IActorTest, IActorRdfDereferencePagedOutput>) {
    super(args);
  }

}

export interface IActionRdfDereferencePaged extends IAction {
  /**
   * The URL to dereference
   */
  url: string;
}

export interface IActorRdfDereferencePagedOutput extends IActorOutput {
  /**
   * The page on which the output was found.
   *
   * This is not necessarily the same as the original input url,
   * as this may have changed due to redirects.
   */
  firstPageUrl: string;
  /**
   * The resulting quad data stream over all pages.
   */
  data: AsyncIterator<RDF.Quad> & RDF.Stream;
  /**
   * A callback returning a promise resolving to the extracted metadata key-value mapping of the first page.
   * This callback can be invoked multiple times.
   * The actors that return this metadata will make sure that multiple calls properly cache this promise.
   * Metadata will not be collected until this callback is invoked.
   */
  firstPageMetadata?: () => Promise<{[id: string]: any}>;
  /**
   * An optional field indicating if the given quad stream originates from a triple-based serialization,
   * in which everything is serialized in the default graph.
   * If falsy, the quad stream contain actual quads, otherwise they should be interpreted as triples.
   */
  triples?: boolean;
}
