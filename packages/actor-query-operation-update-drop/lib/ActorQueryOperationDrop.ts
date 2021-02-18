import type { IActorQueryOperationOutput,
  IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperation, ActorQueryOperationTypedMediated } from '@comunica/bus-query-operation';
import type { IActionRdfUpdateQuads, IActorRdfUpdateQuadsOutput } from '@comunica/bus-rdf-update-quads';
import type { ActionContext, Actor, IActorTest, Mediator } from '@comunica/core';
import { DataFactory } from 'rdf-data-factory';
import type { Algebra } from 'sparqlalgebrajs';

const DF = new DataFactory();

/**
 * A [Query Operation](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation) actor
 * that handles SPARQL drop operations.
 */
export class ActorQueryOperationDrop extends ActorQueryOperationTypedMediated<Algebra.Drop> {
  public readonly mediatorUpdateQuads: Mediator<Actor<IActionRdfUpdateQuads, IActorTest, IActorRdfUpdateQuadsOutput>,
  IActionRdfUpdateQuads, IActorTest, IActorRdfUpdateQuadsOutput>;

  public constructor(args: IActorQueryOperationDropArgs) {
    super(args, 'drop');
  }

  public async testOperation(pattern: Algebra.Drop, context: ActionContext): Promise<IActorTest> {
    ActorQueryOperation.throwOnReadOnly(context);
    return true;
  }

  public async runOperation(pattern: Algebra.Drop, context: ActionContext):
  Promise<IActorQueryOperationOutput> {
    // Delegate to update-quads bus
    const { updateResult } = await this.mediatorUpdateQuads.mediate({
      deleteGraphs: {
        graphs: pattern.source === 'DEFAULT' ? DF.defaultGraph() : pattern.source,
        requireExistence: !pattern.silent,
        dropGraphs: true,
      },
      context,
    });

    return {
      type: 'update',
      updateResult,
    };
  }
}

export interface IActorQueryOperationDropArgs extends IActorQueryOperationTypedMediatedArgs {
  mediatorUpdateQuads: Mediator<Actor<IActionRdfUpdateQuads, IActorTest, IActorRdfUpdateQuadsOutput>,
  IActionRdfUpdateQuads, IActorTest, IActorRdfUpdateQuadsOutput>;
}
