import {IActionHttp, IActorHttpOutput} from "@comunica/bus-http";
import {ActorRdfDereference, IActionRdfDereference, IActorRdfDereferenceOutput} from "@comunica/bus-rdf-dereference";
import {IActionRdfParse, IActionRdfParseOrMediaType, IActorOutputRdfParseOrMediaType} from "@comunica/bus-rdf-parse";
import {Actor, IActorTest, Mediator} from "@comunica/core";
import {IActorArgs} from "@comunica/core/lib/Actor";

/**
 * An actor that listens to on the 'rdf-dereference' bus.
 *
 * It starts by grabbing all available RDF media types from the RDF parse bus.
 * After that, it resolves the URL using the HTTP bus using an accept header compiled from the available media types.
 * Finally, the response is parsed using the RDF parse bus.
 */
export class ActorRdfDereferenceHttpParse extends ActorRdfDereference implements IActorRdfDereferenceHttpParseArgs {

  public static readonly REGEX_MEDIATYPE: RegExp = /^[^ ;]*/;

  public readonly mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
    IActionHttp, IActorTest, IActorHttpOutput>;
  public readonly mediatorRdfParse: Mediator<Actor<IActionRdfParseOrMediaType, IActorTest,
    IActorOutputRdfParseOrMediaType>, IActionRdfParseOrMediaType, IActorTest, IActorOutputRdfParseOrMediaType>;

  constructor(args: IActorRdfDereferenceHttpParseArgs) {
    super(args);
    if (!this.mediatorHttp) {
      throw new Error('A valid "mediatorHttp" argument must be provided.');
    }
    if (!this.mediatorRdfParse) {
      throw new Error('A valid "mediatorRdfParse" argument must be provided.');
    }
  }

  public async test(action: IActionRdfDereference): Promise<IActorTest> {
    if (!action.url.startsWith("http:") && !action.url.startsWith("https:")) {
      throw new Error('This actor can only handle URLs that start with \'http\' or \'https\'.');
    }
    return true;
  }

  public async run(action: IActionRdfDereference): Promise<IActorRdfDereferenceOutput> {
    // Define accept header based on available media types.
    const mediaTypes: {[id: string]: number} = (await this.mediatorRdfParse.mediate({ mediaType: true }))
      .mediaType.mediaTypes;
    const acceptHeader: string = this.mediaTypesToAcceptString(mediaTypes);

    // Resolve HTTP URL using appropriate accept header
    const httpAction: IActionHttp = { headers: { accept: acceptHeader }, url: action.url };
    const httpResponse: IActorHttpOutput = await this.mediatorHttp.mediate(httpAction);

    // Parse the resulting response
    const mediaType: string = ActorRdfDereferenceHttpParse.REGEX_MEDIATYPE
      .exec(httpResponse.headers.get('content-type'))[0];
    const parseAction: IActionRdfParse = { input: httpResponse.body, mediaType };
    const quads = (await this.mediatorRdfParse.mediate({ parse: parseAction })).parse.quads;

    // Return the parsed quad stream
    return { quads };
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
  IActorArgs<IActionRdfDereference, IActorTest, IActorRdfDereferenceOutput> {
  mediatorHttp: Mediator<Actor<IActionHttp, IActorTest, IActorHttpOutput>,
    IActionHttp, IActorTest, IActorHttpOutput>;
  mediatorRdfParse: Mediator<Actor<IActionRdfParseOrMediaType, IActorTest,
    IActorOutputRdfParseOrMediaType>, IActionRdfParseOrMediaType, IActorTest, IActorOutputRdfParseOrMediaType>;
}
