import type { Readable } from 'stream';
import { PassThrough } from 'stream';
import type { MediateMediaTyped, MediateMediaTypes } from '@comunica/actor-abstract-mediatyped';
import type { IActionParse, IActorParseOutput, IParseMetadata } from '@comunica/actor-abstract-parse';
import type { IActionDereference, IActorDereferenceOutput, MediatorDereference } from '@comunica/bus-dereference';
import { isHardError, emptyReadable } from '@comunica/bus-dereference';
import type { IActorArgs, IActorOutput, IActorTest } from '@comunica/core';
import { Actor } from '@comunica/core';
import type { IActionContext } from '@comunica/types';

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
  return (dotIndex >= 0 && mediaMappings?.[path.slice(dotIndex + 1)]) || '';
}

export interface IAbstractDereferenceParseArgs<
  S,
  K extends IParseMetadata = IParseMetadata,
  M extends IParseMetadata = IParseMetadata
> extends IActorArgs<IActionDereferenceParse<K>, IActorTest, IActorDereferenceParseOutput<S, M>> {
  mediatorDereference: MediatorDereference;
  mediatorParseHandle: MediateMediaTyped<IActionParse<K>, IActorTest, IActorParseOutput<S, M>>;
  mediatorParseMediaTypes?: MediateMediaTypes;
  mediaMappings?: Record<string, string>;
}

export abstract class AbstractDereferenceParse<
  S,
  K extends IParseMetadata = IParseMetadata,
  M extends IParseMetadata = IParseMetadata> extends
  Actor<IActionDereferenceParse<K>, IActorTest, IActorDereferenceParseOutput<S, M>> {
  public readonly mediatorDereference: MediatorDereference;
  public readonly mediatorParseHandle: MediateMediaTyped<IActionParse<K>, IActorTest, IActorParseOutput<S, M>>;
  public readonly mediatorParseMediaTypes?: MediateMediaTypes;
  public readonly mediaMappings?: Record<string, string>;

  public constructor(args: IAbstractDereferenceParseArgs<S, K, M>) {
    super(args);
  }

  public mediaTypesFactory(context: IActionContext): (() => Promise<Record<string, number> | undefined>) {
    return async() => (await this.mediatorParseMediaTypes?.mediate({ context, mediaTypes: true }))?.mediaTypes;
  }

  public async test(action: IActionDereference): Promise<IActorTest> {
    return true;
  }

  /**
   * If hard errors are disabled, modify the given stream so that errors are delegated to the logger.
   * @param {IActionDereference} action A dereference action.
   * @param {Readable} data A data stream.
   * @return {Readable} The resulting data stream.
   * TODO: FIX THIS TYPE
   */
  protected handleDereferenceStreamErrors<L, T extends Readable>(action: IActionDereferenceParse<L>, data: T): T {
    // If we don't emit hard errors, make parsing error events log instead, and silence them downstream.
    if (!isHardError(action.context)) {
      data.on('error', error => {
        this.logError(action.context, error.message, () => ({ url: action.url }));
        // Make sure the errored stream is ended.
        data.push(null);
      });
      data = <PassThrough & T> data.pipe(new PassThrough({ objectMode: true }));
    }
    return data;
  }

  public async getMetadata(dereference: IActorDereferenceOutput): Promise<K | undefined> {
    return undefined;
  }

  public async run(action: IActionDereferenceParse<K>): Promise<IActorDereferenceParseOutput<S, M>> {
    const { context } = action;
    const dereference = await this.mediatorDereference.mediate({
      ...action,
      mediaTypes: async() => (await this.mediatorParseMediaTypes?.mediate({ context, mediaTypes: true }))?.mediaTypes,
    });

    let result: IActorParseOutput<S, M>;
    try {
      result = (await this.mediatorParseHandle.mediate({
        context,
        handle: { context, ...dereference, metadata: await this.getMetadata(dereference) },
        handleMediaType: dereference.mediaType ??
          getMediaTypeFromExtension(dereference.url, this.mediaMappings) ??
          action.mediaType,
      })).handle;
      result.data = this.handleDereferenceStreamErrors(action, result.data);
    } catch (error: unknown) {
      // Close the body, to avoid process to hang
      await dereference.data.close?.();
      if (isHardError(context)) {
        throw error;
      }
      this.logError(context, (<Error> error).message);
      result = { data: emptyReadable() };
    }

    // Return the parsed stream and any metadata
    return { ...dereference, ...result };
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

export interface IActorDereferenceOutputPartial extends IActorOutput {
  /**
   * The page on which the output was found.
   *
   * This is not necessarily the same as the original input url,
   * as this may have changed due to redirects.
   */
  url: string;
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
  headers?: Headers;
  /**
   * The mediatype of the source
   */
  mediaType?: string;
}

export interface IActorDereferenceParseOutput<T, K extends IParseMetadata = IParseMetadata> extends
  IActorDereferenceOutputPartial, IActorParseOutput<T, K> {
}
