import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperation, ActorQueryOperationTypedMediated } from '@comunica/bus-query-operation';
import type { IActorTest } from '@comunica/core';
import type { IActionContext, IQueryOperationResult } from '@comunica/types';
import { DataFactory } from 'rdf-data-factory';
import type { Algebra } from 'sparqlalgebrajs';
import { Factory } from 'sparqlalgebrajs';

const DF = new DataFactory();

/**
 * A [Query Operation](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation) actor
 * that handles SPARQL add operations.
 */
export class ActorQueryOperationAddRewrite extends ActorQueryOperationTypedMediated<Algebra.Add> {
  private readonly factory: Factory;

  public constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'add');
    this.factory = new Factory();
  }

  public async testOperation(operation: Algebra.Add, context: IActionContext): Promise<IActorTest> {
    ActorQueryOperation.throwOnReadOnly(context);
    return true;
  }

  public runOperation(operationOriginal: Algebra.Add, context: IActionContext): Promise<IQueryOperationResult> {
    // CONSTRUCT all quads from the source, and INSERT them into the destination
    const destination = operationOriginal.destination === 'DEFAULT' ? DF.defaultGraph() : operationOriginal.destination;
    const source = operationOriginal.source === 'DEFAULT' ? DF.defaultGraph() : operationOriginal.source;

    const operation = this.factory.createDeleteInsert(undefined, [
      this.factory.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'), destination),
    ], this.factory.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'), source));

    return this.mediatorQueryOperation.mediate({ operation, context });
  }
}
