import type { IActorQueryOperationOutput,
  IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperationTypedMediated } from '@comunica/bus-query-operation';
import type { ActionContext, IActorTest } from '@comunica/core';
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

  public async testOperation(pattern: Algebra.Add, context: ActionContext): Promise<IActorTest> {
    return true;
  }

  public runOperation(pattern: Algebra.Add, context: ActionContext): Promise<IActorQueryOperationOutput> {
    // CONSTRUCT all quads from the source, and INSERT them into the destination
    const destination = pattern.destination === 'DEFAULT' ? DF.defaultGraph() : pattern.destination;
    const source = pattern.source === 'DEFAULT' ? DF.defaultGraph() : pattern.source;

    const operation = this.factory.createDeleteInsert(undefined, [
      this.factory.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'), destination),
    ], this.factory.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'), source));

    return this.mediatorQueryOperation.mediate({ operation, context });
  }
}
