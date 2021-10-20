import type {
  IActionRdfJoin,
  IActorRdfJoinOutputInner,
  IMetadataChecked,
} from '@comunica/bus-rdf-join';
import {
  ActorRdfJoin,
} from '@comunica/bus-rdf-join';
import type { IActorArgs } from '@comunica/core';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type { IActorQueryOperationOutputBindings } from '@comunica/types';
import { TransformIterator } from 'asynciterator';

/**
 * A comunica Minus Hash RDF Join Actor.
 */
export class ActorRdfJoinMinusHash extends ActorRdfJoin {
  public constructor(
    args: IActorArgs<IActionRdfJoin, IMediatorTypeJoinCoefficients, IActorQueryOperationOutputBindings>,
  ) {
    super(args, 'minus', 'hash', 2, undefined, false);
  }

  public async getOutput(action: IActionRdfJoin): Promise<IActorRdfJoinOutputInner> {
    const buffer = action.entries[1].output;
    const output = action.entries[0].output;

    const commonVariables: string[] = ActorRdfJoin.overlappingVariables(action);
    if (commonVariables.length > 0) {
      /**
       * To assure we've filtered all B (`buffer`) values from A (`output`) we wait until we've fetched all values of B.
       * Then we save these triples in `index` and use it to filter our A-stream.
       */
      const index: Record<string, boolean> = {};
      const bindingsStream = new TransformIterator(async() => {
        await new Promise(resolve => {
          buffer.bindingsStream.on('data', data => {
            index[ActorRdfJoin.hash(data, commonVariables)] = true;
          });
          buffer.bindingsStream.on('end', resolve);
        });
        return output.bindingsStream.filter(data => !index[ActorRdfJoin.hash(data, commonVariables)]);
      }, { autoStart: false });
      return {
        result: {
          type: 'bindings',
          bindingsStream,
          variables: output.variables,
          metadata: output.metadata,
          canContainUndefs: false,
        },
      };
    }
    return {
      result: output,
    };
  }

  protected async getJoinCoefficients(
    action: IActionRdfJoin,
    metadatas: IMetadataChecked[],
  ): Promise<IMediatorTypeJoinCoefficients> {
    const requestInitialTimes = ActorRdfJoin.getRequestInitialTimes(metadatas);
    const requestItemTimes = ActorRdfJoin.getRequestItemTimes(metadatas);
    return {
      iterations: metadatas[0].cardinality + metadatas[1].cardinality,
      persistedItems: metadatas[0].cardinality,
      blockingItems: metadatas[0].cardinality,
      requestTime: requestInitialTimes[0] + metadatas[0].cardinality * requestItemTimes[0] +
        requestInitialTimes[1] + metadatas[1].cardinality * requestItemTimes[1],
    };
  }
}
