import { ActorHttp, IActionHttp, IActorHttpOutput } from '@comunica/bus-http';
import {
  ActorRdfDereferenceMediaMappings,
  IActionRdfDereference,
  IActorRdfDereferenceMediaMappingsArgs,
  IActorRdfDereferenceOutput,
} from '@comunica/bus-rdf-dereference';
import {
  IActionHandleRdfParse,
  IActionMediaTypesRdfParse,
  IActionRdfParse,
  IActorOutputHandleRdfParse,
  IActorOutputMediaTypesRdfParse,
  IActorRdfParseOutput,
  IActorTestHandleRdfParse,
  IActorTestMediaTypesRdfParse,
} from '@comunica/bus-rdf-parse';
import { Actor, IActorTest, Mediator } from '@comunica/core';
import { Headers } from 'cross-fetch';
import { resolve as resolveRelative } from 'relative-to-absolute-iri';

/**
 * An actor that listens on the 'rdf-dereference' bus.
 *
 * It starts by grabbing all available RDF media types from the RDF parse bus.
 * After that, it resolves the URL using the HTTP bus using an accept header compiled from the available media types.
 * Finally, the response is parsed using the RDF parse bus.
 */
export abstract class ActorRdfDereferenceHttpParseBase extends ActorRdfDereferenceMediaMappings
  implements IActorRdfDereferenceHttpParseArgs {
  public static readonly REGEX_MEDIATYPE: RegExp = /^[^ ;]*/u;

  public readonly mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
  IActionHttp, IActorTest, IActorHttpOutput>;

  public readonly mediatorRdfParseMediatypes: Mediator<
  Actor<IActionMediaTypesRdfParse, IActorTestMediaTypesRdfParse, IActorOutputMediaTypesRdfParse>,
  IActionMediaTypesRdfParse, IActorTestMediaTypesRdfParse, IActorOutputMediaTypesRdfParse>;

  public readonly mediatorRdfParseHandle: Mediator<
  Actor<IActionHandleRdfParse, IActorTestHandleRdfParse, IActorOutputHandleRdfParse>,
  IActionHandleRdfParse, IActorTestHandleRdfParse, IActorOutputHandleRdfParse>;

  public readonly maxAcceptHeaderLength: number;
  public readonly maxAcceptHeaderLengthBrowser: number;

  public constructor(args: IActorRdfDereferenceHttpParseArgs) {
    super(args);
  }

  public async test(action: IActionRdfDereference): Promise<IActorTest> {
    if (!/^https?:/u.test(action.url)) {
      throw new Error(`Cannot retrieve ${action.url} because it is not an HTTP(S) URL.`);
    }
    return true;
  }

  public async run(action: IActionRdfDereference): Promise<IActorRdfDereferenceOutput> {
    // Define accept header based on available media types.
    const { mediaTypes } = await this.mediatorRdfParseMediatypes.mediate(
      { context: action.context, mediaTypes: true },
    );
    const acceptHeader: string = this.mediaTypesToAcceptString(mediaTypes, this.getMaxAcceptHeaderLength());

    // Resolve HTTP URL using appropriate accept header
    const headers: Headers = new Headers({ Accept: acceptHeader });

    // Append any custom passed headers
    for (const key in action.headers) {
      headers.append(key, action.headers[key]);
    }

    const httpAction: IActionHttp = {
      context: action.context,
      init: { headers, method: action.method },
      input: action.url,
    };
    let httpResponse: IActorHttpOutput;
    try {
      httpResponse = await this.mediatorHttp.mediate(httpAction);
    } catch (error) {
      return this.handleDereferenceError(action, error);
    }
    // The response URL can be relative to the given URL
    const url = resolveRelative(httpResponse.url, action.url);

    // Convert output headers to a hash
    const outputHeaders: {[key: string]: string} = {};
    // eslint-disable-next-line no-return-assign
    httpResponse.headers.forEach((value, key) => outputHeaders[key] = value);

    // Wrap WhatWG readable stream into a Node.js readable stream
    // If the body already is a Node.js stream (in the case of node-fetch), don't do explicit conversion.
    const responseStream: NodeJS.ReadableStream = ActorHttp.toNodeReadable(httpResponse.body);

    // Only parse if retrieval was successful
    if (httpResponse.status !== 200) {
      const error = new Error(`Could not retrieve ${action.url} (${httpResponse.status}: ${
        httpResponse.statusText || 'unknown error'})`);
      return this.handleDereferenceError(action, error);
    }

    // Parse the resulting response
    const match: RegExpExecArray = <RegExpExecArray> ActorRdfDereferenceHttpParseBase.REGEX_MEDIATYPE
      .exec(httpResponse.headers.get('content-type') ?? '');
    let mediaType: string | undefined = match[0];
    // If no media type could be found, try to determine it via the file extension
    if (!mediaType || mediaType === 'text/plain') {
      mediaType = this.getMediaTypeFromExtension(httpResponse.url);
    }

    const parseAction: IActionRdfParse = {
      baseIRI: url,
      headers: httpResponse.headers,
      input: responseStream,
    };
    let parseOutput: IActorRdfParseOutput;
    try {
      parseOutput = (await this.mediatorRdfParseHandle.mediate(
        { context: action.context, handle: parseAction, handleMediaType: mediaType },
      )).handle;
    } catch (error) {
      return this.handleDereferenceError(action, error);
    }

    const quads = this.handleDereferenceStreamErrors(action, parseOutput.quads);

    // Return the parsed quad stream and whether or not only triples are supported
    return { url, quads, triples: parseOutput.triples, headers: outputHeaders };
  }

  public mediaTypesToAcceptString(mediaTypes: { [id: string]: number }, maxLength: number): string {
    // Ensure a ',*/*;q=0.1' suffix
    maxLength -= 10;

    const parts: string[] = [];
    const sortedMediaTypes = Object.keys(mediaTypes)
      .map(mediaType => ({ mediaType, priority: mediaTypes[mediaType] }))
      .sort((left, right) => right.priority - left.priority);
    let partsLength = 0;
    for (const entry of sortedMediaTypes) {
      const part = entry.mediaType + (entry.priority !== 1 ?
        `;q=${entry.priority.toFixed(3).replace(/0*$/u, '')}` :
        '');
      if (partsLength + part.length > maxLength) {
        parts.push('*/*;q=0.1');
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

export interface IActorRdfDereferenceHttpParseArgs extends
  IActorRdfDereferenceMediaMappingsArgs {
  mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
  IActionHttp, IActorTest, IActorHttpOutput>;
  mediatorRdfParseMediatypes: Mediator<
  Actor<IActionMediaTypesRdfParse, IActorTestMediaTypesRdfParse, IActorOutputMediaTypesRdfParse>,
  IActionMediaTypesRdfParse, IActorTestMediaTypesRdfParse, IActorOutputMediaTypesRdfParse>;
  mediatorRdfParseHandle: Mediator<
  Actor<IActionHandleRdfParse, IActorTestHandleRdfParse, IActorOutputHandleRdfParse>,
  IActionHandleRdfParse, IActorTestHandleRdfParse, IActorOutputHandleRdfParse>;
  maxAcceptHeaderLength: number;
  maxAcceptHeaderLengthBrowser: number;
}
