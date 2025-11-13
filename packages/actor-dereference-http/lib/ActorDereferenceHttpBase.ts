import type {
  IActionDereference,
  IActorDereferenceArgs,
  IActorDereferenceOutput,
  IDereferenceCachePolicy,
  IDereferenceRevalidationPolicy,
} from '@comunica/bus-dereference';
import { ActorDereference, emptyReadable } from '@comunica/bus-dereference';
import type { IActorHttpOutput, MediatorHttp } from '@comunica/bus-http';
import { ActorHttp } from '@comunica/bus-http';
import type { IActorTest, TestResult } from '@comunica/core';
import { failTest, passTestVoid } from '@comunica/core';
import type { ICacheResponseHead } from '@comunica/types';
import { stringify as stringifyStream } from '@jeswr/stream-to-string';

// eslint-disable-next-line ts/no-require-imports
import type CachePolicy = require('http-cache-semantics');
import { resolve as resolveRelative } from 'relative-to-absolute-iri';

const REGEX_MEDIATYPE = /^[^ ;]*/u;
const REGEX_VERSION_HEADER = /version=([^ ;]*)/u;

export function mediaTypesToAcceptString(mediaTypes: Record<string, number>, maxLength: number): string {
  const wildcard = '*/*;q=0.1';
  const parts: string[] = [];
  const sortedMediaTypes = Object.entries(mediaTypes)
    .map(([ mediaType, priority ]) => ({ mediaType, priority }))
    .sort((left, right) => right.priority === left.priority ?
      left.mediaType.localeCompare(right.mediaType) :
      right.priority - left.priority);
  // Take into account the ',' characters joining each type
  let partsLength = sortedMediaTypes.length - 1;
  for (const { mediaType, priority } of sortedMediaTypes) {
    const part = mediaType + (priority === 1 ? '' : `;q=${priority.toFixed(3).replace(/0*$/u, '')}`);
    if (partsLength + part.length > maxLength) {
      while (partsLength + wildcard.length > maxLength) {
        const last = parts.pop() ?? '';
        // Don't forget the ','
        partsLength -= last.length + 1;
      }
      parts.push(wildcard);
      break;
    }
    parts.push(part);
    partsLength += part.length;
  }
  return parts.length === 0 ? '*/*' : parts.join(',');
}

/**
 * An actor that listens on the 'dereference' bus.
 *
 * It resolves the URL using the HTTP bus using an accept header compiled from the available media types.
 */
export abstract class ActorDereferenceHttpBase extends ActorDereference implements IActorDereferenceHttpArgs {
  public readonly mediatorHttp: MediatorHttp;
  public readonly maxAcceptHeaderLength: number;
  public readonly maxAcceptHeaderLengthBrowser: number;

  public constructor(args: IActorDereferenceHttpArgs) {
    super(args);
    this.mediatorHttp = args.mediatorHttp;
    this.maxAcceptHeaderLength = args.maxAcceptHeaderLength;
    this.maxAcceptHeaderLengthBrowser = args.maxAcceptHeaderLengthBrowser;
  }

  public async test({ url }: IActionDereference): Promise<TestResult<IActorTest>> {
    if (!/^https?:/u.test(url)) {
      return failTest(`Cannot retrieve ${url} because it is not an HTTP(S) URL.`);
    }
    return passTestVoid();
  }

  public async run(action: IActionDereference): Promise<IActorDereferenceOutput> {
    let exists = true;

    const maxAcceptHeaderLength = this.getMaxAcceptHeaderLength();
    const headers = await ActorDereferenceHttpBase.establishAcceptHeader(action, maxAcceptHeaderLength);
    let httpResponse: IActorHttpOutput;
    const requestTimeStart = Date.now();
    try {
      httpResponse = await this.mediatorHttp.mediate({
        context: action.context,
        init: { headers, method: action.method },
        input: action.url,
      });
    } catch (error: unknown) {
      return this.handleDereferenceErrors(action, error);
    }
    // The response URL can be relative to the given URL
    const url = resolveRelative(httpResponse.url, action.url);
    const requestTime = Date.now() - requestTimeStart;

    // Only parse if retrieval was successful
    if (httpResponse.status !== 200) {
      exists = false;
      // Consume the body, to avoid process to hang
      const bodyString = httpResponse.body ?
        await stringifyStream(ActorHttp.toNodeReadable(httpResponse.body)) :
        'empty response';

      if (!action.acceptErrors) {
        const error = new Error(`Could not retrieve ${action.url} (HTTP status ${httpResponse.status}):\n${bodyString}`);
        return this.handleDereferenceErrors(action, error, httpResponse.headers, requestTime);
      }
    }

    const contentType = httpResponse.headers.get('content-type') ?? '';
    const mediaType = REGEX_MEDIATYPE.exec(contentType)?.[0];
    const version = REGEX_VERSION_HEADER.exec(contentType)?.[1];

    // Return the parsed quad stream and whether or not only triples are supported
    return {
      url,
      data: exists ? ActorHttp.toNodeReadable(httpResponse.body) : emptyReadable(),
      exists,
      requestTime,
      status: httpResponse.status,
      headers: httpResponse.headers,
      mediaType: mediaType === 'text/plain' ? undefined : mediaType,
      version,
      cachePolicy: httpResponse.cachePolicy ?
        new DereferenceCachePolicyHttpWrapper(httpResponse.cachePolicy, maxAcceptHeaderLength) :
        undefined,
    };
  }

  protected abstract getMaxAcceptHeaderLength(): number;

  public static async establishAcceptHeader(
    action: IActionDereference,
    maxAcceptHeaderLength: number,
  ): Promise<Headers> {
    // Append any custom passed headers
    const headers = new Headers(action.headers);

    // Resolve HTTP URL using appropriate accept header
    headers.append(
      'Accept',
      mediaTypesToAcceptString(await action.mediaTypes?.() ?? {}, maxAcceptHeaderLength),
    );

    return headers;
  }
}

export class DereferenceCachePolicyHttpWrapper implements IDereferenceCachePolicy { // TODO: test, name, move
  public constructor(
    private readonly cachePolicy: CachePolicy,
    private readonly maxAcceptHeaderLength: number,
  ) {}

  public storable(): boolean {
    return this.cachePolicy.storable();
  }

  public async satisfiesWithoutRevalidation(action: IActionDereference): Promise<boolean> {
    return this.cachePolicy.satisfiesWithoutRevalidation(new Request(action.url, {
      headers: await ActorDereferenceHttpBase.establishAcceptHeader(action, this.maxAcceptHeaderLength),
      method: action.method,
    }));
  }

  public responseHeaders(): Headers {
    return this.cachePolicy.responseHeaders();
  }

  public timeToLive(): number {
    return this.cachePolicy.timeToLive();
  }

  public async revalidationHeaders(newAction: IActionDereference): Promise<Headers> {
    return this.cachePolicy.revalidationHeaders(new Request(newAction.url, {
      headers: await ActorDereferenceHttpBase.establishAcceptHeader(newAction, this.maxAcceptHeaderLength),
      method: newAction.method,
    }));
  }

  public async revalidatedPolicy(
    revalidationAction: IActionDereference,
    revalidationResponse: ICacheResponseHead,
  ): Promise<IDereferenceRevalidationPolicy> {
    const revalidatedPolicy = this.cachePolicy.revalidatedPolicy(
      new Request(revalidationAction.url, {
        headers: await ActorDereferenceHttpBase.establishAcceptHeader(revalidationAction, this.maxAcceptHeaderLength),
        method: revalidationAction.method,
      }),
      revalidationResponse,
    );
    return {
      policy: new DereferenceCachePolicyHttpWrapper(revalidatedPolicy.policy, this.maxAcceptHeaderLength),
      modified: revalidatedPolicy.modified,
      matches: revalidatedPolicy.matches,
    };
  }
}

export interface IActorDereferenceHttpArgs extends IActorDereferenceArgs {
  /**
   * The HTTP mediator.
   */
  mediatorHttp: MediatorHttp;
  /**
   * The maximum allowed accept header value length for non-browser environments.
   * @range {integer}
   * @default {1024}
   */
  maxAcceptHeaderLength: number;
  /**
   * The maximum allowed accept header value length for browser environments.
   * @range {integer}
   * @default {128}
   */
  maxAcceptHeaderLengthBrowser: number;
}
