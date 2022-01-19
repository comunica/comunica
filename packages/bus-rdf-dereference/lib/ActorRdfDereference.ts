import { MediatorDereference } from '@comunica/bus-dereference';
import { IActorRdfParseOutput, MediatorRdfParseHandle, MediatorRdfParseMediaTypes } from '@comunica/bus-rdf-parse';
import { Actor, IAction, IActorArgs, IActorOutput, IActorTest } from '@comunica/core';

/**
 * A base actor for dereferencing URLs to quad streams.
 *
 * Actor types:
 * * Input:  IActionRdfDereference:      TODO: fill in.
 * * Test:   <none>
 * * Output: IActorRdfDereferenceOutput: TODO: fill in.
 *
 * @see IActionRdfDereference
 * @see IActorRdfDereferenceOutput
 */
export abstract class ActorRdfDereference extends Actor<IActionRdfDereference, IActorTest, IActorRdfDereferenceOutput> {
  public readonly mediatorDereference: MediatorDereference;
  public readonly mediatorRdfParseHandle: MediatorRdfParseHandle;
  public readonly mediatorRdfParseMediaTypes?: MediatorRdfParseMediaTypes;

  public constructor(args: IActorRdfDereferenceArgs) {
    super(args);
  }

  public async test(action: IActionRdfDereference): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionRdfDereference): Promise<IActorRdfDereferenceOutput> {
    const { url, headers, data, exists } = await this.mediatorDereference.mediate({ ...action, mediaTypes: async () => ( await this.mediatorRdfParseMediaTypes?.mediate({ context: action.context, mediaTypes: true }))?.mediaTypes ?? {} });
    
    let parseOutput: IActorRdfParseOutput;
    try {
      parseOutput = (await this.mediatorRdfParseHandle.mediate({
      context: action.context,
      handle: {
        context: action.context,
        baseIRI: url,
        headers: new Headers(headers ?? {}),
        input: data
      },
    })).handle
  } catch (error: unknown) {
    // Close the body, to avoid process to hang
    await data.close?.();
    return this.handleDereferenceError(action, error, headers);
  }

  const quads = this.handleDereferenceStreamErrors(action, parseOutput.quads);

  // Return the parsed quad stream and whether or not only triples are supported
  return { url, quads, exists, triples: parseOutput.triples, headers };
}
}

export interface IActorRdfDereferenceArgs extends IActorArgs<IActionRdfDereference, IActorTest, IActorRdfDereferenceOutput> {
  mediatorDereference: MediatorDereference;
  mediatorRdfParseHandle: MediatorRdfParseHandle;
  mediatorRdfParseMediaTypes?: MediatorRdfParseMediaTypes;
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
