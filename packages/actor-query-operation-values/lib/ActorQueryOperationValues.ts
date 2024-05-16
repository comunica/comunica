import { BindingsFactory } from '@comunica/bindings-factory';
import type { MediatorMergeBindingsContext } from '@comunica/bus-merge-bindings-context';
import type { IActionQueryOperation } from '@comunica/bus-query-operation';
import { ActorQueryOperationTyped } from '@comunica/bus-query-operation';
import type { IActorArgs, IActorTest } from '@comunica/core';
import { MetadataValidationState } from '@comunica/metadata';
import type {
  IQueryOperationResult,
  BindingsStream,
  Bindings,
  IActionContext,
  MetadataBindings,
} from '@comunica/types';
import { ArrayIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import type { Algebra } from 'sparqlalgebrajs';

const DF = new DataFactory();

/**
 * A comunica Values Query Operation Actor.
 */
export class ActorQueryOperationValues extends ActorQueryOperationTyped<Algebra.Values> {
  public readonly mediatorMergeBindingsContext: MediatorMergeBindingsContext;

  public constructor(args: IActorQueryOperationUpdateDeleteInsertArgs) {
    super(args, 'values');
  }

  public async testOperation(_operation: Algebra.Values, _context: IActionContext): Promise<IActorTest> {
    return true;
  }

  public async runOperation(operation: Algebra.Values, context: IActionContext):
  Promise<IQueryOperationResult> {
    const bindingsFactory = await BindingsFactory.create(this.mediatorMergeBindingsContext, context);
    const bindingsStream: BindingsStream = new ArrayIterator<Bindings>(operation.bindings
      .map(x => bindingsFactory.bindings(Object.entries(x)
        .map(([ key, value ]) => [ DF.variable(key.slice(1)), value ]))));
    const variables = operation.variables;
    const metadata = (): Promise<MetadataBindings> => Promise.resolve({
      state: new MetadataValidationState(),
      cardinality: { type: 'exact', value: operation.bindings.length },
      canContainUndefs: operation.bindings.some(bindings => variables.some(variable => !(`?${variable.value}` in bindings))),
      variables,
    });
    return { type: 'bindings', bindingsStream, metadata };
  }
}

export interface IActorQueryOperationUpdateDeleteInsertArgs extends
  IActorArgs<IActionQueryOperation, IActorTest, IQueryOperationResult> {
  /**
   * A mediator for creating binding context merge handlers
   */
  mediatorMergeBindingsContext: MediatorMergeBindingsContext;
}
