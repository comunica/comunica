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
import { BindingsIndex } from './BindingsIndex';

/**
 * A comunica Minus Hash RDF Join Actor.
 */
export class ActorRdfJoinMinusHashUndef extends ActorRdfJoin {
  public constructor(args: IActorRdfJoinArgs) {
    super(args, {
      logicalType: 'minus',
      physicalName: 'hash-undef',
      limitEntries: 2,
      canHandleUndefs: true,
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
      const index: BindingsIndex = new BindingsIndex(commonVariables);
      const bindingsStream = new ClosableTransformIterator(async() => {
        await new Promise(resolve => {
          buffer.bindingsStream.on('data', data => index.add(data));
          buffer.bindingsStream.on('end', resolve);
        });
        return output.bindingsStream.filter(data => !index.contains(data));
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
          async metadata() {
            const bufferMetadata = await output.metadata();
            const outputMetadata = await output.metadata();
            return {
              ...outputMetadata,
              canContainUndefs: bufferMetadata.canContainUndefs || outputMetadata.canContainUndefs,
            };
          },
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
      // Slightly increase iteration cost, as operations in our BindingsIndex do not happen in constant time
      // This enables the mediator to favor other minus actors,
      // while this one will only be selected when streams contain undefs.
      iterations: (metadatas[0].cardinality.value + metadatas[1].cardinality.value) * 1.01,
      persistedItems: metadatas[0].cardinality.value,
      blockingItems: metadatas[0].cardinality.value,
      requestTime: requestInitialTimes[0] + metadatas[0].cardinality.value * requestItemTimes[0] +
        requestInitialTimes[1] + metadatas[1].cardinality.value * requestItemTimes[1],
    };
  }
}
