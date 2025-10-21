import { ActorAbstractPath } from '@comunica/actor-abstract-path';
import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import type { ComunicaDataFactory, IActionContext, IQueryOperationResult } from '@comunica/types';
import { Algebra, AlgebraFactory } from '@comunica/utils-algebra';

/**
 * A comunica Path Inv Query Operation Actor.
 */
export class ActorQueryOperationPathInv extends ActorAbstractPath {
  public constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, Algebra.Types.INV);
  }

  public async runOperation(operation: Algebra.Path, context: IActionContext): Promise<IQueryOperationResult> {
    const dataFactory: ComunicaDataFactory = context.getSafe(KeysInitQuery.dataFactory);
    const algebraFactory = new AlgebraFactory(dataFactory);

    const predicate = <Algebra.Inv> operation.predicate;
    const invPath = algebraFactory.createPath(operation.object, predicate.path, operation.subject, operation.graph);
    return this.mediatorQueryOperation.mediate({ operation: invPath, context });
  }
}
