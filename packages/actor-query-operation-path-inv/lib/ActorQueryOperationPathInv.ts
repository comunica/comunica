import { ActorAbstractPath } from '@comunica/actor-abstract-path';
import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import type { ActionContext } from '@comunica/core';
import type { IActorQueryOperationOutput } from '@comunica/types';
import { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica Path Inv Query Operation Actor.
 */
export class ActorQueryOperationPathInv extends ActorAbstractPath {
  public constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, Algebra.types.INV);
  }

  public async runOperation(path: Algebra.Path, context: ActionContext): Promise<IActorQueryOperationOutput> {
    const predicate = <Algebra.Inv> path.predicate;
    const invPath = ActorAbstractPath.FACTORY.createPath(path.object, predicate.path, path.subject, path.graph);
    return this.mediatorQueryOperation.mediate({ operation: invPath, context });
  }
}
