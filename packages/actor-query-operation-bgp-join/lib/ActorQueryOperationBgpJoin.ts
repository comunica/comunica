import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperationTypedMediated } from '@comunica/bus-query-operation';
import type { ActionContext, IActorTest } from '@comunica/core';
import type { IActorQueryOperationOutput } from '@comunica/types';
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

  public async testOperation(pattern: Algebra.Bgp, context: ActionContext): Promise<IActorTest> {
    return true;
  }

  public async runOperation(pattern: Algebra.Bgp, context: ActionContext):
  Promise<IActorQueryOperationOutput> {
    return this.mediatorQueryOperation.mediate({
      operation: ActorQueryOperationBgpJoin.FACTORY.createJoin(pattern.patterns),
      context,
    });
  }
}
