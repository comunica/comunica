import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import {
  ActorQueryOperation,
  ActorQueryOperationTypedMediated,
} from '@comunica/bus-query-operation';
import type { IJoinEntry, MediatorRdfJoin } from '@comunica/bus-rdf-join';
import type { ActionContext, IActorTest } from '@comunica/core';
import type { IQueryableResult } from '@comunica/types';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica Minus Query Operation Actor.
 */
export class ActorQueryOperationMinus extends ActorQueryOperationTypedMediated<Algebra.Minus> {
  public readonly mediatorJoin: MediatorRdfJoin;

  public constructor(args: IActorQueryOperationMinusArgs) {
    super(args, 'minus');
  }

  public async testOperation(operation: Algebra.Minus, context: ActionContext): Promise<IActorTest> {
    return true;
  }

  public async runOperation(pattern: Algebra.Minus, context: ActionContext): Promise<IQueryableResult> {
    const entries: IJoinEntry[] = (await Promise.all(pattern.input
      .map(async subOperation => ({
        output: await this.mediatorQueryOperation.mediate({ operation: subOperation, context }),
        operation: subOperation,
      }))))
      .map(({ output, operation }) => ({
        output: ActorQueryOperation.getSafeBindings(output),
        operation,
      }));

    return this.mediatorJoin.mediate({ type: 'minus', entries, context });
  }
}

export interface IActorQueryOperationMinusArgs extends IActorQueryOperationTypedMediatedArgs {
  /**
   * A mediator for joining Bindings streams
   */
  mediatorJoin: MediatorRdfJoin;
}
