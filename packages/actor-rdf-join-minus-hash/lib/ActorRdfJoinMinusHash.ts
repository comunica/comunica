import { ClosableTransformIterator } from '@comunica/bus-query-operation';
import type { IActionRdfJoin,
  IActorRdfJoinOutputInner,
  IActorRdfJoinArgs } from '@comunica/bus-rdf-join';
import {
  ActorRdfJoin,
} from '@comunica/bus-rdf-join';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type { MetadataBindings } from '@comunica/types';
import type * as RDF from '@rdfjs/types';

/**
 * A comunica Minus Hash RDF Join Actor.
 */
export class ActorRdfJoinMinusHash extends ActorRdfJoin {
  public constructor(args: IActorRdfJoinArgs) {
    super(args, {
      logicalType: 'minus',
      physicalName: 'hash',
      limitEntries: 2,
    });
  }

  public async getOutput(action: IActionRdfJoin): Promise<IActorRdfJoinOutputInner> {
    const buffer = action.entries[1].output;
    const output = action.entries[0].output;

    const metadatas = await ActorRdfJoin.getMetadatas(action.entries);
    const commonVariables: RDF.Variable[] = ActorRdfJoin.overlappingVariables(metadatas);
    if (commonVariables.length > 0) {
      /**
       * To assure we've filtered all B (`buffer`) values from A (`output`) we wait until we've fetched all values of B.
       * Then we save these triples in `index` and use it to filter our A-stream.
       */
      const index: Record<string, boolean> = {};
      const bindingsStream = new ClosableTransformIterator(async() => {
        await new Promise(resolve => {
          buffer.bindingsStream.on('data', data => {
            index[ActorRdfJoin.hash(data, commonVariables)] = true;
          });
          buffer.bindingsStream.on('end', resolve);
        });
        return output.bindingsStream.filter(data => !index[ActorRdfJoin.hash(data, commonVariables)]);
      }, {
        autoStart: false,
        onClose() {
          buffer.bindingsStream.destroy();
          output.bindingsStream.destroy();
        },
      });
      return {
        result: {
          type: 'bindings',
          bindingsStream,
          metadata: output.metadata,
        },
      };
    }
    return {
      result: output,
    };
  }

  protected async getJoinCoefficients(
    action: IActionRdfJoin,
    metadatas: MetadataBindings[],
  ): Promise<IMediatorTypeJoinCoefficients> {
    const requestInitialTimes = ActorRdfJoin.getRequestInitialTimes(metadatas);
    const requestItemTimes = ActorRdfJoin.getRequestItemTimes(metadatas);
    return {
      iterations: metadatas[0].cardinality.value + metadatas[1].cardinality.value,
      persistedItems: metadatas[0].cardinality.value,
      blockingItems: metadatas[0].cardinality.value,
      requestTime: requestInitialTimes[0] + metadatas[0].cardinality.value * requestItemTimes[0] +
        requestInitialTimes[1] + metadatas[1].cardinality.value * requestItemTimes[1],
    };
  }
}
