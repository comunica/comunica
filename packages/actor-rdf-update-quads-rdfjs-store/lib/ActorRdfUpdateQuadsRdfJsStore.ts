import type {
  IActionRdfUpdateQuads,
  IActorRdfUpdateQuadsArgs,
  IQuadDestination,
} from '@comunica/bus-rdf-update-quads';
import { ActorRdfUpdateQuadsDestination, getContextDestination } from '@comunica/bus-rdf-update-quads';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { failTest, passTestVoid } from '@comunica/core';
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

  public override async test(action: IActionRdfUpdateQuads): Promise<TestResult<IActorTest>> {
    const destination = getContextDestination(action.context);
    if (!destination || typeof destination === 'string' ||
      (!('remove' in destination) && 'value' in destination && !(<RDF.Store> destination.value)?.remove)) {
      return failTest(`${this.name} received an invalid rdfjsStore.`);
    }
    return passTestVoid();
  }

  protected async getDestination(context: IActionContext): Promise<IQuadDestination> {
    const destination: any = <any> getContextDestination(context);
    return new RdfJsQuadDestination(
      context.getSafe(KeysInitQuery.dataFactory),
      'remove' in destination ? destination : destination.value,
    );
  }
}
