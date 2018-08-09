import {ActorRdfParseFixedMediaTypes, IActionRdfParse,
  IActorRdfParseFixedMediaTypesArgs, IActorRdfParseOutput} from "@comunica/bus-rdf-parse";
import {ActionContext} from "@comunica/core";
import {blankNode, defaultGraph, literal, namedNode} from "@rdfjs/data-model";
import * as RDF from "rdf-js";
import {mapTerms} from "rdf-terms";
import {Readable} from "stream";

/**
 * A JSON-LD RDF Parse actor that listens on the 'rdf-parse' bus.
 *
 * It is able to parse JSON-LD-based RDF serializations and announce the presence of them by media type.
 */
export class ActorRdfParseJsonLd extends ActorRdfParseFixedMediaTypes {

  private readonly jsonLd: any;

  constructor(args: IActorRdfParseFixedMediaTypesArgs) {
    super(args);
    this.jsonLd = require('jsonld')();
  }

  public static mapTerm(term: any): RDF.Term {
    switch (term.termType) {
    case 'NamedNode':
      return namedNode(term.value);
    case 'BlankNode':
      return blankNode(term.value.substr(2)); // Remove the '_:' prefix.
    case 'Literal':
      return literal(term.value, term.language || term.datatype);
    /*case 'Variable':
      return variable(term.value);*/ // Variables can not occur in JSON-LD bodies
    case 'DefaultGraph':
      return defaultGraph();
    }
  }

  public async runHandle(action: IActionRdfParse, mediaType: string, context: ActionContext)
    : Promise<IActorRdfParseOutput> {
    const quads = new Readable({ objectMode: true });
    let initialized = false;
    quads._read = async () => {
      if (!initialized) {
        initialized = true;
        const jsonString = await require('stream-to-string')(action.input);
        const quadsArray = await this.jsonLd.toRDF(JSON.parse(jsonString), {});
        for (const quad of quadsArray) {
          quads.push(mapTerms(quad, ActorRdfParseJsonLd.mapTerm));
        }
        quads.push(null);
      }
    };
    return { quads };
  }

}
