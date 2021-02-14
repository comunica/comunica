import type { IActorQueryOperationOutput,
  IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperationTypedMediated } from '@comunica/bus-query-operation';
import type { IActionRdfUpdateQuads, IActorRdfUpdateQuadsOutput } from '@comunica/bus-rdf-update-quads';
import type { ActionContext, Actor, IActorTest, Mediator } from '@comunica/core';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A [Query Operation](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation) actor that
 * handles SPARQL create operations.
 */
export class ActorQueryOperationCreate extends ActorQueryOperationTypedMediated<Algebra.Create> {
  public readonly mediatorUpdateQuads: Mediator<Actor<IActionRdfUpdateQuads, IActorTest, IActorRdfUpdateQuadsOutput>,
  IActionRdfUpdateQuads, IActorTest, IActorRdfUpdateQuadsOutput>;

  public constructor(args: IActorQueryOperationCreateArgs) {
    super(args, 'create');
  }

  public async testOperation(pattern: Algebra.Create, context: ActionContext): Promise<IActorTest> {
    return true;
  }

  public async runOperation(pattern: Algebra.Create, context: ActionContext):
  Promise<IActorQueryOperationOutput> {
    // Delegate to update-quads bus
    const { updateResult } = await this.mediatorUpdateQuads.mediate({
      createGraph: {
        graph: pattern.source,
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
  mediatorUpdateQuads: Mediator<Actor<IActionRdfUpdateQuads, IActorTest, IActorRdfUpdateQuadsOutput>,
  IActionRdfUpdateQuads, IActorTest, IActorRdfUpdateQuadsOutput>;
}
