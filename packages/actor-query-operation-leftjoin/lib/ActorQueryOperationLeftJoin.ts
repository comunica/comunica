import { ActorRdfJoinMultiBind } from '@comunica/actor-rdf-join-inner-multi-bind';
import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperationTypedMediated } from '@comunica/bus-query-operation';
import type { MediatorRdfJoin } from '@comunica/bus-rdf-join';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type { ComunicaDataFactory, IActionContext, IJoinEntry, IQueryOperationResult } from '@comunica/types';
import { Algebra, AlgebraFactory, algebraUtils, inScopeVariables } from '@comunica/utils-algebra';
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
    const dataFactory: ComunicaDataFactory = context.getSafe(KeysInitQuery.dataFactory);
    const algebraFactory = new AlgebraFactory(dataFactory);

    // If we have an expression in the left join that can be pushed into the right-hand operation,
    // we attach the expression to the right-hand operation, and enforce a bind-join.
    // Otherwise, the expression is passed to the join bus, to be evaluated on joined bindings.
    const expression = operationOriginal.expression;
    const pushExpression = Boolean(expression) && ActorRdfJoinMultiBind
      .canBindWithOperation(operationOriginal.input[1], inScopeVariables(operationOriginal.input[0]));

    // Delegate to join bus
    const entries: IJoinEntry[] = (await Promise.all(operationOriginal.input
      .map(async(subOperation, index) => {
        const output = getSafeBindings(await this.mediatorQueryOperation.mediate({ operation: subOperation, context }));

        if (pushExpression && index === 1) {
          const filterOperation =
            algebraUtils.withMetadata(algebraFactory.createFilter(subOperation, expression!));
          filterOperation.metadata.isHoistedLeftJoinFilter = true;
          return {
            output,
            operation: filterOperation,
            operationRequired: true,
          };
        }

        return {
          output,
          operation: subOperation,
        };
      })));

    return await this.mediatorJoin.mediate({
      type: 'optional',
      entries,
      context,
      ...expression && !pushExpression ? { expression } : {},
    });
  }
}

export interface IActorQueryOperationLeftJoinArgs extends IActorQueryOperationTypedMediatedArgs {
  /**
   * A mediator for joining Bindings streams
   */
  mediatorJoin: MediatorRdfJoin;
}
