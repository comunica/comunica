import type { MediatorHashBindings } from '@comunica/bus-hash-bindings';
import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import {
  ActorQueryOperation,
  ActorQueryOperationTypedMediated,
} from '@comunica/bus-query-operation';
import type { IActorTest } from '@comunica/core';
import type { Bindings, BindingsStream, IActionContext,
  IQueryOperationResult, IQueryOperationResultBindings } from '@comunica/types';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica Distinct Hash Query Operation Actor.
 */
export class ActorQueryOperationDistinctHash extends ActorQueryOperationTypedMediated<Algebra.Distinct> {
  public readonly mediatorHashBindings: MediatorHashBindings;

  public constructor(args: IActorQueryOperationDistinctHashArgs) {
    super(args, 'distinct');
  }

  public async testOperation(operation: Algebra.Distinct, context: IActionContext): Promise<IActorTest> {
    return true;
  }

  public async runOperation(operation: Algebra.Distinct, context: IActionContext): Promise<IQueryOperationResult> {
    const output: IQueryOperationResultBindings = ActorQueryOperation.getSafeBindings(
      await this.mediatorQueryOperation.mediate({ operation: operation.input, context }),
    );
    const bindingsStream: BindingsStream = output.bindingsStream.filter(await this.newHashFilter(context));
    return {
      type: 'bindings',
      bindingsStream,
      metadata: output.metadata,
    };
  }

  /**
   * Create a new distinct filter function.
   * This will maintain an internal hash datastructure so that every bindings object only returns true once.
   * @param context The action context.
   * @return {(bindings: Bindings) => boolean} A distinct filter for bindings.
   */
  public async newHashFilter(context: IActionContext): Promise<(bindings: Bindings) => boolean> {
    const { hashFunction } = await this.mediatorHashBindings.mediate({ allowHashCollisions: true, context });
    const hashes: Record<string, boolean> = {};
    return (bindings: Bindings) => {
      const hash: string = hashFunction(bindings);
      // eslint-disable-next-line no-return-assign
      return !(hash in hashes) && (hashes[hash] = true);
    };
  }
}

export interface IActorQueryOperationDistinctHashArgs extends IActorQueryOperationTypedMediatedArgs {
  mediatorHashBindings: MediatorHashBindings;
}
