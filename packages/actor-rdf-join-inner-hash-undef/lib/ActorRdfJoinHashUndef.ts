import { BindingsIndexUndef, type IBindingsIndex } from '@comunica/actor-rdf-join-optional-hash';
import { ClosableTransformIterator } from '@comunica/bus-query-operation';
import type { IActionRdfJoin, IActorRdfJoinOutputInner, IActorRdfJoinArgs } from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type { BindingsStream, MetadataBindings } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator, type AsyncIterator, MultiTransformIterator } from 'asynciterator';
import { termToString } from 'rdf-string';

/**
 * A comunica Hash RDF Join Actor.
 */
export class ActorRdfJoinHashUndef extends ActorRdfJoin {
  public constructor(args: IActorRdfJoinArgs) {
    super(args, {
      logicalType: 'inner',
      physicalName: 'hash-undef',
      limitEntries: 2,
      requiresVariableOverlap: true,
      canHandleUndefs: true,
    });
  }

  public async getOutput(action: IActionRdfJoin): Promise<IActorRdfJoinOutputInner> {
    let metadatas = await ActorRdfJoin.getMetadatas(action.entries);

    // Ensure the left build stream is the smallest
    // TODO: in the next major version, use ActorRdfJoin.sortJoinEntries, which requires mediatorJoinEntriesSort
    if (metadatas[1].cardinality.value < metadatas[0].cardinality.value) {
      metadatas = [ metadatas[1], metadatas[0] ]; // TODO: coverage
      action = { ...action, entries: [ action.entries[1], action.entries[0] ]};
    }

    const buffer = action.entries[0].output;
    const output = action.entries[1].output;
    const variables = ActorRdfJoin.overlappingVariables(metadatas);

    const bindingsStream: BindingsStream = new ClosableTransformIterator(async() => {
      // We index all bindings from the left-hand iterator first in a blocking manner.
      const index: IBindingsIndex<RDF.Bindings[]> = new BindingsIndexUndef(
        variables,
        (term: RDF.Term | undefined) => term && term.termType !== 'Variable' ? termToString(term) : '',
      );
      await new Promise((resolve) => {
        buffer.bindingsStream.on('data', (bindings) => {
          const iterator = index.getFirst(bindings) ?? index.put(bindings, []);
          iterator.push(bindings);
        });
        buffer.bindingsStream.on('end', resolve);
        buffer.bindingsStream.on('error', (error) => { // TODO: coverage
          bindingsStream.emit('error', error);
        });
      });

      // Start our left-hand iterator and try to join with the index
      return new MultiTransformIterator(
        output.bindingsStream,
        {
          multiTransform: (bindings: RDF.Bindings): AsyncIterator<RDF.Bindings> => new ArrayIterator<RDF.Bindings>(
            <RDF.Bindings[]>(index.get(bindings).flat())
              .map(indexBindings => ActorRdfJoin.joinBindings(bindings, indexBindings))
              .filter(b => b !== null),
            { autoStart: false },
          ),
          autoStart: false,
        },
      );
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
        metadata: async() => await this.constructResultMetadata(action.entries, metadatas, action.context),
      },
    };
  }

  protected async getJoinCoefficients(
    action: IActionRdfJoin,
    metadatas: MetadataBindings[],
  ): Promise<IMediatorTypeJoinCoefficients> {
    // Ensure the left build stream is the smallest
    if (metadatas[1].cardinality.value < metadatas[0].cardinality.value) {
      metadatas = [ metadatas[1], metadatas[0] ];
    }

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
