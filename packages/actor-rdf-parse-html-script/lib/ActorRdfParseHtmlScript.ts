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
  }

  public async runHandle(action: IActionRdfParse, mediaType: string, context: ActionContext):
    Promise<IActorRdfParseOutput> {

    const myQuads = new Readable({objectMode: true});

    let initialized = false;

    myQuads._read = async () => {
      if (!initialized) {
        initialized = true;

        // Stringify HTML input
        const htmlString: string = await require('stream-to-string')(action.input);

        // Extract script tags
        const DOMParser = require('xmldom').DOMParser;
        const doc = new DOMParser().parseFromString(htmlString, 'text/html');
        const scripts = doc.getElementsByTagName('script');

        const supportedTypes = [
          "application/ld+json",
          "application/n-quads",
          "application/n-triples",
          "application/trig",
          "text/n3",
          "text/turtle",
        ];

        // Loop script elements
        let count: number = 0;      // count quad streams
        for (let i = 0; i < scripts.length; i++) {
          // Check if supported type
          const index: number = supportedTypes.indexOf(scripts[i].getAttribute("type"));
          if (index > -1) {
            count++;

            // Streamify script content
            const stream: Readable = new Readable({objectMode: true});
            stream.push(scripts[i].textContent);
            stream.push(null);

            // Push stream on parse bus
            const returned = (await this.mediatorRdfParse.mediate(
              {context, handle: {input: stream}, handleMediaType: supportedTypes[index]})).handle;

            // Push parsed quads on main stream
            await returned.quads.on('data', async (chunk) => {
              await myQuads.push(chunk);
            });

            // End the main stream
            await returned.quads.on('end', async () => {
              if (count > 1) {
                count--;
              } else {
                await myQuads.push(null);
              }
            });
          }
        }
      }
    };
    return {quads: myQuads};
  }
}
