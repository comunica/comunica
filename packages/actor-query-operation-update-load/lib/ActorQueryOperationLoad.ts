import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperationTypedMediated } from '@comunica/bus-query-operation';
import type { MediatorQuerySourceIdentify } from '@comunica/bus-query-source-identify';
import type { MediatorRdfUpdateQuads } from '@comunica/bus-rdf-update-quads';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import type { ComunicaDataFactory, IActionContext, IQueryOperationResult } from '@comunica/types';
import { assignOperationSource, getSafeQuads, testReadOnly } from '@comunica/utils-query-operation';
import type { Algebra } from 'sparqlalgebrajs';
import { Factory } from 'sparqlalgebrajs';

/**
 * A [Query Operation](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation) actor
 * that handles SPARQL load operations.
 */
export class ActorQueryOperationLoad extends ActorQueryOperationTypedMediated<Algebra.Load> {
  public readonly mediatorUpdateQuads: MediatorRdfUpdateQuads;
  public readonly mediatorQuerySourceIdentify: MediatorQuerySourceIdentify;

  public constructor(args: IActorQueryOperationLoadArgs) {
    super(args, 'load');
  }

  public async testOperation(operation: Algebra.Load, context: IActionContext): Promise<TestResult<IActorTest>> {
    return testReadOnly(context);
  }

  public async runOperation(operation: Algebra.Load, context: IActionContext):
  Promise<IQueryOperationResult> {
    const dataFactory: ComunicaDataFactory = context.getSafe(KeysInitQuery.dataFactory);
    const algebraFactory = new Factory(dataFactory);

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
    const output = getSafeQuads(await this.mediatorQueryOperation.mediate({
      operation: algebraFactory.createConstruct(
        assignOperationSource(
          algebraFactory.createPattern(dataFactory.variable('s'), dataFactory.variable('p'), dataFactory.variable('o')),
          querySource,
        ),
        [ algebraFactory
          .createPattern(dataFactory.variable('s'), dataFactory.variable('p'), dataFactory.variable('o')) ],
      ),
      context: subContext,
    }));

    // Determine quad stream to insert
    let quadStream = output.quadStream;
    if (operation.destination) {
      quadStream = quadStream
        .map(quad => dataFactory.quad(quad.subject, quad.predicate, quad.object, operation.destination));
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
