import {Actor, IAction, IActorArgs, IActorOutput, IActorTest} from "@comunica/core";
import * as RDF from "rdf-js";
import {PassThrough, Readable} from "stream";

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

  /**
   * Check if hard errors should occur on HTTP or parse errors.
   * @param {IActionRdfDereference} action An RDF dereference action.
   * @return {boolean} If hard errors are enabled.
   */
  protected isHardError(action: IActionRdfDereference): boolean {
    return !action.context || !action.context.get(KEY_CONTEXT_LENIENT);
  }

  /**
   * If hard errors are disabled, modify the given stream so that errors are delegated to the logger.
   * @param {IActionRdfDereference} action An RDF dereference action.
   * @param {Stream} quads A quad stream.
   * @return {Stream} The resulting quad stream.
   */
  protected handleDereferenceStreamErrors(action: IActionRdfDereference, quads: RDF.Stream): RDF.Stream {
    // If we don't emit hard errors, make parsing error events log instead, and silence them downstream.
    if (!this.isHardError(action)) {
      quads.on('error', (error) => {
        this.logError(action.context, error.message, { url: action.url });
        // Make sure the errored stream is ended.
        (<any> quads).push(null);
      });
      quads = (<any> quads).pipe(new PassThrough({ objectMode: true }));
    }
    return quads;
  }

  /**
   * Handle the given error as a rejection or delegate it to the logger,
   * depending on whether or not hard errors are enabled.
   * @param {IActionRdfDereference} action An RDF dereference action.
   * @param {Error} error An error that has occured.
   * @return {Promise<IActorRdfDereferenceOutput>} A promise that rejects or resolves to an empty output.
   */
  protected async handleDereferenceError(action: IActionRdfDereference, error: Error)
    : Promise<IActorRdfDereferenceOutput> {
    if (this.isHardError(action)) {
      throw error;
    } else {
      this.logError(action.context, error.message);
      const quads = new Readable();
      quads.push(null);
      return { url: action.url, quads };
    }
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
  /**
   * Optional HTTP method to use.
   * Defaults to GET.
   */
  method?: string;
  /**
   * Optional HTTP headers to pass.
   */
  headers?: {[key: string]: string};
}

export interface IActorRdfDereferenceOutput extends IActorOutput {
  /**
   * The page on which the output was found.
   *
   * This is not necessarily the same as the original input url,
   * as this may have changed due to redirects.
   */
  url: string;
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
  /**
   * The returned headers of the final URL.
   */
  headers?: {[key: string]: string};
}

export const KEY_CONTEXT_LENIENT: string = '@comunica/actor-init-sparql:lenient';
