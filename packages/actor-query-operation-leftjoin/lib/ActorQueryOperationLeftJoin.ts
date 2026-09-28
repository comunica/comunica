import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperationTypedMediated } from '@comunica/bus-query-operation';
import type { MediatorRdfJoin } from '@comunica/bus-rdf-join';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type { IActionContext, IJoinEntry, IQueryOperationResult } from '@comunica/types';
import { Algebra } from '@comunica/utils-algebra';
import { getSafeBindings } from '@comunica/utils-query-operation';

/**
 * A comunica LeftJoin Query Operation Actor.
 */
export class ActorQueryOperationLeftJoin extends ActorQueryOperationTypedMediated<Algebra.LeftJoin> {
  public readonly mediatorJoin: MediatorRdfJoin;

  public constructor(args: IActorQueryOperationLeftJoinArgs) {
    super(args, Algebra.Types.LEFT_JOIN);
    this.mediatorJoin = args.mediatorJoin;
  }

  public async testOperation(_operation: Algebra.LeftJoin, _context: IActionContext): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async runOperation(operationOriginal: Algebra.LeftJoin, context: IActionContext):
  Promise<IQueryOperationResult> {
    // Delegate to join bus, which decides how the expression is evaluated
    const entries: IJoinEntry[] = await Promise.all(operationOriginal.input
      .map(async subOperation => ({
        output: getSafeBindings(await this.mediatorQueryOperation.mediate({ operation: subOperation, context })),
        operation: subOperation,
      })));

    const expression = operationOriginal.expression;
    return await this.mediatorJoin.mediate({
      type: 'optional',
      entries,
      context,
      ...expression ? { expression } : {},
    });
  }
}

export interface IActorQueryOperationLeftJoinArgs extends IActorQueryOperationTypedMediatedArgs {
  /**
   * A mediator for joining Bindings streams
   */
  mediatorJoin: MediatorRdfJoin;
}
