import { ActorAbstractPath } from '@comunica/actor-abstract-path';
import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';

import { KeysInitQuery } from '@comunica/context-entries';
import type { ComunicaDataFactory, IActionContext, IQueryOperationResult } from '@comunica/types';
import { Algebra, AlgebraFactory } from '@comunica/utils-algebra';
import { getSafeBindings } from '@comunica/utils-query-operation';

/**
 * A comunica Path Nps Query Operation Actor.
 */
export class ActorQueryOperationPathNps extends ActorAbstractPath {
  public constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, Algebra.Types.NPS);
  }

  public async runOperation(operation: Algebra.Path, context: IActionContext): Promise<IQueryOperationResult> {
    const dataFactory: ComunicaDataFactory = context.getSafe(KeysInitQuery.dataFactory);
    const algebraFactory = new AlgebraFactory(dataFactory);

    const predicate = <Algebra.Nps> operation.predicate;
    const blank = this.generateVariable(dataFactory, operation);

    const pattern = Object.assign(algebraFactory
      .createPattern(operation.subject, blank, operation.object, operation.graph), { metadata: predicate.metadata });
    const output = getSafeBindings(
      await this.mediatorQueryOperation.mediate({ operation: pattern, context }),
    );

    // Remove the generated blank nodes from the bindings
    const bindingsStream = output.bindingsStream
      .map(bindings => predicate.iris.some(iri => iri.equals(bindings.get(blank))) ? null : bindings.delete(blank));

    return {
      type: 'bindings',
      bindingsStream,
      metadata: output.metadata,
    };
  }
}
