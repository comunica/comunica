import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperation, ActorQueryOperationTypedMediated } from '@comunica/bus-query-operation';
import type {
  MediatorRdfUpdateQuads,
} from '@comunica/bus-rdf-update-quads';
import type { IActorTest } from '@comunica/core';
import type { IActionContext, IQueryOperationResult } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import type { Algebra } from 'sparqlalgebrajs';

const DF = new DataFactory();

/**
 * A [Query Operation](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation) actor
 * that handles SPARQL clear operations.
 */
export class ActorQueryOperationClear extends ActorQueryOperationTypedMediated<Algebra.Clear> {
  public readonly mediatorUpdateQuads: MediatorRdfUpdateQuads;

  public constructor(args: IActorQueryOperationClearArgs) {
    super(args, 'clear');
  }

  public async testOperation(operation: Algebra.Clear, context: IActionContext): Promise<IActorTest> {
    ActorQueryOperation.throwOnReadOnly(context);
    return true;
  }

  public async runOperation(operation: Algebra.Clear, context: IActionContext):
  Promise<IQueryOperationResult> {
    // Delegate to update-quads bus
    let graphs: RDF.DefaultGraph | 'NAMED' | 'ALL' | RDF.NamedNode[];
    if (operation.source === 'DEFAULT') {
      graphs = DF.defaultGraph();
    } else if (typeof operation.source === 'string') {
      graphs = operation.source;
    } else {
      graphs = [ operation.source ];
    }
    const { execute } = await this.mediatorUpdateQuads.mediate({
      deleteGraphs: {
        graphs,
        requireExistence: !operation.silent,
        dropGraphs: false,
      },
      context,
    });

    return {
      type: 'void',
      execute,
    };
  }
}

export interface IActorQueryOperationClearArgs extends IActorQueryOperationTypedMediatedArgs {
  /**
   * The RDF Update Quads mediator
   */
  mediatorUpdateQuads: MediatorRdfUpdateQuads;
}
