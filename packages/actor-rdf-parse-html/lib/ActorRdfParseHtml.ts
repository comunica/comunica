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
// Gebaseerd op JSON LD parser
export class ActorRdfParseHtml extends ActorRdfParseFixedMediaTypes {

  private readonly mediatorRdfParse: Mediator<Actor<IActionRootRdfParse, IActorTestRootRdfParse,
    IActorOutputRootRdfParse>, IActionRootRdfParse, IActorTestRootRdfParse, IActorOutputRootRdfParse>;

  constructor(args: IActorRdfParseFixedMediaTypesArgs) {
    super(args);
    console.log("My HTML parser was instantiated!!");
  }

  public async runHandle(action: IActionRdfParse, mediaType: string, context: ActionContext):
      Promise<IActorRdfParseOutput> {

    console.log("HTML parser started running...\n\n\n\n\n");

    const jsonStream: Readable = new Readable({ objectMode: true });
    const htmlString: string = await require('stream-to-string')(action.input);

    // JSON-LD (extraction needs refining)
    const jsonString: string = await this.extractJsonFromHtml(htmlString);
    jsonStream.push(jsonString);
    jsonStream.push(null);

    const jsonParseAction: IActionRootRdfParse = {
      context,
      handle: { input: jsonStream },
      handleMediaType: 'application/ld+json',
    };

    console.log("\nParseAction:");
    console.log(jsonParseAction);
    console.log("\nMediator:");
    console.log(this.mediatorRdfParse);

    console.log("\n\n\n\n");

    const result: IActorRdfParseOutput = (await this.mediatorRdfParse.mediate(jsonParseAction)).handle;

    // TODO RDFa support
    // Delegate all HTML to RDFa parser
    // (the script tags can be removed during earlier parsing?)
    // (Support Sink interface for Parser still to do)

    return result;
  }

  /**
   * Extracts JSON-LD from in between <script>-tags of a HTML string.
   *
   * @param htmlString
   *
   * @returns string
   */
  private extractJsonFromHtml(htmlString: string) {
    const DOMParser = require('xmldom').DOMParser;
    const doc = new DOMParser().parseFromString(htmlString, 'text/html');

    let jsonString: string = '';

    const scripts = doc.getElementsByTagName('script');

    for (let i = 0; i < scripts.length; i++) {
      if (scripts[i].getAttribute("type") === 'application/ld+json') {
        jsonString += scripts[i].textContent;
      }
    }

    return jsonString;
  }

}
