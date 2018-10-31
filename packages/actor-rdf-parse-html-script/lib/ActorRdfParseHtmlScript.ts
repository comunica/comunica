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
import {RoundRobinUnionIterator} from "asynciterator-union";
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

    const myQuads = new Readable({ objectMode: true });

    let initialized = false;

    myQuads._read = async () => {
      if (!initialized) {
        initialized = true;

        const htmlString: string = await require('stream-to-string')(action.input);

        const DOMParser = require('xmldom').DOMParser;
        const doc = new DOMParser().parseFromString(htmlString, 'text/html');
        const scripts = doc.getElementsByTagName('script');

        for (let i = 0; i < scripts.length; i++) {
          if (scripts[i].getAttribute("type") === "application/ld+json") {
            const jsonStream: Readable = new Readable({ objectMode: true });
            jsonStream.push(scripts[i].textContent);
            jsonStream.push(null);

            const jsonParseAction: IActionRootRdfParse = {
              context,
              handle: { input: jsonStream },
              handleMediaType: 'application/ld+json',
            };

            const returned = (await this.mediatorRdfParse.mediate(jsonParseAction)).handle;

            returned.quads.on('readable', async () => {
              let data;
              data = returned.quads.read();
              while (data) {
                await myQuads.push(data);
                data = returned.quads.read();
              }
            });
          }
        }
      }
    };
    // myQuads.on('data', console.log);
    return { quads: myQuads };

    /*const htmlString: string = await require('stream-to-string')(action.input);

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

    // mediatorResult.handle.quads is a Readable
    // the _read async method needs to be implemented.
    // So I read this quads thing, and push every quad? to my own Readable.
    console.log(mediatorResult);
    return mediatorResult.handle;*/
  }
}
