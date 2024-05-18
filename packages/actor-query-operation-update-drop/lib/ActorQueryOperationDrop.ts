import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperation, ActorQueryOperationTypedMediated } from '@comunica/bus-query-operation';
import type { MediatorRdfUpdateQuads } from '@comunica/bus-rdf-update-quads';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest } from '@comunica/core';
import type { ComunicaDataFactory, IActionContext, IQueryOperationResult } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A [Query Operation](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation) actor
 * that handles SPARQL drop operations.
 */
export class ActorQueryOperationDrop extends ActorQueryOperationTypedMediated<Algebra.Drop> {
  public readonly mediatorUpdateQuads: MediatorRdfUpdateQuads;

  public constructor(args: IActorQueryOperationDropArgs) {
    super(args, 'drop');
  }

  public async testOperation(operation: Algebra.Drop, context: IActionContext): Promise<IActorTest> {
    ActorQueryOperation.throwOnReadOnly(context);
    return true;
  }

  public async runOperation(operation: Algebra.Drop, context: IActionContext):
  Promise<IQueryOperationResult> {
    const dataFactory: ComunicaDataFactory = context.getSafe(KeysInitQuery.dataFactory);

    // Delegate to update-quads bus
    let graphs: RDF.DefaultGraph | 'NAMED' | 'ALL' | RDF.NamedNode[];
    if (operation.source === 'DEFAULT') {
      graphs = dataFactory.defaultGraph();
    } else if (typeof operation.source === 'string') {
      graphs = operation.source;
    } else {
      graphs = [ operation.source ];
    }
    const { execute } = await this.mediatorUpdateQuads.mediate({
      deleteGraphs: {
        graphs,
        requireExistence: !operation.silent,
        dropGraphs: true,
      },
      context,
    });

    return {
      type: 'void',
      execute,
    };
  }
}

export interface IActorQueryOperationDropArgs extends IActorQueryOperationTypedMediatedArgs {
  /**
   * The RDF Update Quads mediator
   */
  mediatorUpdateQuads: MediatorRdfUpdateQuads;
}
