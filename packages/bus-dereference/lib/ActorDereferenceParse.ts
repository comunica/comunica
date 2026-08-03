import type { MediateMediaTyped, MediateMediaTypes } from '@comunica/actor-abstract-mediatyped';
import type { IActionParse, IActorParseOutput, IParseMetadata } from '@comunica/actor-abstract-parse';
import type { IActorArgs, IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type { Readable } from 'readable-stream';
import { PassThrough } from 'readable-stream';
import type {
  IActionDereference,
  IActorDereferenceOutput,
  MediatorDereference,
} from './ActorDereference';
import { ActorDereferenceBase, isHardError, emptyReadable, shouldLogWarning } from './ActorDereferenceBase';
import { DereferenceRdfCachePolicyDereferenceWrapper } from './DereferenceRdfCachePolicyDereferenceWrapper';

/**
 * Get the media type based on the extension of the given path,
 * which can be an URL or file path.
 * @param {string} path A path.
 * @param {Record<string, string>} mediaMappings A collection of mappings,
 * mapping file extensions to their corresponding media type.
 * @return {string} A media type or the empty string.
 */
export function getMediaTypeFromExtension(path: string, mediaMappings?: Record<string, string>): string {
  const dotIndex = path.lastIndexOf('.');
  // Get extension after last dot and map to media
  // eslint-disable-next-line ts/prefer-nullish-coalescing
  return (dotIndex >= 0 && mediaMappings?.[path.slice(dotIndex + 1)]) || '';
}

export interface IActorDereferenceParseArgs<
  S,
  K extends IParseMetadata = IParseMetadata,
  M extends IParseMetadata = IParseMetadata,
> extends IActorArgs<IActionDereferenceParse<K>, IActorTest, IActorDereferenceParseOutput<S, M>> {
  mediatorDereference: MediatorDereference;
  mediatorParse: MediateMediaTyped<IActionParse<K>, IActorTest, IActorParseOutput<S, M>>;
  mediatorParseMediatypes: MediateMediaTypes;
  /**
   * A collection of mappings, mapping file extensions to their corresponding media type.
   * @range {json}
   */
  mediaMappings: Record<string, string>;
}

/**
 * An abstract actor that handles dereference and parse actions.
 *
 * Actor types:
 * Input:  IActionDereferenceParse:      A URL.
 * Test:   <none>
 * Output: IActorDereferenceParseOutput: A data stream of type output by the Parser.
 *
 */
export abstract class ActorDereferenceParse<
  S,
  K extends IParseMetadata = IParseMetadata,
  M extends IParseMetadata = IParseMetadata,
> extends ActorDereferenceBase<IActionDereferenceParse<K>, IActorTest, IActorDereferenceParseOutput<S, M>> {
  public readonly mediatorDereference: MediatorDereference;
  public readonly mediatorParse: MediateMediaTyped<IActionParse<K>, IActorTest, IActorParseOutput<S, M>>;
  public readonly mediatorParseMediatypes: MediateMediaTypes;
  public readonly mediaMappings: Record<string, string>;

  public constructor(args: IActorDereferenceParseArgs<S, K, M>) {
    super(args);
    this.mediatorDereference = args.mediatorDereference;
    this.mediatorParse = args.mediatorParse;
    this.mediatorParseMediatypes = args.mediatorParseMediatypes;
    this.mediaMappings = args.mediaMappings;
  }

  public async test(_action: IActionDereference): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  /**
   * If hard errors are disabled, modify the given stream so that errors are delegated to the logger.
   * @param {IActionDereferenceParse} action A dereference action.
   * @param {Readable} data A data stream.
   * @return {Readable} The resulting data stream.
   */
  protected handleDereferenceStreamErrors<L extends IParseMetadata, T extends Readable>(
    action: IActionDereferenceParse<L>,
    data: T,
  ): T {
    // If we don't emit hard errors, make parsing error events log instead, and silence them downstream.
    if (!isHardError(action.context)) {
      data.on('error', (error) => {
        if (shouldLogWarning(error)) {
          this.logWarn(action.context, error.message, () => ({ url: action.url }));
        }
        // Make sure the errored stream is ended.
        data.push(null);
      });
      data = <PassThrough & T> data.pipe(new PassThrough({ objectMode: true }));
    }
    return data;
  }

  public abstract getMetadata(dereference: IActorDereferenceOutput): Promise<K | undefined>;

  public async run(action: IActionDereferenceParse<K>): Promise<IActorDereferenceParseOutput<S, M>> {
    const { context } = action;
    const mediaTypes: () => Promise<Record<string, number> | undefined> =
      async() => (await this.mediatorParseMediatypes?.mediate({ context, mediaTypes: true }))?.mediaTypes;
    const dereference = await this.mediatorDereference.mediate({ ...action, mediaTypes });

    let result: IActorParseOutput<S, M>;

    if (dereference.exists) {
      try {
        result = (await this.mediatorParse.mediate({
          context,
          handle: { context, ...dereference, metadata: await this.getMetadata(dereference) },
          // eslint-disable-next-line ts/prefer-nullish-coalescing
          handleMediaType: dereference.mediaType || action.mediaType ||
            getMediaTypeFromExtension(dereference.url, this.mediaMappings),
        })).handle;
        result.data = this.handleDereferenceStreamErrors(action, result.data);
      } catch (error: unknown) {
        // Close the body, to avoid process to hang
        await dereference.data.close?.();
        result = await this.dereferenceErrorHandler(action, error, {});
      }
    } else {
      // Close the dereference stream and return an empty response directly to avoid unnecessary processing.
      // This code is equivalent to the error handler above in the catch clause, but avoids redundant processing.
      await dereference.data.close?.();
      result = { data: emptyReadable() };
    }

    // Return the parsed stream and any metadata
    return {
      ...dereference,
      ...result,
      cachePolicy: dereference.cachePolicy ?
        new DereferenceRdfCachePolicyDereferenceWrapper(dereference.cachePolicy, mediaTypes) :
        undefined,
    };
  }
}

export interface IActionDereferenceParse<T extends IParseMetadata = IParseMetadata> extends IActionDereference {
  /**
   * The mediatype of the source (if it can't be inferred from the source)
   */
  mediaType?: string;
  /**
   * Metadata to be given to the parser
   */
  metadata?: T;
}

export type IActorDereferenceParseOutput<T, K extends IParseMetadata = IParseMetadata>
  = Omit<IActorDereferenceOutput, 'data'> & IActorParseOutput<T, K>;
