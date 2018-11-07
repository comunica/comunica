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
        let count: number = 0;
        for (let i = 0; i < scripts.length; i++) {
          const index: number = supportedTypes.indexOf(scripts[i].getAttribute("type"));
          if (index > -1) {
            count++;
            const jsonStream: Readable = new Readable({objectMode: true});
            jsonStream.push(scripts[i].textContent);
            jsonStream.push(null);

            const returned = (await this.mediatorRdfParse.mediate(
              {context, handle: {input: jsonStream}, handleMediaType: supportedTypes[index]})).handle;

            await returned.quads.on('data', async (chunk) => {
              console.log("\n");
              console.log(chunk);
              console.log("\n");
              await myQuads.push(chunk);
            });

            // End the stream
            await returned.quads.on('end', async () => {
              if (count > 1) {
                count--;
              } else {
                await myQuads.push(null);
              }
            });
          }

          // JSON-LD scripts
          /*if (scripts[i].getAttribute("type") === "application/ld+json") {
            // Streamify the content of the JSON-LD script tags
            const jsonStream: Readable = new Readable({ objectMode: true });
            jsonStream.push(scripts[i].textContent);
            jsonStream.push(null);

            // Throw the JSON-LD stream on the rdf-parse-bus
            const returned = (await this.mediatorRdfParse.mediate(
              {context, handle: { input: jsonStream}, handleMediaType: 'application/ld+json'})).handle;

            // Push the returned quads to my general stream
            returned.quads.on('data', async (chunk) => {
              await myQuads.push(chunk);
            });

            // End the stream
            returned.quads.on('end', async () => {
              await myQuads.push(null);
            });
          }*/
        }
      }
    };
    return {quads: myQuads};
  }
}
