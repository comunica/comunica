import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import { Actor } from '@comunica/core';
import type * as RDF from '@rdfjs/types';

/**
 * A comunica actor for rdf-metadata events.
 *
 * Actor types:
 * * Input:  IActionRdfMetadata:      An RDF quad stream.
 * * Test:   <none>
 * * Output: IActorRdfMetadataOutput: An RDF quad data stream and RDF quad metadata stream.
 *
 * @see IActionDereferenceRdf
 * @see IActorDereferenceRdfOutput
 */
export abstract class ActorRdfMetadata extends Actor<IActionRdfMetadata, IActorTest, IActorRdfMetadataOutput> {
  /**
   * @param args - @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   */
  public constructor(args: IActorRdfMetadataArgs) {
    super(args);
  }
}

export interface IActionRdfMetadata extends IAction {
  /**
   * The page URL from which the quads were retrieved.
   */
  url: string;
  /**
   * A quad stream.
   */
  quads: RDF.Stream;
  /**
   * An optional field indicating if the given quad stream originates from a triple-based serialization,
   * in which everything is serialized in the default graph.
   * If falsy, the quad stream contain actual quads, otherwise they should be interpreted as triples.
   */
  triples?: boolean;
}

export interface IActorRdfMetadataOutput extends IActorOutput {
  /**
   * The resulting quad data stream.
   */
  data: RDF.Stream;
  /**
   * The resulting quad metadata stream.
   */
  metadata: RDF.Stream;
}

export type IActorRdfMetadataArgs = IActorArgs<IActionRdfMetadata, IActorTest, IActorRdfMetadataOutput>;

export type MediatorRdfMetadata = Mediate<IActionRdfMetadata, IActorRdfMetadataOutput>;
