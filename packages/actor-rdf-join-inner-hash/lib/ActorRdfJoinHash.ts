import type { MediatorHashBindings } from '@comunica/bus-hash-bindings';
import { ClosableTransformIterator } from '@comunica/bus-query-operation';
import type {
  IActionRdfJoin,
  IActorRdfJoinOutputInner,
  IActorRdfJoinArgs,
  IActorRdfJoinTestSideData,
} from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import type { TestResult } from '@comunica/core';
import { passTestWithSideData } from '@comunica/core';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type { Bindings, BindingsStream } from '@comunica/types';
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
  public readonly mediatorHashBindings: MediatorHashBindings;

  public constructor(args: IActorRdfJoinHashArgs) {
    super(args, {
      logicalType: 'inner',
      physicalName: `hash-${args.canHandleUndefs ? 'undef' : 'def'}`,
      limitEntries: 2,
      requiresVariableOverlap: true,
      canHandleUndefs: args.canHandleUndefs,
    });
  }

  public async getOutput(
    action: IActionRdfJoin,
    sideData: IActorRdfJoinTestSideData,
  ): Promise<IActorRdfJoinOutputInner> {
    const metadatas = sideData.metadatas;
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
              // eslint-disable-next-line ts/no-unnecessary-type-assertion
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
      const { hashFunction } = await this.mediatorHashBindings.mediate({ context: action.context });
      const variablesRaw = variables.map(v => v.variable);
      bindingsStream = new HashJoin<Bindings, number, Bindings>(
        action.entries[0].output.bindingsStream,
        action.entries[1].output.bindingsStream,
        entry => hashFunction(entry, variablesRaw),
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
    sideData: IActorRdfJoinTestSideData,
  ): Promise<TestResult<IMediatorTypeJoinCoefficients, IActorRdfJoinTestSideData>> {
    // Ensure the left build stream is the smallest
    // TODO: in the next major version, use ActorRdfJoin.sortJoinEntries, which requires mediatorJoinEntriesSort
    if (sideData.metadatas[1].cardinality.value < sideData.metadatas[0].cardinality.value) {
      sideData.metadatas = [ sideData.metadatas[1], sideData.metadatas[0] ];
    }

    const { metadatas } = sideData;
    const requestInitialTimes = ActorRdfJoin.getRequestInitialTimes(metadatas);
    const requestItemTimes = ActorRdfJoin.getRequestItemTimes(metadatas);
    let iterations = metadatas[0].cardinality.value + metadatas[1].cardinality.value;
    if (!this.canHandleUndefs) {
      // Our non-undef implementation is slightly more performant.
      iterations *= 0.8;
    }
    return passTestWithSideData({
      iterations,
      persistedItems: metadatas[0].cardinality.value,
      blockingItems: metadatas[0].cardinality.value,
      requestTime: requestInitialTimes[0] + metadatas[0].cardinality.value * requestItemTimes[0] +
        requestInitialTimes[1] + metadatas[1].cardinality.value * requestItemTimes[1],
    }, sideData);
  }
}

export interface IActorRdfJoinHashArgs extends IActorRdfJoinArgs {
  /**
   * The mediator for hashing bindings.
   */
  mediatorHashBindings: MediatorHashBindings;
  /**
   * If this actor can handle undefined values.
   * If false, performance will be slightly better.
   */
  canHandleUndefs: boolean;
}
