import type { IActionRdfJoin, IActorRdfJoinOutputInner } from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import type { IActorArgs } from '@comunica/core';
import type { IMediatorTypeIterations } from '@comunica/mediatortype-iterations';
import type { IActorQueryOperationOutput } from '@comunica/types';
import { ArrayIterator } from 'asynciterator';

/**
 * A comunica Multi Empty RDF Join Actor.
 */
export class ActorRdfJoinMultiEmpty extends ActorRdfJoin {
  public constructor(args: IActorArgs<IActionRdfJoin, IMediatorTypeIterations, IActorQueryOperationOutput>) {
    super(args, 'multi-empty');
  }

  public async test(action: IActionRdfJoin): Promise<IMediatorTypeIterations> {
    if ((await ActorRdfJoin.getMetadatas(action.entries))
      .every(metadata => ActorRdfJoin.getCardinality(metadata) > 0)) {
      throw new Error(`Actor ${this.name} can only join entries where at least one is empty`);
    }
    return super.test(action);
  }

  protected async getOutput(action: IActionRdfJoin): Promise<IActorRdfJoinOutputInner> {
    return {
      result: {
        bindingsStream: new ArrayIterator([], { autoStart: false }),
        metadata: () => Promise.resolve({ cardinality: 0 }),
        type: 'bindings',
        variables: ActorRdfJoin.joinVariables(action),
        canContainUndefs: false,
      },
      physicalPlanMetadata: {
        cardinalities: (await ActorRdfJoin.getMetadatas(action.entries)).map(ActorRdfJoin.getCardinality),
      },
    };
  }

  protected async getIterations(action: IActionRdfJoin): Promise<number> {
    return 0;
  }
}
