import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperationTypedMediated } from '@comunica/bus-query-operation';
import type { IActorTest } from '@comunica/core';
import type { IActionContext, IQueryOperationResult } from '@comunica/types';
import { Factory } from 'sparqlalgebrajs';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A [Query Operation](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation) actor
 * that handles SPARQL BGP operations by rewriting it as a join operator.
 */
export class ActorQueryOperationBgpJoin extends ActorQueryOperationTypedMediated<Algebra.Bgp> {
  public static readonly FACTORY = new Factory();

  public constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'bgp');
  }

  public async testOperation(operation: Algebra.Bgp, context: IActionContext): Promise<IActorTest> {
    return true;
  }

  public async runOperation(operation: Algebra.Bgp, context: IActionContext):
  Promise<IQueryOperationResult> {
    return this.mediatorQueryOperation.mediate({
      operation: ActorQueryOperationBgpJoin.FACTORY.createJoin(operation.patterns),
      context,
    });
  }
}
