import { ActorDereference, emptyReadable, IActionDereference, IActorDereferenceArgs, IActorDereferenceOutput } from '@comunica/bus-dereference';
import type { IActorHttpOutput, MediatorHttp } from '@comunica/bus-http';
import { ActorHttp } from '@comunica/bus-http';
import type { IActorTest } from '@comunica/core';
import { Headers } from 'cross-fetch';
import { resolve as resolveRelative } from 'relative-to-absolute-iri';
import * as stringifyStream from 'stream-to-string';

const REGEX_MEDIATYPE: RegExp = /^[^ ;]*/u;

function mediaTypesToAcceptString(mediaTypes: Record<string, number>, maxLength: number): string {
  const wildcard = '*/*;q=0.1';
  const parts: string[] = [];
  const sortedMediaTypes = Object.keys(mediaTypes)
    .map(mediaType => ({ mediaType, priority: mediaTypes[mediaType] }))
    .sort((left, right) => {
      if (right.priority === left.priority) {
        return left.mediaType.localeCompare(right.mediaType);
      }
      return right.priority - left.priority;
    });
  // Take into account the ',' characters joining each type
  let partsLength = sortedMediaTypes.length - 1;
  for (const entry of sortedMediaTypes) {
    const part = entry.mediaType + (entry.priority !== 1 ?
      `;q=${entry.priority.toFixed(3).replace(/0*$/u, '')}` :
      '');
    if (partsLength + part.length > maxLength) {
      while (partsLength + wildcard.length > maxLength) {
        const last = parts.pop() || '';
        // Don't forget the ','
        partsLength -= last.length + 1;
      }
      parts.push(wildcard);
      break;
    }
    parts.push(part);
    partsLength += part.length;
  }
  if (parts.length === 0) {
    return '*/*';
  }
  return parts.join(',');
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
  }

  public async test(action: IActionDereference): Promise<IActorTest> {
    if (!/^https?:/u.test(action.url)) {
      throw new Error(`Cannot retrieve ${action.url} because it is not an HTTP(S) URL.`);
    }
    return true;
  }

  public async run(action: IActionDereference): Promise<IActorDereferenceOutput> {
    let exists = true;

    const acceptHeader: string = mediaTypesToAcceptString(await action.mediaTypes?.() ?? {}, this.getMaxAcceptHeaderLength());

    // Resolve HTTP URL using appropriate accept header
    const headers: Headers = new Headers({ Accept: acceptHeader });

    // Append any custom passed headers
    for (const key in action.headers) {
      headers.append(key, action.headers[key]);
    }

    let httpResponse: IActorHttpOutput;
    const requestTimeStart = Date.now();
    try {
      httpResponse = await this.mediatorHttp.mediate({
        context: action.context,
        init: { headers, method: action.method },
        input: action.url,
      });
    } catch (error: unknown) {
      return this.handleDereferenceError(action, error, undefined, 0);
    }
    // The response URL can be relative to the given URL
    const url = resolveRelative(httpResponse.url, action.url);
    const requestTime = Date.now() - requestTimeStart;

    // Convert output headers to a hash
    const outputHeaders: Record<string, string> = {};
    // eslint-disable-next-line no-return-assign
    httpResponse.headers.forEach((value, key) => outputHeaders[key] = value);

    // Only parse if retrieval was successful
    if (httpResponse.status !== 200) {
      exists = false;
      // Consume the body, to avoid process to hang
      const bodyString = httpResponse.body ? await stringifyStream(ActorHttp.toNodeReadable(httpResponse.body)) : 'empty response';

      if (!action.acceptErrors) {
        const error = new Error(`Could not retrieve ${action.url} (HTTP status ${httpResponse.status}):\n${bodyString}`);
        return this.handleDereferenceError(action, error, outputHeaders, requestTime);
      }
    }

    let mediaType = REGEX_MEDIATYPE.exec(outputHeaders['content-type'] ?? '')?.[0];
    if (mediaType === 'text/plain') {
      mediaType = undefined;
    }

    // Return the parsed quad stream and whether or not only triples are supported
    return {
      url,
      data: exists ? ActorHttp.toNodeReadable(httpResponse.body) : emptyReadable(),
      exists,
      requestTime,
      headers: outputHeaders,
      mediaType,
    };
  }

  protected abstract getMaxAcceptHeaderLength(): number;
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
