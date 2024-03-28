import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import type {
  IActionRdfJoin,
  IActorRdfJoinArgs,
  IActorRdfJoinOutputInner,
} from '@comunica/bus-rdf-join';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type { MetadataBindings, TermsOrder } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { termToString } from 'rdf-string';
import { SortMergeJoinIterator } from './SortMergeJoinIterator';

/**
 * A comunica Inner Sort Merge RDF Join Actor.
 */
export class ActorRdfJoinInnerSortMerge extends ActorRdfJoin {
  public constructor(args: IActorRdfJoinArgs) {
    super(args, {
      logicalType: 'inner',
      physicalName: 'sort-merge',
      limitEntries: 2,
    });
  }

  public async getOutput(action: IActionRdfJoin): Promise<IActorRdfJoinOutputInner> {
    const metadatas = await ActorRdfJoin.getMetadatas(action.entries);
    const commonVariables: RDF.Variable[] = ActorRdfJoin.overlappingVariables(metadatas);
    const join = new SortMergeJoinIterator(
      action.entries[0].output.bindingsStream,
      action.entries[1].output.bindingsStream,
      ActorRdfJoin.joinBindings,
      // TODO: pass comparator from sparqlee?
      ActorRdfJoinInnerSortMerge.compareBindings.bind(this, commonVariables),
    );
    return {
      result: {
        type: 'bindings',
        bindingsStream: join,
        metadata: async() => {
          const meta = await this.constructResultMetadata(action.entries, metadatas, action.context);
          meta.order = ActorRdfJoinInnerSortMerge.mergeOrderMetadata(metadatas);
          return meta;
        },
      },
    };
  }

  public static mergeOrderMetadata(metadatas: MetadataBindings[]): TermsOrder<RDF.Variable> {
    const variables: Set<string> = new Set();
    const orders: TermsOrder<RDF.Variable> = [];

    for (const metadata of metadatas) {
      for (const orderEntry of metadata.order!) {
        if (!variables.has(orderEntry.term.value)) {
          variables.add(orderEntry.term.value);
          orders.push(orderEntry);
        }
      }
    }

    return orders;
  }

  public static compareBindings(commonVariables: RDF.Variable[], left: RDF.Bindings, right: RDF.Bindings): number {
    for (const variable of commonVariables) {
      const compare = (termToString(left.get(variable)) ?? '')
        .localeCompare(termToString(right.get(variable)) ?? '');
      if (compare !== 0) {
        return compare;
      }
    }
    return 0;
  }

  public async getJoinCoefficients(
    action: IActionRdfJoin,
    metadatas: MetadataBindings[],
  ): Promise<IMediatorTypeJoinCoefficients> {
    if (!metadatas[0].order || !metadatas[1].order ||
      !this.areOrdersCompatible(metadatas[0].order, metadatas[1].order)) {
      throw new Error(`Sort-Merge join can only be applied on compatible orders`);
    }

    const requestInitialTimes = ActorRdfJoin.getRequestInitialTimes(metadatas);
    const requestItemTimes = ActorRdfJoin.getRequestItemTimes(metadatas);
    return {
      iterations: metadatas[0].cardinality.value + metadatas[1].cardinality.value,
      persistedItems: 0,
      blockingItems: 0,
      requestTime: requestInitialTimes[0] + metadatas[0].cardinality.value * requestItemTimes[0] +
        requestInitialTimes[1] + metadatas[1].cardinality.value * requestItemTimes[1],
    };
  }

  public areOrdersCompatible(
    order1: TermsOrder<RDF.Variable>,
    order2: TermsOrder<RDF.Variable>,
  ): boolean {
    const commonVars: Set<string> = new Set();

    // Determine common entries
    for (const entry1 of order1) {
      for (const entry2 of order2) {
        if (entry1.term.equals(entry2.term)) {
          if (entry1.direction !== entry2.direction) {
            return false;
          }
          commonVars.add(entry1.term.value);
        }
      }
    }

    // We need at least one overlapping variable
    if (commonVars.size === 0) {
      return false;
    }

    // Check if common entries occur in the same order
    const entries1 = order1
      .map(entry => entry.term.value)
      .filter(entry => commonVars.has(entry));
    const entries2 = order2
      .map(entry => entry.term.value)
      .filter(entry => commonVars.has(entry));
    return entries1.join(',') === entries2.join(',');
  }
}
