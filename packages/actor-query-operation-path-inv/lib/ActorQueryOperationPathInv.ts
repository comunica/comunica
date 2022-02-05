import { ActorAbstractPath } from '@comunica/actor-abstract-path';
import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import type { IActionContext, IQueryOperationResult } from '@comunica/types';
import { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica Path Inv Query Operation Actor.
 */
export class ActorQueryOperationPathInv extends ActorAbstractPath {
  public constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, Algebra.types.INV);
  }

  public async runOperation(operation: Algebra.Path, context: IActionContext): Promise<IQueryOperationResult> {
    const predicate = <Algebra.Inv> operation.predicate;
    const invPath = ActorAbstractPath.FACTORY
      .createPath(operation.object, predicate.path, operation.subject, operation.graph);
    return this.mediatorQueryOperation.mediate({ operation: invPath, context });
  }
}
