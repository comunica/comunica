import {IActionRootRdfParse, IActorOutputRootRdfParse, IActorTestRootRdfParse} from "@comunica/bus-rdf-parse";
import {IHtmlParseListener} from "@comunica/bus-rdf-parse-html";
import {ActionContext, Actor, Mediator} from "@comunica/core";
import * as RDF from "rdf-js";
import {Readable} from "stream";
import {resolve as resolveIri} from "relative-to-absolute-iri";

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
  private baseIRI: string;
  private readonly headers: Headers;
  private readonly onlyFirstScript: boolean;
  private readonly targetScriptId: string | null;

  private handleMediaType: string = null;
  private textChunks: string[] = null;
  private textChunksJsonLd: string[] = [];
  private endBarrier: number = 1;
  private passedScripts: number = 0;
  private isFinalJsonLdProcessing: boolean = false;

  constructor(mediatorRdfParseHandle: Mediator<Actor<IActionRootRdfParse, IActorTestRootRdfParse,
                IActorOutputRootRdfParse>, IActionRootRdfParse, IActorTestRootRdfParse, IActorOutputRootRdfParse>,
              cbQuad: (quad: RDF.Quad) => void, cbError: (error: Error) => void, cbEnd: () => void,
              supportedTypes: {[id: string]: number}, context: ActionContext, baseIRI: string, headers: Headers) {
    this.mediatorRdfParseHandle = mediatorRdfParseHandle;
    this.cbQuad = cbQuad;
    this.cbError = cbError;
    this.cbEnd = cbEnd;
    this.supportedTypes = supportedTypes;
    this.context = context;
    this.baseIRI = baseIRI;
    this.headers = headers;
    this.onlyFirstScript = context && context.get('extractAllScripts') === false;
    const fragmentPos = this.baseIRI.indexOf('#');
    this.targetScriptId = fragmentPos > 0 ? this.baseIRI.substr(fragmentPos + 1, this.baseIRI.length) : null;
  }

  public static newErrorCoded(message: string, code: string) {
    // Error codes are required by the JSON-LD spec
    const error = new Error(message);
    (<any> error).code = code;
    return error;
  }

  public onEnd(): void {
    if (--this.endBarrier === 0) {
      if (this.textChunksJsonLd.length > 0) {
        // First process buffered JSON-LD chunks if we have any.
        this.handleMediaType = 'application/ld+json';
        this.textChunks = this.textChunksJsonLd;
        this.textChunks.push(']');
        this.textChunksJsonLd = [];
        this.isFinalJsonLdProcessing = true;

        this.endBarrier++;
        this.onTagClose(); // This will call onEnd again
      } else {
        // Otherwise, end processing
        if (this.passedScripts === 0 && this.targetScriptId) {
          this.cbError(HtmlScriptListener.newErrorCoded(`Failed to find targeted script id "${this.targetScriptId}"`,
            'loading document failed'));
        }
        this.cbEnd();
      }
      this.isFinalJsonLdProcessing = false;
    }
  }

  public onTagClose(): void {
    if (this.handleMediaType) {
      if (this.requiresCustomJsonLdHandling(this.handleMediaType) && !this.isFinalJsonLdProcessing) {
        // Reset the media type and text stream
        this.handleMediaType = null;
        this.textChunks = null;

        this.onEnd();
      } else {
        // Create a temporary text stream for pushing all the text chunks
        const textStream = new Readable({ objectMode: true });
        textStream._read = () => { return; };
        const textChunksLocal = this.textChunks;

        // Send all collected text to parser
        const parseAction = {
          context: this.context,
          handle: { baseIRI: this.baseIRI, input: textStream, headers: this.headers },
          handleMediaType: this.handleMediaType,
        };
        this.mediatorRdfParseHandle.mediate(parseAction)
          .then(({handle}) => {
            // Initialize text parsing
            handle.quads
              .on('error', (error) => this.cbError(HtmlScriptListener.newErrorCoded(error.message, 'invalid script element')))
              .on('data', this.cbQuad)
              .on('end', () => this.onEnd());

            // Push the text stream after all events have been attached
            for (const textChunk of textChunksLocal) {
              textStream.push(textChunk);
            }
            textStream.push(null);
          })
          .catch(this.cbError);

        // Reset the media type and text stream
        this.handleMediaType = null;
        this.textChunks = null;
      }
    }
  }

  public onTagOpen(name: string, attributes: { [p: string]: string }): void {
    // Take into account baseIRI overrides
    if (name === 'base' && attributes.href) {
      this.baseIRI = resolveIri(attributes.href, this.baseIRI);
    }

    // Only handle script tags with a parseable content type
    // If targetScriptId is defined, only extract from script with that id
    if (name === 'script' && (!this.targetScriptId || attributes.id === this.targetScriptId)) {
      if (this.supportedTypes[attributes.type]) {
        if (this.onlyFirstScript && this.passedScripts > 0) {
          // Ignore script tag if only one should be extracted
          this.handleMediaType = null;
        } else {
          this.passedScripts++;
          this.handleMediaType = attributes.type;
          this.endBarrier++;
          if (this.requiresCustomJsonLdHandling(this.handleMediaType)) {
            this.textChunks = this.textChunksJsonLd;
            this.textChunks.push(this.textChunks.length === 0 ? '[' : ',');
          } else {
            this.textChunks = [];
          }
        }
      } else if (this.targetScriptId) {
        this.cbError(HtmlScriptListener.newErrorCoded(
          `Targeted script "${this.targetScriptId}" does not have a supported type`,
          'loading document failed'));
      }
    } else {
      this.handleMediaType = null;
    }
  }

  public onText(data: string): void {
    if (this.handleMediaType) {
      this.textChunks.push(data);
    }
  }

  /**
   * If we require custom JSON-LD handling for the given media type.
   *
   * The JSON-LD spec requires JSON-LD within script tags to be seen as a single document.
   * As such, we have to buffer all JSON-LD until the end of HTML processing,
   * and encapsulate all found contents in an array.
   *
   * @param mediaType A media type.
   */
  public requiresCustomJsonLdHandling(mediaType: string) {
    return !this.onlyFirstScript && !this.targetScriptId && mediaType === 'application/ld+json';
  }

}
