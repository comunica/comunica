import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperation, ActorQueryOperationTypedMediated } from '@comunica/bus-query-operation';
import type { IActorTest } from '@comunica/core';
import type {
  IActionContext,
  IQueryableResult,
  IQueryableResultBindings,
} from '@comunica/types';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica Ask Query Operation Actor.
 */
export class ActorQueryOperationAsk extends ActorQueryOperationTypedMediated<Algebra.Ask> {
  public constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'ask');
  }

  public async testOperation(operation: Algebra.Ask, context: IActionContext | undefined): Promise<IActorTest> {
    return true;
  }

  public async runOperation(operation: Algebra.Ask, context: IActionContext | undefined): Promise<IQueryableResult> {
    // Call other query operations like this:
    const output: IQueryableResult = await this.mediatorQueryOperation.mediate(
      { operation: operation.input, context },
    );
    const bindings: IQueryableResultBindings = ActorQueryOperation.getSafeBindings(output);
    const booleanResult: Promise<boolean> = new Promise<boolean>((resolve, reject) => {
      // Resolve to true if we find one element, and close immediately
      bindings.bindingsStream.once('data', () => {
        resolve(true);
        bindings.bindingsStream.close();
      });

      // If we reach the end of the stream without finding anything, resolve to false
      bindings.bindingsStream.on('end', () => resolve(false));

      // Reject if an error occurs in the stream
      bindings.bindingsStream.on('error', reject);
    });
    return { type: 'boolean', booleanResult };
  }
}
