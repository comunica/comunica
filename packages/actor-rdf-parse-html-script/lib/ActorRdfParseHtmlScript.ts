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
 * A HTML script RDF Parse actor that listens on the 'rdf-parse' bus.
 *
 * It is able to extract and parse any RDF serialization from HTML files
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

    const quads = new Readable({ objectMode: true } );

    let initialized = false;

    quads._read = async () => {
      if (!initialized) {
        initialized = true;

        // Stringify HTML input
        const htmlString: string = await require('stream-to-string')(action.input);

        // Extract script tags
        const DOMParser = require('xmldom').DOMParser;
        const doc = new DOMParser().parseFromString(htmlString, 'text/html');
        const scripts = doc.getElementsByTagName('script');

        const supportedTypes: string[] = Object.keys((await this.mediatorRdfParse
          .mediate({
            context: ActionContext({ '@comunica/bus-rdf-parse:source': { type: 'mediaTypes' } }),
            mediaTypes: true,
          })).mediaTypes);

        // Loop script elements
        let count: number = 0;      // count streams
        let amountOfWrongTypes: number = 0;
        for (let i = 0; i < scripts.length; i++) {
          // Check if supported type
          const index: number = supportedTypes.indexOf(scripts[i].getAttribute("type"));
          if (index > -1) {
            count++;

            // Streamify script content
            const stream: Readable = new Readable({ objectMode: true });
            stream.push(scripts[i].textContent);
            stream.push(null);

            // Push stream on parse bus
            const parseAction = {
              context,
              handle: { input: stream },
              handleMediaType: supportedTypes[index],
            };
            const returned = ( await this.mediatorRdfParse.mediate(parseAction)).handle;

            // Push parsed quads on main stream
            returned.quads.on( 'data', (chunk) => {
              quads.push(chunk);
            });

            // End the main stream
            returned.quads.on( 'end', () => {
              if (count > 1) {
                count--;
              } else {
                quads.push(null);
              }
            });
          } else {
            amountOfWrongTypes++;
          }
        }
        if (amountOfWrongTypes === scripts.length) {
          quads.push(null);
        }
      }
    };
    return { quads };
  }
}
