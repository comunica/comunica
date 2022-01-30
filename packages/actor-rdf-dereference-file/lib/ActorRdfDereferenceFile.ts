import { AbstractDereferenceParse, IAbstractDereferenceParseArgs } from '@comunica/actor-abstract-dereference-parse';
import {
  IActorDereferenceOutput
} from '@comunica/bus-rdf-dereference';
import { IActionRdfParseMetadata, IActorRdfParseOutputMetadata } from '@comunica/bus-rdf-parse';
import type * as RDF from '@rdfjs/types';

/**
 * A comunica File RDF Dereference Actor.
 */
export class ActorRdfDereferenceFile extends AbstractDereferenceParse<RDF.Stream, IActionRdfParseMetadata, IActorRdfParseOutputMetadata> {
  public constructor(args: IActorRdfDereferenceFileArgs) {
    super(args);
  }

  async getMetadata(dereference: IActorDereferenceOutput): Promise<IActionRdfParseMetadata | undefined> {
    return { baseIRI: dereference.url }
  }
}

export interface IActorRdfDereferenceFileArgs extends IAbstractDereferenceParseArgs<RDF.Stream, IActionRdfParseMetadata, IActorRdfParseOutputMetadata> {
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
