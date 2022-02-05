import { ActorAbstractPath } from '@comunica/actor-abstract-path';
import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import type { IActionContext, IQueryOperationResult } from '@comunica/types';
import { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica Path Link Query Operation Actor.
 */
export class ActorQueryOperationPathLink extends ActorAbstractPath {
  public constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, Algebra.types.LINK);
  }

  public async runOperation(
    operationOriginal: Algebra.Path,
    context: IActionContext,
  ): Promise<IQueryOperationResult> {
    const predicate = <Algebra.Link> operationOriginal.predicate;
    const operation = ActorAbstractPath.FACTORY.createPattern(
      operationOriginal.subject, predicate.iri, operationOriginal.object, operationOriginal.graph,
    );
    return this.mediatorQueryOperation.mediate({ operation, context });
  }
}
