import { ActorAbstractPath } from '@comunica/actor-abstract-path';
import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import type { ComunicaDataFactory, IActionContext, IQueryOperationResult } from '@comunica/types';
import { Algebra, Factory } from 'sparqlalgebrajs';

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
    const dataFactory: ComunicaDataFactory = context.getSafe(KeysInitQuery.dataFactory);
    const algebraFactory = new Factory(dataFactory);

    const predicate = <Algebra.Link> operationOriginal.predicate;
    const operation = Object.assign(algebraFactory.createPattern(
      operationOriginal.subject,
      predicate.iri,
      operationOriginal.object,
      operationOriginal.graph,
    ), { metadata: predicate.metadata });
    return this.mediatorQueryOperation.mediate({ operation, context });
  }
}
