import type { IActorDereferenceOutput } from '@comunica/bus-dereference';
import type { IActorDereferenceRdfArgs } from '@comunica/bus-dereference-rdf';
import { ActorDereferenceRdf } from '@comunica/bus-dereference-rdf';
import type { IActionRdfParseMetadata } from '@comunica/bus-rdf-parse';

/**
 * A comunica Parse Dereference RDF Actor.
 */
export class ActorDereferenceRdfParse extends ActorDereferenceRdf {
  public constructor(args: IActorDereferenceRdfArgs) {
    super(args);
  }

  public async getMetadata(dereference: IActorDereferenceOutput): Promise<IActionRdfParseMetadata> {
    return { baseIRI: dereference.url };
  }
}

export interface IActorDereferenceRdfParseArgs extends IActorDereferenceRdfArgs {
  /**
   * A collection of mappings, mapping file extensions to their corresponding media type.
   * @range {json}
   * @default {{
   * "ttl":      "text/turtle",
   * "turtle":   "text/turtle",
   * "nt":       "application/n-triples",
   * "ntriples": "application/n-triples",
   * "nq":       "application/n-quads",
   * "nquads":   "application/n-quads",
   * "rdf":      "application/rdf+xml",
   * "rdfxml":   "application/rdf+xml",
   * "owl":      "application/rdf+xml",
   * "n3":       "text/n3",
   * "trig":     "application/trig",
   * "jsonld":   "application/ld+json",
   * "json":     "application/json",
   * "html":     "text/html",
   * "htm":      "text/html",
   * "xhtml":    "application/xhtml+xml",
   * "xht":      "application/xhtml+xml",
   * "xml":      "application/xml",
   * "svg":      "image/svg+xml",
   * "svgz":     "image/svg+xml"
   * }}
   */
  mediaMappings: Record<string, string>;
}
