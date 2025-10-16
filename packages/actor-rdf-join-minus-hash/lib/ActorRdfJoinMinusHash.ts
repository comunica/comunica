import type {
  IActionRdfJoin,
  IActorRdfJoinOutputInner,
  IActorRdfJoinArgs,
  IActorRdfJoinTestSideData,
} from '@comunica/bus-rdf-join';
import {
  ActorRdfJoin,
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
import { termToString } from 'rdf-string';

/**
 * A comunica Minus Hash RDF Join Actor.
 */
export class ActorRdfJoinMinusHash extends ActorRdfJoin {
  public constructor(args: IActorRdfJoinMinusHashArgs) {
    super(args, {
      logicalType: 'minus',
      physicalName: `hash-${args.canHandleUndefs ? 'undef' : 'def'}`,
      limitEntries: 2,
      canHandleUndefs: args.canHandleUndefs,
    });
  }

  public static constructIndex<V>(undef: boolean, commonVariables: MetadataVariable[]): IBindingsIndex<V> {
    return undef ?
      new BindingsIndexUndef(
        commonVariables,
        (term: RDF.Term | undefined) => term && term.termType !== 'Variable' ? termToString(term) : '',
        false,
      ) :
      new BindingsIndexDef(commonVariables, bindingsToCompactString);
  }

  public async getOutput(action: IActionRdfJoin): Promise<IActorRdfJoinOutputInner> {
    const buffer = action.entries[1].output;
    const output = action.entries[0].output;

    const metadatas = await ActorRdfJoin.getMetadatas(action.entries);
    let commonVariables = ActorRdfJoin.overlappingVariables(metadatas);

    // If MINUS is within the scope of GRAPH ?g, do not consider ?g when checking variable disjointness.
    if (action.graphVariableFromParentScope) {
      commonVariables = commonVariables
        .filter(metadataVar => !metadataVar.variable.equals(action.graphVariableFromParentScope));
    }

    // Destroy the buffer stream since it is not needed when
    // there are no common variables.
    if (commonVariables.length === 0) {
      buffer.bindingsStream.destroy();
      return { result: output };
    }

    const bindingsStream: BindingsStream = new ClosableTransformIterator(async() => {
      // We index all bindings from the buffer iterator first in a blocking manner.
      const index: IBindingsIndex<boolean> = ActorRdfJoinMinusHash
        .constructIndex(this.canHandleUndefs, commonVariables);
      await new Promise((resolve) => {
        buffer.bindingsStream.on('data', bindings => index.put(bindings, true));
        buffer.bindingsStream.on('end', resolve);
        buffer.bindingsStream.on('error', error => bindingsStream.emit('error', error));
      });

      // From the left-hand iterator filter out all entries of the index
      return output.bindingsStream.filter(bindings => !index.getFirst(bindings, true));
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
    return passTestWithSideData({
      iterations,
      persistedItems: metadatas[0].cardinality.value,
      blockingItems: metadatas[0].cardinality.value,
      requestTime: requestInitialTimes[0] + metadatas[0].cardinality.value * requestItemTimes[0] +
        requestInitialTimes[1] + metadatas[1].cardinality.value * requestItemTimes[1],
    }, sideData);
  }
}

export interface IActorRdfJoinMinusHashArgs extends IActorRdfJoinArgs {
  /**
   * If this actor can handle undefined values.
   * If false, performance will be slightly better.
   */
  canHandleUndefs: boolean;
}
