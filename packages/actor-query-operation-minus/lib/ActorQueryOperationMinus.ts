import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import {
  ActorQueryOperation,
  ActorQueryOperationTypedMediated,
} from '@comunica/bus-query-operation';
import type { ActorRdfJoin, IActionRdfJoin, IJoinEntry } from '@comunica/bus-rdf-join';
import type { ActionContext, IActorTest, Mediator } from '@comunica/core';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type { IActorQueryOperationOutput } from '@comunica/types';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica Minus Query Operation Actor.
 */
export class ActorQueryOperationMinus extends ActorQueryOperationTypedMediated<Algebra.Minus> {
  public readonly mediatorJoin: Mediator<ActorRdfJoin,
  IActionRdfJoin, IMediatorTypeJoinCoefficients, IActorQueryOperationOutput>;

  public constructor(args: IActorQueryOperationMinusArgs) {
    super(args, 'minus');
  }

  public async testOperation(operation: Algebra.Minus, context: ActionContext): Promise<IActorTest> {
    return true;
  }

  public async runOperation(pattern: Algebra.Minus, context: ActionContext): Promise<IActorQueryOperationOutput> {
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
  mediatorJoin: Mediator<ActorRdfJoin,
  IActionRdfJoin, IMediatorTypeJoinCoefficients, IActorQueryOperationOutput>;
}
