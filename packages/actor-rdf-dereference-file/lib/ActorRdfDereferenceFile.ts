import { ActorRdfDereference, IActorRdfDereferenceArgs } from '@comunica/bus-rdf-dereference';

/**
 * A comunica File RDF Dereference Actor.
 */
export class ActorRdfDereferenceFile extends ActorRdfDereference {
  public constructor(args: IActorRdfDereferenceArgs) {
    super(args);
  }
}
