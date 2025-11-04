import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperationTypedMediated } from '@comunica/bus-query-operation';
import type {
  MediatorRdfUpdateQuads,
} from '@comunica/bus-rdf-update-quads';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import type { ComunicaDataFactory, IActionContext, IQueryOperationResult } from '@comunica/types';
import { Algebra } from '@comunica/utils-algebra';
import { testReadOnly } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';

/**
 * A [Query Operation](https://github.com/comunica/comunica/tree/master/packages/bus-query-operation) actor
 * that handles SPARQL clear operations.
 */
export class ActorQueryOperationClear extends ActorQueryOperationTypedMediated<Algebra.Clear> {
  public readonly mediatorUpdateQuads: MediatorRdfUpdateQuads;

  public constructor(args: IActorQueryOperationClearArgs) {
    super(args, Algebra.Types.CLEAR);
    this.mediatorUpdateQuads = args.mediatorUpdateQuads;
  }

  public async testOperation(operation: Algebra.Clear, context: IActionContext): Promise<TestResult<IActorTest>> {
    return testReadOnly(context);
  }

  public async runOperation(operation: Algebra.Clear, context: IActionContext):
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
