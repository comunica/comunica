import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import {
  ActorQueryOperation,
  ActorQueryOperationTypedMediated,
} from '@comunica/bus-query-operation';
import type { ActorRdfJoin, IActionRdfJoin, IJoinEntry } from '@comunica/bus-rdf-join';
import type { IActorTest, Mediator } from '@comunica/core';
import type { IMediatorTypeJoinCoefficients } from '@comunica/mediatortype-join-coefficients';
import type { IActorQueryOperationOutput, ActionContext } from '@comunica/types';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica Join Query Operation Actor.
 */
export class ActorQueryOperationJoin extends ActorQueryOperationTypedMediated<Algebra.Join> {
  public readonly mediatorJoin: Mediator<ActorRdfJoin,
  IActionRdfJoin, IMediatorTypeJoinCoefficients, IActorQueryOperationOutput>;

  public constructor(args: IActorQueryOperationJoinArgs) {
    super(args, 'join');
  }

  public async testOperation(pattern: Algebra.Join, context: ActionContext): Promise<IActorTest> {
    return true;
  }

  public async runOperation(pattern: Algebra.Join, context: ActionContext): Promise<IActorQueryOperationOutput> {
    const entries: IJoinEntry[] = (await Promise.all(pattern.input
      .map(async subOperation => ({
        output: await this.mediatorQueryOperation.mediate({ operation: subOperation, context }),
        operation: subOperation,
      }))))
      .map(({ output, operation }) => ({
        output: ActorQueryOperation.getSafeBindings(output),
        operation,
      }));

    return this.mediatorJoin.mediate({ type: 'inner', entries, context });
  }
}

export interface IActorQueryOperationJoinArgs extends IActorQueryOperationTypedMediatedArgs {
  mediatorJoin: Mediator<ActorRdfJoin, IActionRdfJoin, IMediatorTypeJoinCoefficients, IActorQueryOperationOutput>;
}
