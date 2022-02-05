import { ActorDereferenceRdf, IActionDereferenceRdf, IActorDereferenceRdfArgs, IActorDereferenceRdfOutput } from '@comunica/bus-dereference-rdf';
import { IActorArgs, IActorTest } from '@comunica/core';

/**
 * A comunica Parse Dereference RDF Actor.
 */
export class ActorDereferenceRdfParse extends ActorDereferenceRdf {
  public constructor(args: IActorDereferenceRdfArgs) {
    super(args);
  }
}
