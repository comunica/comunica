import { ActorQueryOperationTypedMediated, ActorQueryOperation,
  IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { IActorTest } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import type { IQueryOperationResultBindings } from '@comunica/types';
import { Algebra } from 'sparqlalgebrajs';

/**
 * A [Query Operation](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation) actor that handles SPARQL reduced-my operations.
 */
export class ActorQueryOperationReducedMy extends ActorQueryOperationTypedMediated<Algebra.Reduced> {
  public constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'reduced');
  }

  public async testOperation(pattern: Algebra.Reduced, context: IActionContext): Promise<IActorTest> {
    return true; // TODO implement
  }

  public async runOperation(pattern: Algebra.Reduced, context: IActionContext): Promise<IQueryOperationResultBindings> {
    // Call other query operations like this:
    // const output: IQueryOperationResult = await this.mediatorQueryOperation.mediate({ operation, context });
    const output = ActorQueryOperation.getSafeBindings(await this.mediatorQueryOperation.mediate({ operation: pattern.input, context }));
    return {
      type: 'bindings',
      bindingsStream: output.bindingsStream,
      metadata: output.metadata,
    };
  }
}
