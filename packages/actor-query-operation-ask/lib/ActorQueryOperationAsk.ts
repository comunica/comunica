import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperationTypedMediated } from '@comunica/bus-query-operation';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type {
  IActionContext,
  IQueryOperationResult,
  IQueryOperationResultBindings,
} from '@comunica/types';
import { getSafeBindings } from '@comunica/utils-query-operation';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica Ask Query Operation Actor.
 */
export class ActorQueryOperationAsk extends ActorQueryOperationTypedMediated<Algebra.Ask> {
  public constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'ask');
  }

  public async testOperation(_operation: Algebra.Ask, _context: IActionContext): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async runOperation(operation: Algebra.Ask, context: IActionContext): Promise<IQueryOperationResult> {
    // Call other query operations like this:
    const output: IQueryOperationResult = await this.mediatorQueryOperation.mediate(
      { operation: operation.input, context },
    );
    const { bindingsStream }: IQueryOperationResultBindings = getSafeBindings(output);
    return { type: 'boolean', execute: async() => (await bindingsStream.take(1).toArray()).length === 1 };
  }
}
