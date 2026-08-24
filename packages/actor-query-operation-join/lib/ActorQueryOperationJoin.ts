import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import {
  ActorQueryOperationTypedMediated,
} from '@comunica/bus-query-operation';
import type { MediatorRdfJoin } from '@comunica/bus-rdf-join';
import { ActorRdfJoin } from '@comunica/bus-rdf-join';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type {
  IQueryOperationResult,
  IActionContext,
  IJoinEntry,
  MetadataBindings,
  MetadataVariable,
} from '@comunica/types';
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
    // Evaluate the entries one at a time, so that we can stop as soon as one of them turns out to be empty.
    // An inner join with an empty entry is empty, so evaluating the remaining entries is wasted work:
    // in a bind join, most of the joins that are evaluated once per binding are empty, and every entry that is
    // not evaluated saves a query operation mediation and a source lookup.
    // The emptiness condition is the same one as ActorRdfJoinMultiEmpty's, which is the actor that would
    // otherwise be selected here: it accepts a cardinality of zero of any type, and its join coefficients are
    // all zero, so it always wins the cost comparison.
    const entries: IJoinEntry[] = [];
    let remaining: Algebra.Operation[] | undefined;
    for (const [ index, subOperation ] of operationOriginal.input.entries()) {
      const output = getSafeBindings(await this.mediatorQueryOperation.mediate({ operation: subOperation, context }));
      entries.push({ output, operation: subOperation });
      if ((await output.metadata()).cardinality.value === 0) {
        remaining = operationOriginal.input.slice(index + 1);
        break;
      }
    }

    if (remaining) {
      for (const entry of entries) {
        entry.output.bindingsStream.close();
      }
      let variables: Promise<MetadataVariable[]> | undefined;
      return {
        bindingsStream: new ArrayIterator<RDF.Bindings>([], { autoStart: false }),
        metadata: async() => ({
          state: new MetadataValidationState(),
          cardinality: { type: 'exact', value: 0 },
          variables: await (variables ??= this.joinVariables(entries, remaining, context)),
        }),
        type: 'bindings',
      };
    }

    return this.mediatorJoin.mediate({ type: 'inner', entries, context });
  }

  /**
   * Determine the variables of an empty join over the given evaluated entries and not-yet-evaluated operations.
   *
   * The variables of a join are the union over all of its inputs, so the operations that were skipped once the
   * join was known to be empty still have to be evaluated here. This only happens if the metadata of the join is
   * actually requested, which is not the case for the bind join that produces most of these empty joins.
   * @param entries The join entries that were already evaluated.
   * @param remaining The operations that were skipped because the join was already known to be empty.
   * @param context The action context.
   */
  protected async joinVariables(
    entries: IJoinEntry[],
    remaining: Algebra.Operation[],
    context: IActionContext,
  ): Promise<MetadataVariable[]> {
    const metadatas: MetadataBindings[] = await ActorRdfJoin.getMetadatas(entries);
    for (const operation of remaining) {
      const output = getSafeBindings(await this.mediatorQueryOperation.mediate({ operation, context }));
      metadatas.push(await output.metadata());
      output.bindingsStream.close();
    }
    return ActorRdfJoin.joinVariables(new DataFactory(), metadatas);
  }
}

export interface IActorQueryOperationJoinArgs extends IActorQueryOperationTypedMediatedArgs {
  /**
   * A mediator for joining Bindings streams
   */
  mediatorJoin: MediatorRdfJoin;
}
