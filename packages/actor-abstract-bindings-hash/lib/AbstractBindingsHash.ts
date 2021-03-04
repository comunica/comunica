import {
  ActorQueryOperation,
  ActorQueryOperationTypedMediated,
} from '@comunica/bus-query-operation';
import type { ActionContext, IActorTest } from '@comunica/core';
import type { Bindings,
  BindingsStream,
  IActorQueryOperationOutputBindings } from '@comunica/types';
import type { Algebra } from 'sparqlalgebrajs';
import type { IActorInitRdfDereferencePagedArgs } from './AbstractFilterHash';

/**
 * A comunica Hash Query Operation Actor.
 */
export abstract class AbstractBindingsHash<T extends Algebra.Operation> extends ActorQueryOperationTypedMediated<T>
  implements IActorInitRdfDereferencePagedArgs {
  public constructor(args: IActorInitRdfDereferencePagedArgs, operator: string) {
    super(args, operator);
  }

  /**
     * Create a new filter function for the given hash algorithm and digest algorithm.
     * The given filter depends on the Algebraic operation
     * @return {(bindings: Bindings) => boolean} A distinct filter for bindings.
     */
  public abstract newHashFilter(): (bindings: Bindings) => boolean;

  public async testOperation(pattern: T, context: ActionContext): Promise<IActorTest> {
    return true;
  }

  public async runOperation(pattern: T, context: ActionContext): Promise<IActorQueryOperationOutputBindings> {
    const output: IActorQueryOperationOutputBindings = ActorQueryOperation.getSafeBindings(
      await this.mediatorQueryOperation.mediate({ operation: pattern.input, context }),
    );
    const bindingsStream: BindingsStream = output.bindingsStream.filter(
      this.newHashFilter(),
    );
    return {
      type: 'bindings',
      bindingsStream,
      metadata: output.metadata,
      variables: output.variables,
      canContainUndefs: output.canContainUndefs,
    };
  }
}
