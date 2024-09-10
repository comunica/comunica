import { ClosableTransformIterator } from '@comunica/bus-query-operation';
import type { IActionRdfJoin, IActorRdfJoinOutputInner, IActorRdfJoinArgs } from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import type { TestResult } from '@comunica/core';
import { passTest } from '@comunica/core';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type { Bindings, BindingsStream, MetadataBindings } from '@comunica/types';
import type { IBindingsIndex } from '@comunica/utils-bindings-index';
import { BindingsIndexUndef } from '@comunica/utils-bindings-index';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { ArrayIterator, MultiTransformIterator } from 'asynciterator';
import { HashJoin } from 'asyncjoin';
import { termToString } from 'rdf-string';

/**
 * A comunica Hash RDF Join Actor.
 */
export class ActorRdfJoinHash extends ActorRdfJoin {
  public constructor(args: IActorRdfJoinHashArgs) {
    super(args, {
      logicalType: 'inner',
      physicalName: `hash-${args.canHandleUndefs ? 'undef' : 'def'}`,
      limitEntries: 2,
      requiresVariableOverlap: true,
      canHandleUndefs: args.canHandleUndefs,
    });
  }

  public async getOutput(action: IActionRdfJoin): Promise<IActorRdfJoinOutputInner> {
    let metadatas = await ActorRdfJoin.getMetadatas(action.entries);

    // Ensure the left build stream is the smallest
    // TODO: in the next major version, use ActorRdfJoin.sortJoinEntries, which requires mediatorJoinEntriesSort
    if (metadatas[1].cardinality.value < metadatas[0].cardinality.value) {
      metadatas = [ metadatas[1], metadatas[0] ];
      action = { ...action, entries: [ action.entries[1], action.entries[0] ]};
    }

    let bindingsStream: BindingsStream;
    const variables = ActorRdfJoin.overlappingVariables(metadatas);
    if (this.canHandleUndefs) {
      /* Handle undefined values in bindings */

      const buffer = action.entries[0].output;
      const output = action.entries[1].output;
      bindingsStream = new ClosableTransformIterator(async() => {
        // We index all bindings from the left-hand iterator first in a blocking manner.
        const index: IBindingsIndex<RDF.Bindings[]> = new BindingsIndexUndef(
          variables,
          (term: RDF.Term | undefined) => term && term.termType !== 'Variable' ? termToString(term) : '',
          true,
        );
        await new Promise((resolve) => {
          buffer.bindingsStream.on('data', (bindings) => {
            const iterator = index.getFirst(bindings, false) ?? index.put(bindings, []);
            iterator.push(bindings);
          });
          buffer.bindingsStream.on('end', resolve);
          buffer.bindingsStream.on('error', (error) => {
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
    } else {
      /* Don't handle undefined values in bindings */
      bindingsStream = new HashJoin<Bindings, string, Bindings>(
        action.entries[0].output.bindingsStream,
        action.entries[1].output.bindingsStream,
        entry => ActorRdfJoin.hash(entry, variables),
        <any> ActorRdfJoin.joinBindings,
      );
    }
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
  ): Promise<TestResult<IMediatorTypeJoinCoefficients>> {
    // Ensure the left build stream is the smallest
    if (metadatas[1].cardinality.value < metadatas[0].cardinality.value) {
      metadatas = [ metadatas[1], metadatas[0] ];
    }

    const requestInitialTimes = ActorRdfJoin.getRequestInitialTimes(metadatas);
    const requestItemTimes = ActorRdfJoin.getRequestItemTimes(metadatas);
    let iterations = metadatas[0].cardinality.value + metadatas[1].cardinality.value;
    if (!this.canHandleUndefs) {
      // Our non-undef implementation is slightly more performant.
      iterations *= 0.8;
    }
    return passTest({
      iterations,
      persistedItems: metadatas[0].cardinality.value,
      blockingItems: metadatas[0].cardinality.value,
      requestTime: requestInitialTimes[0] + metadatas[0].cardinality.value * requestItemTimes[0] +
        requestInitialTimes[1] + metadatas[1].cardinality.value * requestItemTimes[1],
    });
  }
}

export interface IActorRdfJoinHashArgs extends IActorRdfJoinArgs {
  /**
   * If this actor can handle undefined values.
   * If false, performance will be slightly better.
   */
  canHandleUndefs: boolean;
}
