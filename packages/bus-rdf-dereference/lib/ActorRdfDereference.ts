import { PassThrough, Readable } from 'stream';
import { KeysInitSparql } from '@comunica/context-entries';
import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import { Actor } from '@comunica/core';
import type * as RDF from '@rdfjs/types';

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
  /**
   * @param args - @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   */
  public constructor(args: IActorRdfDereferenceArgs) {
    super(args);
  }

  /**
   * Check if hard errors should occur on HTTP or parse errors.
   * @param {IActionRdfDereference} action An RDF dereference action.
   * @return {boolean} If hard errors are enabled.
   */
  protected isHardError(action: IActionRdfDereference): boolean {
    return !action.context.get(KeysInitSparql.lenient);
  }

  /**
   * If hard errors are disabled, modify the given stream so that errors are delegated to the logger.
   * @param {IActionRdfDereference} action An RDF dereference action.
   * @param {Stream} quads A quad stream.
   * @return {Stream} The resulting quad stream.
   */
  protected handleDereferenceStreamErrors(action: IActionRdfDereference,
    quads: RDF.Stream & Readable): RDF.Stream & Readable {
    // If we don't emit hard errors, make parsing error events log instead, and silence them downstream.
    if (!this.isHardError(action)) {
      quads.on('error', error => {
        this.logError(action.context, error.message, () => ({ url: action.url }));
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
   * @param headers Optional HTTP headers to pass.
   * @param {number} requestTime The time it took to request the page in milliseconds.
   * @return {Promise<IActorRdfDereferenceOutput>} A promise that rejects or resolves to an empty output.
   */
  protected async handleDereferenceError(
    action: IActionRdfDereference,
    error: unknown,
    headers: Record<string, string> | undefined,
    requestTime: number,
  ): Promise<IActorRdfDereferenceOutput> {
    if (this.isHardError(action)) {
      throw error;
    } else {
      this.logError(action.context, (<Error> error).message);
      const quads = new Readable();
      quads.push(null);
      return { url: action.url, quads, exists: false, headers, requestTime };
    }
  }
}

export interface IActionRdfDereference extends IAction {
  /**
   * The URL to dereference
   */
  url: string;

  /**
   * By default, actors will reject upon receiving non-200 HTTP responses.
   * If this option is true, then all HTTP responses will cause the action to resolve,
   * but some outputs may therefore contain empty quad streams.
   */
  acceptErrors?: boolean;

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
  headers?: Record<string, string>;
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
  quads: RDF.Stream & Readable;
  /**
   * This will always be true, unless `acceptErrors` was set to true in the action and the dereferencing failed.
   */
  exists: boolean;
  /**
   * The time it took to request the page in milliseconds.
   * This is the time until the first byte arrives.
   */
  requestTime: number;
  /**
   * An optional field indicating if the given quad stream originates from a triple-based serialization,
   * in which everything is serialized in the default graph.
   * If falsy, the quad stream contains actual quads, otherwise they should be interpreted as triples.
   */
  triples?: boolean;
  /**
   * The returned headers of the final URL.
   */
  headers?: Record<string, string>;
}

export type IActorRdfDereferenceArgs = IActorArgs<IActionRdfDereference, IActorTest, IActorRdfDereferenceOutput>;

export type MediatorRdfDereference = Mediate<IActionRdfDereference, IActorRdfDereferenceOutput>;
