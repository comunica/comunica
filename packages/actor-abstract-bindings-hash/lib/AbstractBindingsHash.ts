import {
  ActorQueryOperation,
  ActorQueryOperationTypedMediated,
} from '@comunica/bus-query-operation';
import type { IActorTest } from '@comunica/core';
import type {
  Bindings, BindingsStream, IActionContext, IQueryableResult, IQueryableResultBindings,
} from '@comunica/types';
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

  public async testOperation(operation: T, context: IActionContext | undefined): Promise<IActorTest> {
    return true;
  }

  public async runOperation(operation: T, context: IActionContext | undefined): Promise<IQueryableResult> {
    const output: IQueryableResultBindings = ActorQueryOperation.getSafeBindings(
      await this.mediatorQueryOperation.mediate({ operation: operation.input, context }),
    );
    const bindingsStream: BindingsStream = output.bindingsStream.filter(
      this.newHashFilter(),
    );
    return {
      type: 'bindings',
      bindingsStream,
      metadata: output.metadata,
      variables: output.variables,
    };
  }
}
