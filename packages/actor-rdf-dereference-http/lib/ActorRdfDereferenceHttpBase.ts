import { Readable } from 'stream';
import type { IActionHttp, IActorHttpOutput, MediatorHttp } from '@comunica/bus-http';
import { ActorHttp } from '@comunica/bus-http';
import type { IActionRdfDereference,
  IActorRdfDereferenceMediaMappingsArgs,
  IActorRdfDereferenceOutput } from '@comunica/bus-rdf-dereference';
import {
  ActorRdfDereferenceMediaMappings,
} from '@comunica/bus-rdf-dereference';
import type {
  IActionRdfParse, IActorRdfParseOutput, MediatorRdfParseMediaTypes, MediatorRdfParseHandle,
} from '@comunica/bus-rdf-parse';
import type { IActorTest } from '@comunica/core';
import { Headers } from 'cross-fetch';
import { resolve as resolveRelative } from 'relative-to-absolute-iri';
import * as stringifyStream from 'stream-to-string';

/**
 * An actor that listens on the 'rdf-dereference' bus.
 *
 * It starts by grabbing all available RDF media types from the RDF parse bus.
 * After that, it resolves the URL using the HTTP bus using an accept header compiled from the available media types.
 * Finally, the response is parsed using the RDF parse bus.
 */
export abstract class ActorRdfDereferenceHttpBase extends ActorRdfDereferenceMediaMappings
  implements IActorRdfDereferenceHttpArgs {
  public static readonly REGEX_MEDIATYPE: RegExp = /^[^ ;]*/u;

  public readonly mediatorHttp: MediatorHttp;
  public readonly mediatorRdfParseMediatypes: MediatorRdfParseMediaTypes;
  public readonly mediatorRdfParseHandle: MediatorRdfParseHandle;
  public readonly maxAcceptHeaderLength: number;
  public readonly maxAcceptHeaderLengthBrowser: number;

  public constructor(args: IActorRdfDereferenceHttpArgs) {
    super(args);
  }

  public async test(action: IActionRdfDereference): Promise<IActorTest> {
    if (!/^https?:/u.test(action.url)) {
      throw new Error(`Cannot retrieve ${action.url} because it is not an HTTP(S) URL.`);
    }
    return true;
  }

  public async run(action: IActionRdfDereference): Promise<IActorRdfDereferenceOutput> {
    let exists = true;

    // Define accept header based on available media types.
    const { mediaTypes } = await this.mediatorRdfParseMediatypes.mediate(
      { context: action.context, mediaTypes: true },
    );

    // Append any custom passed headers
    const headers: Headers = new Headers(action.headers);

    // Resolve HTTP URL using appropriate accept header
    headers.append('Accept', this.mediaTypesToAcceptString(mediaTypes, this.getMaxAcceptHeaderLength()));

    const httpAction: IActionHttp = {
      context: action.context,
      init: { headers, method: action.method },
      input: action.url,
    };
    let httpResponse: IActorHttpOutput;
    const requestTimeStart = Date.now();
    try {
      httpResponse = await this.mediatorHttp.mediate(httpAction);
    } catch (error: unknown) {
      return this.handleDereferenceError(action, error, undefined, 0);
    }
    // The response URL can be relative to the given URL
    const url = resolveRelative(httpResponse.url, action.url);
    const requestTime = Date.now() - requestTimeStart;

    // Only parse if retrieval was successful
    if (httpResponse.status !== 200) {
      exists = false;
      // Consume the body, to avoid process to hang
      let bodyString = 'empty response';
      if (httpResponse.body) {
        const responseStream = ActorHttp.toNodeReadable(httpResponse.body);
        bodyString = await stringifyStream(responseStream);
      }
      if (!action.acceptErrors) {
        const error = new Error(`Could not retrieve ${action.url} (HTTP status ${httpResponse.status}):\n${bodyString}`);
        return this.handleDereferenceError(action, error, httpResponse.headers, requestTime);
      }
    }

    // Create Node quad response stream;
    let responseStream: NodeJS.ReadableStream;
    if (exists) {
      // Wrap WhatWG readable stream into a Node.js readable stream
      // If the body already is a Node.js stream (in the case of node-fetch), don't do explicit conversion.
      responseStream = ActorHttp.toNodeReadable(httpResponse.body);
    } else {
      responseStream = new Readable();
      (<Readable> responseStream).push(null);
    }

    // Parse the resulting response
    const match: RegExpExecArray = ActorRdfDereferenceHttpBase.REGEX_MEDIATYPE
      .exec(httpResponse.headers.get('content-type') ?? '')!;
    let mediaType: string | undefined = match[0];
    // If no media type could be found, try to determine it via the file extension
    if (!mediaType || mediaType === 'text/plain') {
      mediaType = action.mediaType || this.getMediaTypeFromExtension(httpResponse.url);
    }

    const parseAction: IActionRdfParse = {
      context: action.context,
      baseIRI: url,
      headers: httpResponse.headers,
      input: responseStream,
    };
    let parseOutput: IActorRdfParseOutput;
    try {
      parseOutput = (await this.mediatorRdfParseHandle.mediate(
        { context: action.context, handle: parseAction, handleMediaType: mediaType },
      )).handle;
    } catch (error: unknown) {
      // Close the body, to avoid process to hang
      await httpResponse.body!.cancel();
      return this.handleDereferenceError(action, error, httpResponse.headers, requestTime);
    }

    const quads = this.handleDereferenceStreamErrors(action, parseOutput.quads);

    // Return the parsed quad stream and whether or not only triples are supported
    return { url, quads, exists, requestTime, triples: parseOutput.triples, headers: httpResponse.headers };
  }

  public mediaTypesToAcceptString(mediaTypes: Record<string, number>, maxLength: number): string {
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

  protected abstract getMaxAcceptHeaderLength(): number;
}

export interface IActorRdfDereferenceHttpArgs extends
  IActorRdfDereferenceMediaMappingsArgs {
  /**
   * The HTTP mediator.
   */
  mediatorHttp: MediatorHttp;
  /**
   * The RDF Parse mediator for collecting media types.
   */
  mediatorRdfParseMediatypes: MediatorRdfParseMediaTypes;
  /**
   * The RDF Parse mediator for handling parsing.
   */
  mediatorRdfParseHandle: MediatorRdfParseHandle;
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
