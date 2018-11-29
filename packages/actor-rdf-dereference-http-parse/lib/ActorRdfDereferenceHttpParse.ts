import {IActionHttp, IActorHttpOutput} from "@comunica/bus-http";
import {ActorRdfDereferenceMediaMappings, IActionRdfDereference,
  IActorRdfDereferenceMediaMappingsArgs, IActorRdfDereferenceOutput} from "@comunica/bus-rdf-dereference";
import {IActionRdfParse, IActionRootRdfParse, IActorOutputRootRdfParse, IActorRdfParseOutput,
  IActorTestRootRdfParse} from "@comunica/bus-rdf-parse";
import {Actor, IActorTest, Mediator} from "@comunica/core";

/**
 * An actor that listens on the 'rdf-dereference' bus.
 *
 * It starts by grabbing all available RDF media types from the RDF parse bus.
 * After that, it resolves the URL using the HTTP bus using an accept header compiled from the available media types.
 * Finally, the response is parsed using the RDF parse bus.
 */
export class ActorRdfDereferenceHttpParse extends ActorRdfDereferenceMediaMappings
  implements IActorRdfDereferenceHttpParseArgs {

  public static readonly REGEX_MEDIATYPE: RegExp = /^[^ ;]*/;

  public readonly mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
    IActionHttp, IActorTest, IActorHttpOutput>;
  public readonly mediatorRdfParse: Mediator<Actor<IActionRootRdfParse, IActorTestRootRdfParse,
    IActorOutputRootRdfParse>, IActionRootRdfParse, IActorTestRootRdfParse, IActorOutputRootRdfParse>;

  constructor(args: IActorRdfDereferenceHttpParseArgs) {
    super(args);
  }

  public async test(action: IActionRdfDereference): Promise<IActorTest> {
    if (!action.url.startsWith("http:") && !action.url.startsWith("https:")) {
      throw new Error('This actor can only handle URLs that start with \'http\' or \'https\'.');
    }
    return true;
  }

  public async run(action: IActionRdfDereference): Promise<IActorRdfDereferenceOutput> {
    // Define accept header based on available media types.
    const mediaTypes: {[id: string]: number} = (await this.mediatorRdfParse.mediate(
      { context: action.context, mediaTypes: true }))
      .mediaTypes;
    const acceptHeader: string = this.mediaTypesToAcceptString(mediaTypes);

    // Resolve HTTP URL using appropriate accept header
    const headers: Headers = new Headers();
    headers.append('Accept', acceptHeader);
    const httpAction: IActionHttp = { context: action.context, input: action.url, init: { headers } };
    const httpResponse: IActorHttpOutput = await this.mediatorHttp.mediate(httpAction);

    // Wrap WhatWG readable stream into a Node.js readable stream
    // If the body already is a Node.js stream (in the case of node-fetch), don't do explicit conversion.
    const responseStream: NodeJS.ReadableStream = require('is-stream')(httpResponse.body)
      ? httpResponse.body : require('node-web-streams').toNodeReadable(httpResponse.body);

    // Only parse if retrieval was successful
    if (httpResponse.status !== 200) {
      throw new Error('Could not retrieve ' + action.url + ' (' + httpResponse.status + ')');
    }

    // Parse the resulting response
    let mediaType: string = httpResponse.headers.has('content-type')
      ? ActorRdfDereferenceHttpParse.REGEX_MEDIATYPE.exec(httpResponse.headers.get('content-type'))[0] : null;
    // If no media type could be found, try to determine it via the file extension
    if (!mediaType) {
      mediaType = this.getMediaTypeFromExtension(httpResponse.url);
    }

    const parseAction: IActionRdfParse = { input: responseStream, baseIRI: httpResponse.url };
    const parseOutput: IActorRdfParseOutput = (await this.mediatorRdfParse.mediate(
      { context: action.context, handle: parseAction, handleMediaType: mediaType })).handle;

    // Return the parsed quad stream and whether or not only triples are supported
    return { pageUrl: httpResponse.url, quads: parseOutput.quads, triples: parseOutput.triples };
  }

  public mediaTypesToAcceptString(mediaTypes: {[id: string]: number}): string {
    const parts: string[] = [];
    for (const mediaType in mediaTypes) {
      const priority: number = mediaTypes[mediaType];
      parts.push(mediaType + (priority !== 1 ? ';q=' + priority : ''));
    }
    if (!parts.length) {
      return '*/*';
    }
    return parts.join(', ');
  }

}

export interface IActorRdfDereferenceHttpParseArgs extends
  IActorRdfDereferenceMediaMappingsArgs {
  mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
    IActionHttp, IActorTest, IActorHttpOutput>;
  mediatorRdfParse: Mediator<Actor<IActionRootRdfParse, IActorTestRootRdfParse,
    IActorOutputRootRdfParse>, IActionRootRdfParse, IActorTestRootRdfParse, IActorOutputRootRdfParse>;
}
