import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperation, ActorQueryOperationTypedMediated } from '@comunica/bus-query-operation';
import type { MediatorQuerySourceIdentify } from '@comunica/bus-query-source-identify';
import type { MediatorRdfUpdateQuads } from '@comunica/bus-rdf-update-quads';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest } from '@comunica/core';
import type { IActionContext, IQueryOperationResult } from '@comunica/types';
import { DataFactory } from 'rdf-data-factory';
import type { Algebra } from 'sparqlalgebrajs';
import { Factory } from 'sparqlalgebrajs';

const DF = new DataFactory();

/**
 * A [Query Operation](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation) actor
 * that handles SPARQL load operations.
 */
export class ActorQueryOperationLoad extends ActorQueryOperationTypedMediated<Algebra.Load> {
  public readonly mediatorUpdateQuads: MediatorRdfUpdateQuads;
  public readonly mediatorQuerySourceIdentify: MediatorQuerySourceIdentify;

  private readonly factory: Factory;
  private readonly constructOperation: Algebra.Construct;

  public constructor(args: IActorQueryOperationLoadArgs) {
    super(args, 'load');
    this.factory = new Factory();
  }

  public async testOperation(operation: Algebra.Load, context: IActionContext): Promise<IActorTest> {
    ActorQueryOperation.throwOnReadOnly(context);
    return true;
  }

  public async runOperation(operation: Algebra.Load, context: IActionContext):
  Promise<IQueryOperationResult> {
    // Determine query source
    let subContext = context;
    if (operation.silent) {
      subContext = subContext.set(KeysInitQuery.lenient, true);
    }
    const { querySource } = await this.mediatorQuerySourceIdentify.mediate({
      querySourceUnidentified: { value: operation.source.value },
      context: subContext,
    });

    // Create CONSTRUCT query on the given source
    const output = ActorQueryOperationLoad.getSafeQuads(await this.mediatorQueryOperation.mediate({
      operation: this.factory.createConstruct(
        ActorQueryOperation.assignOperationSource(
          this.factory.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o')),
          querySource,
        ),
        [ this.factory.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o')) ],
      ),
      context: subContext,
    }));

    // Determine quad stream to insert
    let quadStream = output.quadStream;
    if (operation.destination) {
      quadStream = quadStream.map(quad => DF.quad(quad.subject, quad.predicate, quad.object, operation.destination));
    }

    // Insert quad stream
    const { execute } = await this.mediatorUpdateQuads.mediate({
      quadStreamInsert: quadStream,
      context,
    });

    return {
      type: 'void',
      execute,
    };
  }
}

export interface IActorQueryOperationLoadArgs extends IActorQueryOperationTypedMediatedArgs {
  /**
   * The RDF Update Quads mediator
   */
  mediatorUpdateQuads: MediatorRdfUpdateQuads;
  /**
   * Mediator for identifying load sources.
   */
  mediatorQuerySourceIdentify: MediatorQuerySourceIdentify;
}
