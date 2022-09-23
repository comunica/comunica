import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperation, ActorQueryOperationTypedMediated } from '@comunica/bus-query-operation';
import type { IActorTest } from '@comunica/core';
import type {
  IActionContext,
  IQueryOperationResult,
  IQueryOperationResultBindings,
} from '@comunica/types';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica Ask Query Operation Actor.
 */
export class ActorQueryOperationAsk extends ActorQueryOperationTypedMediated<Algebra.Ask> {
  public constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'ask');
  }

  public async testOperation(operation: Algebra.Ask, context: IActionContext): Promise<IActorTest> {
    return true;
  }

  public async runOperation(operation: Algebra.Ask, context: IActionContext): Promise<IQueryOperationResult> {
    // Call other query operations like this:
    const output: IQueryOperationResult = await this.mediatorQueryOperation.mediate(
      { operation: operation.input, context },
    );
    const { bindingsStream }: IQueryOperationResultBindings = ActorQueryOperation.getSafeBindings(output);
    return { type: 'boolean', execute: async() => (await bindingsStream.take(1).toArray()).length === 1 };
  }
}
