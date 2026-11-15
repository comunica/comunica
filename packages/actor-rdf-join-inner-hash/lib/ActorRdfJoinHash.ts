import type { MediatorHashBindings } from '@comunica/bus-hash-bindings';
import type {
  IActionRdfJoin,
  IActorRdfJoinOutputInner,
  IActorRdfJoinArgs,
  IActorRdfJoinTestSideData,
  MediatorRdfJoin,
} from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import type { TestResult } from '@comunica/core';
import { passTestWithSideData } from '@comunica/core';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type { Bindings, BindingsStream, IJoinEntry, MetadataBindings } from '@comunica/types';
import type { IBindingsIndex } from '@comunica/utils-bindings-index';
import { BindingsIndexUndef } from '@comunica/utils-bindings-index';
import { ClosableTransformIterator } from '@comunica/utils-iterator';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { ArrayIterator, MultiTransformIterator } from 'asynciterator';
import { HashJoin } from 'asyncjoin';
import { termToString } from 'rdf-string';

/**
 * A comunica Hash RDF Join Actor.
 */
export class ActorRdfJoinHash extends ActorRdfJoin<IActorRdfJoinHashTestSideData> {
  public readonly mediatorHashBindings: MediatorHashBindings;
  public readonly mediatorJoin?: MediatorRdfJoin;

  public constructor(args: IActorRdfJoinHashArgs) {
    super(args, {
      logicalType: 'inner',
      physicalName: `hash-${args.canHandleUndefs ? 'undef' : 'def'}`,
      limitEntries: 2,
      requiresVariableOverlap: true,
      canHandleUndefs: args.canHandleUndefs,
    });
    this.mediatorHashBindings = args.mediatorHashBindings;
    this.mediatorJoin = args.mediatorJoin;
  }

  public async getOutput(
    action: IActionRdfJoin,
    sideData: IActorRdfJoinHashTestSideData,
  ): Promise<IActorRdfJoinOutputInner> {
    const metadatas = sideData.metadatas;
    const [ buildEntry, probeEntry ] = sideData.entriesSorted;
    const metadata = async(): Promise<MetadataBindings> =>
      await this.constructResultMetadata(sideData.entriesSorted, metadatas, action.context);

    // The build stream is read in full before the probe stream is read.
    // If it is smaller than estimated, the join is planned again with its actual size,
    // as another join may then be cheaper, such as a bind join for a small build stream.
    const mediatorJoin = this.mediatorJoin;
    if (mediatorJoin && metadatas[0].cardinality.type === 'estimate') {
      const bindingsStream = new ClosableTransformIterator(async() => {
        const bindings = await buildEntry.output.bindingsStream.toArray();
        const materializedEntry: IJoinEntry = {
          output: {
            type: 'bindings',
            bindingsStream: new ArrayIterator(bindings, { autoStart: false }),
            metadata: async() => ({ ...metadatas[0], cardinality: { type: 'exact', value: bindings.length }}),
          },
          operation: buildEntry.operation,
          operationModified: true,
        };
        if (bindings.length < metadatas[0].cardinality.value) {
          return (await mediatorJoin.mediate({
            type: action.type,
            entries: [ materializedEntry, probeEntry ],
            context: action.context,
          })).bindingsStream;
        }
        return this.join(action, metadatas, materializedEntry.output.bindingsStream, probeEntry.output.bindingsStream);
      }, {
        autoStart: false,
        onClose() {
          buildEntry.output.bindingsStream.destroy();
          probeEntry.output.bindingsStream.destroy();
        },
      });
      return { result: { type: 'bindings', bindingsStream, metadata }};
    }

    return {
      result: {
        type: 'bindings',
        bindingsStream: await this.join(
          action,
          metadatas,
          buildEntry.output.bindingsStream,
          probeEntry.output.bindingsStream,
        ),
        metadata,
      },
    };
  }

  /**
   * Join two streams by indexing the bindings of the build stream, and looking up the bindings of the probe stream.
   * @param action The join action.
   * @param metadatas The metadata of the build and the probe stream.
   * @param buildStream The build stream.
   * @param probeStream The probe stream.
   */
  public async join(
    action: IActionRdfJoin,
    metadatas: MetadataBindings[],
    buildStream: BindingsStream,
    probeStream: BindingsStream,
  ): Promise<BindingsStream> {
    const variables = ActorRdfJoin.overlappingVariables(metadatas);
    if (this.canHandleUndefs) {
      /* Handle undefined values in bindings */

      const bindingsStream: BindingsStream = new ClosableTransformIterator(async() => {
        // We index all bindings from the left-hand iterator first in a blocking manner.
        const index: IBindingsIndex<RDF.Bindings[]> = new BindingsIndexUndef(
          variables,
          (term: RDF.Term | undefined) => term && term.termType !== 'Variable' ? termToString(term) : '',
          true,
        );
        await new Promise((resolve) => {
          buildStream.on('data', (bindings) => {
            const iterator = index.getFirst(bindings, false) ?? index.put(bindings, []);
            iterator.push(bindings);
          });
          buildStream.on('end', resolve);
          buildStream.on('error', (error) => {
            bindingsStream.emit('error', error);
          });
        });

        // Start our left-hand iterator and try to join with the index
        return new MultiTransformIterator(
          probeStream,
          {
            multiTransform: (bindings: RDF.Bindings): AsyncIterator<RDF.Bindings> => new ArrayIterator<RDF.Bindings>(
              index.get(bindings).flat()
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
          buildStream.destroy();
          probeStream.destroy();
        },
      });
      return bindingsStream;
    }

    /* Don't handle undefined values in bindings */
    const { hashFunction } = await this.mediatorHashBindings.mediate({ context: action.context });
    const variablesRaw = variables.map(v => v.variable);
    return new HashJoin<Bindings, number, Bindings>(
      buildStream,
      probeStream,
      entry => hashFunction(entry, variablesRaw),
      <any> ActorRdfJoin.joinBindings,
    );
  }

  protected async getJoinCoefficients(
    action: IActionRdfJoin,
    sideData: IActorRdfJoinTestSideData,
  ): Promise<TestResult<IMediatorTypeJoinCoefficients, IActorRdfJoinHashTestSideData>> {
    // Ensure the left build stream is the smallest
    let entriesSorted = action.entries;
    if (sideData.metadatas[1].cardinality.value < sideData.metadatas[0].cardinality.value) {
      sideData.metadatas = [ sideData.metadatas[1], sideData.metadatas[0] ];
      entriesSorted = [ action.entries[1], action.entries[0] ];
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
    }, { ...sideData, entriesSorted });
  }
}

export interface IActorRdfJoinHashArgs extends IActorRdfJoinArgs<IActorRdfJoinHashTestSideData> {
  /**
   * The mediator for hashing bindings.
   */
  mediatorHashBindings: MediatorHashBindings;
  /**
   * If this actor can handle undefined values.
   * If false, performance will be slightly better.
   */
  canHandleUndefs: boolean;
  /**
   * An optional join mediator, to plan the join again if the build stream is smaller than estimated.
   */
  mediatorJoin?: MediatorRdfJoin;
}

export interface IActorRdfJoinHashTestSideData extends IActorRdfJoinTestSideData {
  entriesSorted: IJoinEntry[];
}
