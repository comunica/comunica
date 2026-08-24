import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import {
  ActorQueryOperationTypedMediated,
} from '@comunica/bus-query-operation';
import type { MediatorRdfJoin } from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type { IQueryOperationResult, IActionContext, IJoinEntry } from '@comunica/types';
import { Algebra } from '@comunica/utils-algebra';
import { MetadataValidationState } from '@comunica/utils-metadata';
import { getSafeBindings } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';

/**
 * A comunica Join Query Operation Actor.
 */
export class ActorQueryOperationJoin extends ActorQueryOperationTypedMediated<Algebra.Join> {
  public readonly mediatorJoin: MediatorRdfJoin;

  public constructor(args: IActorQueryOperationJoinArgs) {
    super(args, Algebra.Types.JOIN);
    this.mediatorJoin = args.mediatorJoin;
  }

  public async testOperation(_operation: Algebra.Join, _context: IActionContext): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async runOperation(
    operationOriginal: Algebra.Join,
    context: IActionContext,
  ): Promise<IQueryOperationResult> {
    const entries: IJoinEntry[] = (await Promise.all(operationOriginal.input
      .map(async subOperation => ({
        output: await this.mediatorQueryOperation.mediate({ operation: subOperation, context }),
        operation: subOperation,
      }))))
      .map(({ output, operation }) => ({
        output: getSafeBindings(output),
        operation,
      }));

    // Return immediately if one of the join entries has cardinality zero, to avoid actor testing overhead.
    // This uses the same emptiness condition as ActorRdfJoinMultiEmpty, which is the actor that would
    // otherwise be selected here: it accepts a cardinality of zero of any type, and its join coefficients
    // are all zero, so it always wins the cost comparison. Requiring an *exact* cardinality instead meant
    // that sources reporting estimates - which includes every source behind the hypermedia layer, such as
    // files - never took this path and paid a full join mediation only to be handed back an empty stream.
    if ((await Promise.all(entries.map(entry => entry.output.metadata())))
      .some(entry => entry.cardinality.value === 0)) {
      for (const entry of entries) {
        entry.output.bindingsStream.close();
      }
      return {
        bindingsStream: new ArrayIterator<RDF.Bindings>([], { autoStart: false }),
        metadata: async() => ({
          state: new MetadataValidationState(),
          cardinality: { type: 'exact', value: 0 },
          variables: ActorRdfJoin.joinVariables(new DataFactory(), await ActorRdfJoin.getMetadatas(entries)),
        }),
        type: 'bindings',
      };
    }

    return this.mediatorJoin.mediate({ type: 'inner', entries, context });
  }
}

export interface IActorQueryOperationJoinArgs extends IActorQueryOperationTypedMediatedArgs {
  /**
   * A mediator for joining Bindings streams
   */
  mediatorJoin: MediatorRdfJoin;
}
