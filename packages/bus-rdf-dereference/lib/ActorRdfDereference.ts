import { AbstractDereferenceParse, IAbstractDereferenceParseArgs, IActionDereferenceParse, IActorDereferenceParseOutput } from '@comunica/actor-abstract-dereference-parse';
import { IActorDereferenceOutput } from '@comunica/bus-dereference';
import { IActionRdfParseMetadata, IActorRdfParseOutputMetadata } from '@comunica/bus-rdf-parse';
import type { Mediate } from '@comunica/core';
import type * as RDF from '@rdfjs/types';

/**
 * A base actor for dereferencing URLs to quad streams.
 *
 * Actor types:
 * * Input:  IActionRdfDereference:      A URL.
 * * Test:   <none>
 * * Output: IActorRdfDereferenceOutput: A quad stream.
 *
 * @see IActionRdfDereference
 * @see IActorRdfDereferenceOutput
 */
export class ActorRdfDereference extends AbstractDereferenceParse<RDF.Stream, IActionRdfParseMetadata, IActorRdfParseOutputMetadata> {
  /**
   * @param args - @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   */
  public constructor(args: IActorRdfDereferenceArgs) {
    super(args);
  }

  async getMetadata(dereference: IActorDereferenceOutput): Promise<IActionRdfParseMetadata | undefined> {
    return { baseIRI: dereference.url }
  }
}

export interface IActorRdfDereferenceArgs extends IAbstractDereferenceParseArgs<RDF.Stream, IActionRdfParseMetadata, IActorRdfParseOutputMetadata> {
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


export type IActionRdfDereference = IActionDereferenceParse<IActionRdfParseMetadata>;

export type IActorRdfDereferenceOutput = IActorDereferenceParseOutput<RDF.Stream, IActorRdfParseOutputMetadata>;

export type MediatorRdfDereference = Mediate<IActionRdfDereference, IActorRdfDereferenceOutput>;
