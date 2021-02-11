import type {
  IActionRdfUpdateQuads,
  IActorRdfUpdateQuadsOutput,
  IQuadDestination,
} from '@comunica/bus-rdf-update-quads';
import { ActorRdfUpdateQuadsDestination } from '@comunica/bus-rdf-update-quads';
import type { ActionContext, IActorArgs, IActorTest } from '@comunica/core';
import type * as RDF from 'rdf-js';
import { RdfJsQuadDestination } from './RdfJsQuadDestination';

/**
 * A comunica RDFJS Store RDF Update Quads Actor.
 */
export class ActorRdfUpdateQuadsRdfJsStore extends ActorRdfUpdateQuadsDestination {
  public constructor(args: IActorArgs<IActionRdfUpdateQuads, IActorTest, IActorRdfUpdateQuadsOutput>) {
    super(args);
  }

  public async test(action: IActionRdfUpdateQuads): Promise<IActorTest> {
    const destination = this.getContextDestination(action.context);
    if (!destination || typeof destination === 'string' ||
      (!('remove' in destination) && 'value' in destination && !(<RDF.Store> destination.value).remove)) {
      throw new Error(`${this.name} received an invalid rdfjsStore.`);
    }
    return true;
  }

  protected async getDestination(context: ActionContext): Promise<IQuadDestination> {
    const destination: any = <any> this.getContextDestination(context);
    return new RdfJsQuadDestination('remove' in destination ? destination : destination.value);
  }
}
