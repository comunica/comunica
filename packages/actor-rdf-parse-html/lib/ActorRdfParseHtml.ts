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
import {IActionRdfResolveQuadPattern} from "@comunica/bus-rdf-resolve-quad-pattern";

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
    console.log("\n\n[RdfParseHTML] My HTML parser was instantiated!!\n\n");
  }

  // copied from ActorRdfResolveQuadPatternQpf
  /*public async test(action: IActionRdfResolveQuadPattern): Promise<IActorTest> {
    if (!this.hasContextSingleSource('hypermedia-html', action.context)) {
      throw new Error(this.name
        + ' requires a single source with a QPF \'hypermedia\' entrypoint to be present in the context.');
    }
    return true;
  }*/


  public async testHandleChecked(action: IActionRdfParse): Promise<boolean> {
    console.log(action);
    return true;
  }


  public async runHandle(action: IActionRdfParse, mediaType: string, context: ActionContext):
      Promise<IActorRdfParseOutput> {

    console.log("[RdfParseHTML] HTML parser started running...\n\n");

    const jsonStream: Readable = new Readable({ objectMode: true });
    const htmlString: string = await require('stream-to-string')(action.input);

    // JSON-LD (extraction needs refining)
    const jsonString: string = await this.extractJsonFromHtml(htmlString);

    // console.log("\n" + jsonString + "\n");

    jsonStream.push(jsonString);
    jsonStream.push(null);

    const jsonParseAction: IActionRootRdfParse = {
      context,
      handle: { input: jsonStream },
      handleMediaType: 'application/ld+json',
    };

    /*console.log("\n[RdfParseHTML] ParseAction:");
    console.log(jsonParseAction);
    console.log("\n[RdfParseHTML] Mediator:");
    console.log(this.mediatorRdfParse);*/

    const result: IActorRdfParseOutput = (await this.mediatorRdfParse.mediate(jsonParseAction)).handle;

    console.log("\n[RdfParseHTML] Result:");
    console.log(result);
    console.log("\n\n");

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
