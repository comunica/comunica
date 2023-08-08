import { BindingsFactory } from '@comunica/bindings-factory';
import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperationTypedMediated } from '@comunica/bus-query-operation';
import type { IActorTest } from '@comunica/core';
import { MetadataValidationState } from '@comunica/metadata';
import type { IActionContext, IQueryOperationResult } from '@comunica/types';
import { SingletonIterator } from 'asynciterator';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A [Query Operation](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation)
 * actor that handles SPARQL nop operations.
 */
export class ActorQueryOperationNop extends ActorQueryOperationTypedMediated<Algebra.Nop> {
  public constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'nop');
  }

  public async testOperation(operation: Algebra.Nop, context: IActionContext): Promise<IActorTest> {
    return true;
  }

  public async runOperation(operation: Algebra.Nop, context: IActionContext): Promise<IQueryOperationResult> {
    const BF = new BindingsFactory();

    return {
      bindingsStream: new SingletonIterator(BF.bindings()),
      metadata: () => Promise.resolve({
        state: new MetadataValidationState(),
        cardinality: { type: 'exact', value: 1 },
        canContainUndefs: false,
        variables: [],
      }),
      type: 'bindings',
    };
  }
}
