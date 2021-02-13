import type { IActionRdfDereference, IActorRdfDereferenceOutput } from '@comunica/bus-rdf-dereference';
import { ActorRdfDereference } from '@comunica/bus-rdf-dereference';
import type { IActorArgs, IActorTest } from '@comunica/core';

/**
 * A comunica Fallback RDF Dereference Actor.
 */
export class ActorRdfDereferenceFallback extends ActorRdfDereference {
  public constructor(args: IActorArgs<IActionRdfDereference, IActorTest, IActorRdfDereferenceOutput>) {
    super(args);
  }

  public async test(action: IActionRdfDereference): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionRdfDereference): Promise<IActorRdfDereferenceOutput> {
    return this.handleDereferenceError(action, new Error(`Could not dereference '${action.url}'`));
  }
}
