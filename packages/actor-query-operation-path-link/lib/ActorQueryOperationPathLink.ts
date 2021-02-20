import { ActorAbstractPath } from '@comunica/actor-abstract-path';
import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import type { ActionContext } from '@comunica/core';
import type { IActorQueryOperationOutput } from '@comunica/types';
import { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica Path Link Query Operation Actor.
 */
export class ActorQueryOperationPathLink extends ActorAbstractPath {
  public constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, Algebra.types.LINK);
  }

  public async runOperation(path: Algebra.Path, context: ActionContext): Promise<IActorQueryOperationOutput> {
    const predicate = <Algebra.Link> path.predicate;
    const operation = ActorAbstractPath.FACTORY.createPattern(
      path.subject, predicate.iri, path.object, path.graph,
    );
    return this.mediatorQueryOperation.mediate({ operation, context });
  }
}
