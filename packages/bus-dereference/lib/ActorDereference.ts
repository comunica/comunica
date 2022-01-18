import { KeysInitSparql } from '@comunica/context-entries';
import { Actor, IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import { PassThrough, Readable } from 'stream';

/**
 * A base actor for dereferencing URLs to (generic) streams.
 *
 * Actor types:
 * * Input:  IActionDereference:      A URL.
 * * Test:   <none>
 * * Output: IActorDereferenceOutput: A Readable stream
 *
 * @see IActionDereference
 * @see IActorDereferenceOutput
 */
export abstract class ActorDereference extends Actor<IActionDereference, IActorTest, IActorDereferenceOutput> {
  /**
   * @param args - @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   */
  public constructor(args: IActorDereferenceArgs) {
    super(args);
  }

  /**
   * Check if hard errors should occur on HTTP or parse errors.
   * @param {IActionDereference} action A dereference action.
   * @return {boolean} If hard errors are enabled.
   */
   protected isHardError(action: IActionDereference): boolean {
    return !action.context.get(KeysInitSparql.lenient);
  }

  /**
   * If hard errors are disabled, modify the given stream so that errors are delegated to the logger.
   * @param {IActionDereference} action A dereference action.
   * @param {Readable} data A data stream.
   * @return {Readable} The resulting data stream.
   */
  protected handleDereferenceStreamErrors(action: IActionDereference, data: Readable): Readable {
    // If we don't emit hard errors, make parsing error events log instead, and silence them downstream.
    if (!this.isHardError(action)) {
      data.on('error', error => {
        this.logError(action.context, error.message, () => ({ url: action.url }));
        // Make sure the errored stream is ended.
        data.push(null);
      });
      data = data.pipe(new PassThrough({ objectMode: true }));
    }
    return data;
  }

  /**
   * Handle the given error as a rejection or delegate it to the logger,
   * depending on whether or not hard errors are enabled.
   * @param {IActionDereference} action A dereference action.
   * @param {Error} error An error that has occured.
   * @param headers Optional HTTP headers to pass.
   * @param {number} requestTime The time it took to request the page in milliseconds.
   * @return {Promise<IActorDereferenceOutput>} A promise that rejects or resolves to an empty output.
   */
  protected async handleDereferenceError(
    action: IActionDereference,
    error: unknown,
    headers: Record<string, string> | undefined,
    requestTime: number,
  ): Promise<IActorDereferenceOutput> {
    if (this.isHardError(action)) {
      throw error;
    } else {
      this.logError(action.context, (<Error> error).message);
      const data = new Readable();
      data.push(null);
      return { url: action.url, data, exists: false, headers, requestTime };
    }
  }
}

export interface IActionDereference extends IAction {
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

export interface IActorDereferenceOutput extends IActorOutput {
  /**
   * The page on which the output was found.
   *
   * This is not necessarily the same as the original input url,
   * as this may have changed due to redirects.
   */
   url: string;
   /**
    * The resulting stream.
    */
   data: Readable;
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
    * The returned headers of the final URL.
    */
   headers?: Record<string, string>;
}

export type IActorDereferenceArgs = IActorArgs<IActionDereference, IActorTest, IActorDereferenceOutput>;

export type MediatorDereference = Mediate<IActionDereference, IActorDereferenceOutput>;
