import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperation, ActorQueryOperationTypedMediated } from '@comunica/bus-query-operation';
import type { MediatorRdfUpdateQuads } from '@comunica/bus-rdf-update-quads';
import type { IActorTest } from '@comunica/core';
import type { IActionContext, IQueryOperationResult } from '@comunica/types';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A [Query Operation](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation) actor that
 * handles SPARQL create operations.
 */
export class ActorQueryOperationCreate extends ActorQueryOperationTypedMediated<Algebra.Create> {
  public readonly mediatorUpdateQuads: MediatorRdfUpdateQuads;

  public constructor(args: IActorQueryOperationCreateArgs) {
    super(args, 'create');
  }

  public async testOperation(operation: Algebra.Create, context: IActionContext): Promise<IActorTest> {
    ActorQueryOperation.throwOnReadOnly(context);
    return true;
  }

  public async runOperation(operation: Algebra.Create, context: IActionContext):
  Promise<IQueryOperationResult> {
    // Delegate to update-quads bus
    const { execute } = await this.mediatorUpdateQuads.mediate({
      createGraphs: {
        graphs: [ operation.source ],
        requireNonExistence: !operation.silent,
      },
      context,
    });

    return {
      type: 'void',
      execute,
    };
  }
}

export interface IActorQueryOperationCreateArgs extends IActorQueryOperationTypedMediatedArgs {
  /**
   * The RDF Update Quads mediator
   */
  mediatorUpdateQuads: MediatorRdfUpdateQuads;
}
