import {IActionRootRdfParse, IActorOutputRootRdfParse, IActorTestRootRdfParse} from "@comunica/bus-rdf-parse";
import {IHtmlParseListener} from "@comunica/bus-rdf-parse-html";
import {ActionContext, Actor, Mediator} from "@comunica/core";
import * as RDF from "rdf-js";
import {Readable} from "stream";

/**
 * An HTML parse listeners that detects <script> data blocks with known RDF media tyoes,
 * parses them, and outputs the resulting quads.
 */
export class HtmlScriptListener implements IHtmlParseListener {

  private readonly mediatorRdfParseHandle: Mediator<Actor<IActionRootRdfParse, IActorTestRootRdfParse,
    IActorOutputRootRdfParse>, IActionRootRdfParse, IActorTestRootRdfParse, IActorOutputRootRdfParse>;
  private readonly cbQuad: (quad: RDF.Quad) => void;
  private readonly cbError: (error: Error) => void;
  private readonly cbEnd: () => void;
  private readonly supportedTypes: {[id: string]: number};
  private readonly context: ActionContext;
  private readonly baseIRI: string;

  private handleMediaType: string = null;
  private textChunks: string[] = null;
  private endBarrier = 1;

  constructor(mediatorRdfParseHandle: Mediator<Actor<IActionRootRdfParse, IActorTestRootRdfParse,
                IActorOutputRootRdfParse>, IActionRootRdfParse, IActorTestRootRdfParse, IActorOutputRootRdfParse>,
              cbQuad: (quad: RDF.Quad) => void, cbError: (error: Error) => void, cbEnd: () => void,
              supportedTypes: {[id: string]: number}, context: ActionContext, baseIRI: string) {
    this.mediatorRdfParseHandle = mediatorRdfParseHandle;
    this.cbQuad = cbQuad;
    this.cbError = cbError;
    this.cbEnd = cbEnd;
    this.supportedTypes = supportedTypes;
    this.context = context;
    this.baseIRI = baseIRI;
  }

  public onEnd(): void {
    if (--this.endBarrier === 0) {
      this.cbEnd();
    }
  }

  public onTagClose(): void {
    if (this.handleMediaType) {
      // Create a temporary text stream for pushing all the text chunks
      const textStream = new Readable({ objectMode: true });
      textStream._read = () => { return; };
      const textChunksLocal = this.textChunks;

      // Send all collected text to parser
      const parseAction = {
        context: this.context,
        handle: { baseIRI: this.baseIRI, input: textStream },
        handleMediaType: this.handleMediaType,
      };
      this.mediatorRdfParseHandle.mediate(parseAction).then(({ handle }) => {
        // Initialize text parsing
        handle.quads
          .on('error', this.cbError)
          .on('data', this.cbQuad)
          .on('end', () => this.onEnd());

        // Push the text stream after all events have been attached
        for (const textChunk of textChunksLocal) {
          textStream.push(textChunk);
        }
        textStream.push(null);
      }).catch((e) => {
        // ignore
      });

      // Reset the media type and text stream
      this.handleMediaType = null;
      this.textChunks = null;
    }
  }

  public onTagOpen(name: string, attributes: { [p: string]: string }): void {
    // Only handle script tags with a parseable content type
    if (name === 'script' && this.supportedTypes[attributes.type]) {
      this.handleMediaType = attributes.type;
      this.textChunks = [];
      this.endBarrier++;
    } else {
      this.handleMediaType = null;
    }
  }

  public onText(data: string): void {
    if (this.handleMediaType) {
      this.textChunks.push(data);
    }
  }

}
