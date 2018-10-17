import {
  ActorRdfParse,
  ActorRdfParseFixedMediaTypes,
  IActionRdfParse,
  IActionRootRdfParse,
  IActorOutputRootRdfParse,
  IActorRdfParseFixedMediaTypesArgs,
  IActorRdfParseOutput,
  IActorTestRootRdfParse,
} from "@comunica/bus-rdf-parse";
import {ActionContext, Actor, IActorTest, Mediator} from "@comunica/core";
import {Readable} from "stream";
import {IActorArgsMediaTypedFixed} from "@comunica/actor-abstract-mediatyped";

/**
 * A HTML RDF Parse actor that listens on the 'rdf-parse' bus.
 *
 * It is able to extract JSON-LD from HTML files and parse the JSON-LD based RDF serializations
 * and announce the presence of them by media type.
 */
export class ActorRdfParseHtml extends ActorRdfParseFixedMediaTypes {

  private readonly mediatorRdfParse: Mediator<Actor<IActionRootRdfParse, IActorTestRootRdfParse,
    IActorOutputRootRdfParse>, IActionRootRdfParse, IActorTestRootRdfParse, IActorOutputRootRdfParse>;

  constructor(args: IActorRdfParseFixedMediaTypesArgs) {
    super(args);
    console.log("argumenten: ");
    console.log(args);
  }

  public async runHandle(action: IActionRdfParse, mediaType: string, context: ActionContext):
      Promise<IActorRdfParseOutput> {

    const jsonStream: Readable = new Readable({ objectMode: true });
    jsonStream._read = async () => {
      const htmlString: string = await require('stream-to-string')(action.input);
      const jsonString: string = await this.extractJsonFromHtml(htmlString);
      jsonStream.push(jsonString);
      jsonStream.push(null);
    };

    const parseAction: IActionRootRdfParse = {
      context: action.context,
      handle: { input: jsonStream },
      handleMediaType: 'application/ld+json',
    };

    console.log("parseaction: ");
    console.log(parseAction);

    console.log("mediator: ");
    console.log(this.mediatorRdfParse);

    const result: IActorRdfParseOutput = (await this.mediatorRdfParse.mediate(parseAction)).handle;

    // TODO RDFa support

    return result;
  }

  /**
   * Extracts JSON-LD from in between <script>-tags of a HTML string.
   *
   * @param htmlString
   *
   * @returns string
   */
  private extractJsonFromHtml(htmlString: any) {
    const doc = new DOMParser().parseFromString(htmlString, 'text/html');
    const scriptElementsWithJsonLd = doc.querySelectorAll('script[type=\"application/ld+json\"]');

    let jsonString: string = '';
    [].map.call(scriptElementsWithJsonLd, (el: any) => {
      jsonString += el.innerText;
    });

    return jsonString;
  }

}

export interface IActorRdfParseFixedMediaTypesArgs extends
  IActorArgsMediaTypedFixed<IActionRdfParse, IActorTest, IActorRdfParseOutput> {
  /**
   * Mediator used for parsing the file contents.
   */
  mediatorRdfParse: Mediator<ActorRdfParse, IActionRootRdfParse, IActorTestRootRdfParse, IActorOutputRootRdfParse>;
}
