import {Actor, IAction, IActorArgs, IActorOutput, IActorTest} from "@comunica/core";
import * as RDF from "rdf-js";

/**
 * A comunica actor for rdf-metadata events.
 *
 * Actor types:
 * * Input:  IActionRdfMetadata:      An RDF quad stream.
 * * Test:   <none>
 * * Output: IActorRdfMetadataOutput: An RDF quad data stream and RDF quad metadata stream.
 *
 * @see IActionRdfDereference
 * @see IActorRdfDereferenceOutput
 */
export abstract class ActorRdfMetadata extends Actor<IActionRdfMetadata, IActorTest, IActorRdfMetadataOutput> {

  constructor(args: IActorArgs<IActionRdfMetadata, IActorTest, IActorRdfMetadataOutput>) {
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
