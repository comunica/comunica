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

    const quads = new Readable({objectMode: true});

    quads._read = async () => {
      let count: number;
      let scripts: Element[];

      // Stringify HTML input
      const htmlString: string = await require('stream-to-string')(action.input);

      // Extract script tags
      const DOMParser = require('xmldom').DOMParser;
      const doc = new DOMParser().parseFromString(htmlString, 'text/html');
      scripts = await doc.getElementsByTagName('script');

      // Fetch the supported types
      const supportedTypes: string[] = Object.keys((await this.mediatorRdfParse
        .mediate({
          // context,
          context: ActionContext({ '@comunica/bus-rdf-parse:source': { type: 'mediaTypes' } }),
          mediaTypes: true,
        })).mediaTypes);
      supportedTypes.push("application/ld+json");   // Add json-ld while waiting for issue 138

      // Loop script elements
      count = 0;  // count handled script tags
      for (let i = 0; i < scripts.length; i++) {
        // Check if supported type
        const index: number = supportedTypes.indexOf(scripts[i].getAttribute("type"));
        if (index > -1) {

          // Streamify script content
          const stream: Readable = new Readable({objectMode: true});
          stream.push(scripts[i].textContent);
          stream.push(null);

          // Push stream on parse bus
          const parseAction = {
            context,
            handle: {input: stream},
            handleMediaType: supportedTypes[index],
          };
          const returned = (await this.mediatorRdfParse.mediate(parseAction)).handle;

          // Push parsed quads on main stream
          returned.quads.on('data', (chunk) => {
            quads.push(chunk);
          });

          // Wait for stream to end
          returned.quads.on('end', () => {
            count++;
            if (count === scripts.length) {
              quads.push(null);
              return { quads };
            }
          });
        } else {
          count++;    // increment if script tag has unsupported type
          if (count === scripts.length) {
            quads.push(null);
            return { quads };
          }
        }
      }

    };

    return { quads };
  }
}
