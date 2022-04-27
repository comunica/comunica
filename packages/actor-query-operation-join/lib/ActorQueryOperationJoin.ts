import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import {
  ActorQueryOperation,
  ActorQueryOperationTypedMediated,
} from '@comunica/bus-query-operation';
import type { MediatorRdfJoin } from '@comunica/bus-rdf-join';
import type { IActorTest } from '@comunica/core';
import type { IQueryOperationResult, IActionContext, IJoinEntry } from '@comunica/types';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica Join Query Operation Actor.
 */
export class ActorQueryOperationJoin extends ActorQueryOperationTypedMediated<Algebra.Join> {
  public readonly mediatorJoin: MediatorRdfJoin;

  public constructor(args: IActorQueryOperationJoinArgs) {
    super(args, 'join');
  }

  public async testOperation(operation: Algebra.Join, context: IActionContext): Promise<IActorTest> {
    return true;
  }

  public async runOperation(
    operationOriginal: Algebra.Join,
    context: IActionContext,
  ): Promise<IQueryOperationResult> {
    console.log('running join operation')

    const entries: IJoinEntry[] = (await Promise.all(operationOriginal.input
      .map(async subOperation => ({
        output: await this.mediatorQueryOperation.mediate({ operation: subOperation, context }),
        operation: subOperation,
      }))))
      .map(({ output, operation }) => ({
        output: ActorQueryOperation.getSafeBindings(output),
        operation,
      }));

    console.log('completed collecting entries operation')

    console.log('about to do a join', this.mediatorJoin)

    const join = await this.mediatorJoin.mediate({ type: 'inner', entries, context });

    console.log('completed join mediation')

    return join;
  }
}

export interface IActorQueryOperationJoinArgs extends IActorQueryOperationTypedMediatedArgs {
  /**
   * A mediator for joining Bindings streams
   */
  mediatorJoin: MediatorRdfJoin;
}
