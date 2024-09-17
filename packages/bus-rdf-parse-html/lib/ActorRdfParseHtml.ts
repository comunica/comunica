import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import { Actor } from '@comunica/core';
import type * as RDF from '@rdfjs/types';

/**
 * A comunica actor for rdf-parse-html events.
 *
 * Actor types:
 * * Input:  IActionRdfParseHtml:      Callbacks for parsing results.
 * * Test:   <none>
 * * Output: IActorRdfParseHtmlOutput: An HTML event listeners.
 *
 * @see IActionRdfParseHtml
 * @see IActorRdfParseHtmlOutput
 */
export abstract class ActorRdfParseHtml<TS = undefined>
  extends Actor<IActionRdfParseHtml, IActorTest, IActorRdfParseHtmlOutput, TS> {
  /* eslint-disable max-len */
  /**
   * @param args -
   *   \ @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   *   \ @defaultNested {RDF HTML parsing failed: none of the configured parsers were able to parse RDF in HTML} busFailMessage
   */
  /* eslint-enable max-len */
  public constructor(args: IActorRdfParseHtmlArgs<TS>) {
    super(args);
  }
}

export interface IActionRdfParseHtml extends IAction {
  /**
   * The base IRI.
   */
  baseIRI: string;
  /**
   * The headers with which the RDF document should be parsed.
   */
  headers?: Headers;

  /**
   * This function can be called whenever a quad has been parsed.
   * @param {Quad} quad A parsed quad.
   */
  emit: (quad: RDF.Quad) => void;

  /**
   * This function can be called when an error occurs.
   * @param {Error} error An error.
   */
  error: (error: Error) => void;

  /**
   * This function must be called when parsing is complete.
   */
  end: () => void;
}

export interface IActorRdfParseHtmlOutput extends IActorOutput {
  /**
   * A listener for HTML parse events.
   */
  htmlParseListener: IHtmlParseListener;
}

/**
 * An HTML parsing listener.
 */
export interface IHtmlParseListener {
  /**
   * Called when a tag is opened.
   * @param {string} name The tag name.
   * @param {{[p: string]: string}} attributes A hash of attributes.
   */
  onTagOpen: (name: string, attributes: Record<string, string>) => void;

  /**
   * Called when a tag is closed.
   */
  onTagClose: () => void;

  /**
   * Called when text contents are parsed.
   * Note that this can be called multiple times per tag,
   * when for example the string is spread over multiple chunks.
   * @param {string} data A string.
   */
  onText: (data: string) => void;

  /**
   * Called when parsing has ended.
   */
  onEnd: () => void;
}

export type IActorRdfParseHtmlArgs<TS = undefined> =
  IActorArgs<IActionRdfParseHtml, IActorTest, IActorRdfParseHtmlOutput, TS>;

export type MediatorRdfParseHtml = Mediate<IActionRdfParseHtml, IActorRdfParseHtmlOutput>;
