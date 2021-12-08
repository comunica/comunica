import type {
  IActionRdfUpdateQuads, IActorRdfUpdateQuadsArgs,
  IQuadDestination,
} from '@comunica/bus-rdf-update-quads';
import { ActorRdfUpdateQuadsDestination, getContextDestination } from '@comunica/bus-rdf-update-quads';
import type { IActorTest } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { RdfJsQuadDestination } from './RdfJsQuadDestination';

/**
 * A comunica RDFJS Store RDF Update Quads Actor.
 */
export class ActorRdfUpdateQuadsRdfJsStore extends ActorRdfUpdateQuadsDestination {
  public constructor(args: IActorRdfUpdateQuadsArgs) {
    super(args);
  }

  public async test(action: IActionRdfUpdateQuads): Promise<IActorTest> {
    const destination = getContextDestination(action.context);
    if (!destination || typeof destination === 'string' ||
      (!('remove' in destination) && 'value' in destination && !(<RDF.Store> destination.value).remove)) {
      throw new Error(`${this.name} received an invalid rdfjsStore.`);
    }
    return true;
  }

  protected async getDestination(context: IActionContext): Promise<IQuadDestination> {
    const destination: any = <any> getContextDestination(context);
    return new RdfJsQuadDestination('remove' in destination ? destination : destination.value);
  }
}
