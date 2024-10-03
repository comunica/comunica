import {
  ActorRdfJoin,
} from '@comunica/bus-rdf-join';
import type {
  IActionRdfJoin,
  IActorRdfJoinArgs,
  IActorRdfJoinOutputInner,
  IActorRdfJoinTestSideData,
} from '@comunica/bus-rdf-join';
import type { TestResult } from '@comunica/core';
import { passTestWithSideData } from '@comunica/core';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type { BindingsStream, MetadataVariable } from '@comunica/types';
import { bindingsToCompactString } from '@comunica/utils-bindings-factory';
import type { IBindingsIndex } from '@comunica/utils-bindings-index';
import { BindingsIndexDef, BindingsIndexUndef } from '@comunica/utils-bindings-index';
import { ClosableTransformIterator } from '@comunica/utils-iterator';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { UnionIterator, ArrayIterator, MultiTransformIterator, BufferedIterator } from 'asynciterator';
import { termToString } from 'rdf-string';

/**
 * A comunica Optional Hash RDF Join Actor.
 */
export class ActorRdfJoinOptionalHash extends ActorRdfJoin {
  private readonly blocking: boolean;

  public constructor(args: IActorRdfJoinOptionalHashArgs) {
    super(args, {
      logicalType: 'optional',
      physicalName: `hash-${args.canHandleUndefs ? 'undef' : 'def'}-${args.blocking ? 'blocking' : 'nonblocking'}`,
      limitEntries: 2,
      canHandleUndefs: args.canHandleUndefs,
      requiresVariableOverlap: true,
    });
  }

  public static constructIndex<V>(undef: boolean, commonVariables: MetadataVariable[]): IBindingsIndex<V> {
    return undef ?
      new BindingsIndexUndef(
        commonVariables,
        (term: RDF.Term | undefined) => term && term.termType !== 'Variable' ? termToString(term) : '',
        true,
      ) :
      new BindingsIndexDef(commonVariables, bindingsToCompactString);
  }

  public async getOutput(action: IActionRdfJoin): Promise<IActorRdfJoinOutputInner> {
    const buffer = action.entries[1].output;
    const output = action.entries[0].output;

    const metadatas = await ActorRdfJoin.getMetadatas(action.entries);
    const commonVariables = ActorRdfJoin.overlappingVariables(metadatas);

    let bindingsStream: BindingsStream;
    if (this.blocking) {
      // -- Blocking optional ---

      bindingsStream = new ClosableTransformIterator(async() => {
        // We index all bindings from the right-hand OPTIONAL iterator first in a blocking manner.
        const index: IBindingsIndex<RDF.Bindings[]> = ActorRdfJoinOptionalHash
          .constructIndex(this.canHandleUndefs, commonVariables);
        await new Promise((resolve) => {
          buffer.bindingsStream.on('data', (bindings) => {
            const iterator = index.getFirst(bindings, true) ?? index.put(bindings, []);
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
            optional: true,
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
      // -- Non-blocking optional ---
      // This can be slightly slower than the blocking one above, due to the streaming overhead.

      bindingsStream = new ClosableTransformIterator(async() => {
        // We index all bindings from the right-hand OPTIONAL iterator.
        // They are indexed with iterator values, so our main stream can already get started.
        const index: IBindingsIndex<BufferedIterator<RDF.Bindings>> = ActorRdfJoinOptionalHash
          .constructIndex(this.canHandleUndefs, commonVariables);
        let indexActive = true;
        buffer.bindingsStream.on('data', (bindings) => {
          const iterator = index.getFirst(bindings, true) ??
            index.put(bindings, new BufferedIterator<RDF.Bindings>({ autoStart: false }));
          (<any> iterator)._push(bindings);
        });
        buffer.bindingsStream.on('end', () => {
          for (const iterator of index.values()) {
            iterator.close();
          }
          indexActive = false;
        });
        buffer.bindingsStream.on('error', (error) => {
          bindingsStream.emit('error', error);
        });

        // Start our left-hand iterator and try to join with the index
        return new MultiTransformIterator(
          output.bindingsStream,
          {
            multiTransform: (bindings: RDF.Bindings): AsyncIterator<RDF.Bindings> => {
              // Find iterators from the index
              let iterators: AsyncIterator<RDF.Bindings>[] = index.get(bindings);

              // If no index entry was found, set an empty iterator.
              // If we index has been closed already, don't modify the index, but just use an empty dummy iterator.
              if (iterators.length === 0) {
                if (indexActive) {
                  iterators = [ index.put(bindings, new BufferedIterator<RDF.Bindings>({ autoStart: false })) ];
                } else {
                  iterators = [];
                }
              }

              // Merge all iterators in a single one,
              // and clone each one to make sure we can still use them in the future.
              const iterator = new UnionIterator<RDF.Bindings>(iterators.map(it => it.clone()), { autoStart: false });
              return iterator.map(indexBindings => ActorRdfJoin.joinBindings(bindings, indexBindings));
            },
            optional: true,
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
    }

    return {
      result: {
        type: 'bindings',
        bindingsStream,
        metadata: async() => await this.constructResultMetadata(
          action.entries,
          metadatas,
          action.context,
          {},
          true,
        ),
      },
    };
  }

  protected async getJoinCoefficients(
    action: IActionRdfJoin,
    sideData: IActorRdfJoinTestSideData,
  ): Promise<TestResult<IMediatorTypeJoinCoefficients, IActorRdfJoinTestSideData>> {
    const { metadatas } = sideData;
    const requestInitialTimes = ActorRdfJoin.getRequestInitialTimes(metadatas);
    const requestItemTimes = ActorRdfJoin.getRequestItemTimes(metadatas);
    let iterations = metadatas[0].cardinality.value + metadatas[1].cardinality.value;
    if (!this.canHandleUndefs) {
      // Our non-undef implementation is slightly more performant.
      iterations *= 0.8;
    }
    if (this.blocking) {
      // Our blocking implementation is slightly more performant.
      iterations *= 0.9;
    }
    return passTestWithSideData({
      iterations,
      persistedItems: metadatas[0].cardinality.value,
      blockingItems: this.blocking ? metadatas[0].cardinality.value : 0,
      requestTime: requestInitialTimes[0] + metadatas[0].cardinality.value * requestItemTimes[0] +
        requestInitialTimes[1] + metadatas[1].cardinality.value * requestItemTimes[1],
    }, sideData);
  }
}

export interface IActorRdfJoinOptionalHashArgs extends IActorRdfJoinArgs {
  /**
   * If this actor can handle undefined values.
   * If false, performance will be slightly better.
   */
  canHandleUndefs: boolean;
  /**
   * If the join will block when collecting the optional stream.
   * If true, performance will be better.
   */
  blocking: boolean;
}
