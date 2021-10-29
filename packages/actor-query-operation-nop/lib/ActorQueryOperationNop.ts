import { BindingsFactory } from '@comunica/bindings-factory';
import type { IActorQueryOperationOutputBindings,
  IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperationTypedMediated } from '@comunica/bus-query-operation';
import type { ActionContext, IActorTest } from '@comunica/core';
import { SingletonIterator } from 'asynciterator';
import type { Algebra } from 'sparqlalgebrajs';

const BF = new BindingsFactory();
/**
 * A [Query Operation](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation)
 * actor that handles SPARQL nop operations.
 */
export class ActorQueryOperationNop extends ActorQueryOperationTypedMediated<Algebra.Nop> {
  public constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'nop');
  }

  public async testOperation(pattern: Algebra.Nop, context: ActionContext): Promise<IActorTest> {
    return true;
  }

  public async runOperation(pattern: Algebra.Nop, context: ActionContext):
  Promise<IActorQueryOperationOutputBindings> {
    return {
      bindingsStream: new SingletonIterator(BF.bindings({})),
      metadata: () => Promise.resolve({ cardinality: 1, canContainUndefs: false }),
      type: 'bindings',
      variables: [],
    };
  }
}
