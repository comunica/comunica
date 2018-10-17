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
import {Parser as HtmlParser} from "htmlparser2";
import {Readable} from "stream";

/**
 * A HTML script RDF Parse actor that listens on the 'rdf-parse' bus.
 *
 * It is able to extract and parse any RDF serialization from script tags in HTML files
 * and announce the presence of them by media type.
 */
export class ActorRdfParseHtmlScript extends ActorRdfParseFixedMediaTypes {

  private readonly mediatorRdfParseMediatypes: Mediator<Actor<IActionRootRdfParse, IActorTestRootRdfParse,
    IActorOutputRootRdfParse>, IActionRootRdfParse, IActorTestRootRdfParse, IActorOutputRootRdfParse>;
  private readonly mediatorRdfParseHandle: Mediator<Actor<IActionRootRdfParse, IActorTestRootRdfParse,
    IActorOutputRootRdfParse>, IActionRootRdfParse, IActorTestRootRdfParse, IActorOutputRootRdfParse>;

  constructor(args: IActorRdfParseHtmlScriptArgs) {
    super(args);
  }

  public async runHandle(action: IActionRdfParse, mediaType: string, context: ActionContext):
    Promise<IActorRdfParseOutput> {
    const supportedTypes: {[id: string]: number} = (await this.mediatorRdfParseMediatypes
      .mediate({ context, mediaTypes: true })).mediaTypes;

    // Lazily initialize the stream (only once) when reading is started.
    const quads = new Readable({ objectMode: true });
    let initialized: boolean = false;
    quads._read = async () => {
      if (!initialized) {
        initialized = true;
        let handleMediaType: string = null;
        let textChunks: string[] = null;
        let endBarrier = 1;
        const end = () => {
          if (--endBarrier === 0) {
            quads.push(null);
          }
        };

        const parser = new HtmlParser({
          onclosetag: () => {
            if (handleMediaType) {
              // Create a temporary text stream for pushing all the text chunks
              const textStream = new Readable({ objectMode: true });
              textStream._read = () => { return; };
              const textChunksLocal = textChunks;

              // Send all collected text to parser
              const parseAction = { context, handle: { baseIRI: action.baseIRI, input: textStream }, handleMediaType };
              this.mediatorRdfParseHandle.mediate(parseAction).then(({ handle }) => {
                // Initialize text parsing
                handle.quads
                  .on('error', (error: Error) => quads.emit('error', error))
                  .on('data', (chunk: any) => quads.push(chunk))
                  .on('end', end);

                // Push the text stream after all events have been attached
                for (const textChunk of textChunksLocal) {
                  textStream.push(textChunk);
                }
                textStream.push(null);
              });

              // Reset the media type and text stream
              handleMediaType = null;
              textChunks = null;
            }
          },
          onend: end,
          onopentag: (tagname: string, attribs: any) => {
            // Only handle script tags with a parseable content type
            if (tagname === 'script' && supportedTypes[attribs.type]) {
              handleMediaType = attribs.type;
              textChunks = [];
              endBarrier++;
            } else {
              handleMediaType = null;
            }
          },
          ontext: (text: string) => {
            if (handleMediaType) {
              textChunks.push(text);
            }
          },
        }, { decodeEntities: true, recognizeSelfClosing: true });
        action.input.pipe(<any> parser);
      }
    };

    return { quads };
  }
}

export interface IActorRdfParseHtmlScriptArgs extends IActorRdfParseFixedMediaTypesArgs {
  mediatorRdfParseMediatypes: Mediator<Actor<IActionRootRdfParse, IActorTestRootRdfParse,
    IActorOutputRootRdfParse>, IActionRootRdfParse, IActorTestRootRdfParse, IActorOutputRootRdfParse>;
  mediatorRdfParseHandle: Mediator<Actor<IActionRootRdfParse, IActorTestRootRdfParse,
    IActorOutputRootRdfParse>, IActionRootRdfParse, IActorTestRootRdfParse, IActorOutputRootRdfParse>;
}
