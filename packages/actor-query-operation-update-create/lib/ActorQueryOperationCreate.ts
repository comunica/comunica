import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperation, ActorQueryOperationTypedMediated } from '@comunica/bus-query-operation';
import type { MediatorRdfUpdateQuads } from '@comunica/bus-rdf-update-quads';
import type { ActionContext, IActorTest } from '@comunica/core';
import type { IQueryableResult } from '@comunica/types';
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

  public async testOperation(pattern: Algebra.Create, context: ActionContext): Promise<IActorTest> {
    ActorQueryOperation.throwOnReadOnly(context);
    return true;
  }

  public async runOperation(pattern: Algebra.Create, context: ActionContext):
  Promise<IQueryableResult> {
    // Delegate to update-quads bus
    const { updateResult } = await this.mediatorUpdateQuads.mediate({
      createGraphs: {
        graphs: [ pattern.source ],
        requireNonExistence: !pattern.silent,
      },
      context,
    });

    return {
      type: 'update',
      updateResult,
    };
  }
}

export interface IActorQueryOperationCreateArgs extends IActorQueryOperationTypedMediatedArgs {
  /**
   * The RDF Update Quads mediator
   */
  mediatorUpdateQuads: MediatorRdfUpdateQuads;
}
