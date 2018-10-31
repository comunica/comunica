import {
  ActorRdfParseFixedMediaTypes,
  IActionRdfParse,
  IActionRootRdfParse,
  IActorOutputRootRdfParse,
  IActorRdfParseFixedMediaTypesArgs,
  IActorRdfParseOutput,
  IActorTestRootRdfParse,
} from "@comunica/bus-rdf-parse";
import {ActionContext, Actor, Mediator} from "@comunica/core";
import {Readable} from "stream";

/**
 * A HTML RDF Parse actor that listens on the 'rdf-parse' bus.
 *
 * It is able to extract JSON-LD from HTML files and parse the JSON-LD based RDF serializations
 * and announce the presence of them by media type.
 */
export class ActorRdfParseHtmlScript extends ActorRdfParseFixedMediaTypes {

  public mediatorRdfParse: Mediator<Actor<IActionRootRdfParse, IActorTestRootRdfParse,
    IActorOutputRootRdfParse>, IActionRootRdfParse, IActorTestRootRdfParse, IActorOutputRootRdfParse>;

  constructor(args: IActorRdfParseFixedMediaTypesArgs) {
    super(args);
    console.log("\n\n\n");
    console.log(this);
    console.log("\n\n\n");
  }

  /**
   * TODO:
   * multiple script tags support
   *
   * All these go to N3 parser:
   * application/trig
   * application/n-quads
   * text/turtle
   * application/n-triples
   * text/n3
   */

  public async runHandle(action: IActionRdfParse, mediaType: string, context: ActionContext):
    Promise<IActorRdfParseOutput> {

    const htmlString: string = await require('stream-to-string')(action.input);

    // JSON-LD extraction
    let jsonString: string = '';
    const DOMParser = require('xmldom').DOMParser;
    const doc = new DOMParser().parseFromString(htmlString, 'text/html');
    const scripts = doc.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
      if (scripts[i].getAttribute("type") === "application/ld+json") {
        jsonString += scripts[i].textContent;
      }
    }

    // Streamify JSON-LD
    const jsonStream: Readable = new Readable({ objectMode: true });
    jsonStream.push(jsonString);
    jsonStream.push(null);

    const jsonParseAction: IActionRootRdfParse = {
      context,
      handle: { input: jsonStream },
      handleMediaType: 'application/ld+json',
    };

    const mediatorResult = (await this.mediatorRdfParse.mediate(jsonParseAction));
    return mediatorResult.handle;
  }
}
