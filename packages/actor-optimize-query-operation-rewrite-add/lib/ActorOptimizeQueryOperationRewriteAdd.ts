import type {
  IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationOutput,
  IActorOptimizeQueryOperationArgs,
} from '@comunica/bus-optimize-query-operation';
import { ActorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type { ComunicaDataFactory } from '@comunica/types';
import { Algebra, AlgebraFactory, algebraUtils } from '@comunica/utils-algebra';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';

const DF = new DataFactory<RDF.BaseQuad>();

/**
 * A comunica Rewrite Add Optimize Query Operation Actor.
 */
export class ActorOptimizeQueryOperationRewriteAdd extends ActorOptimizeQueryOperation {
  public constructor(args: IActorOptimizeQueryOperationArgs) {
    super(args);
  }

  public async test(_action: IActionOptimizeQueryOperation): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async run(action: IActionOptimizeQueryOperation): Promise<IActorOptimizeQueryOperationOutput> {
    const dataFactory: ComunicaDataFactory = action.context.getSafe(KeysInitQuery.dataFactory);
    const factory = new AlgebraFactory(dataFactory);

    const operation = algebraUtils.mapOperation(action.operation, {
      [Algebra.Types.ADD]: {
        preVisitor: () => ({ shortcut: true }),
        transform: (operationOriginal) => {
          // CONSTRUCT all quads from the source, and INSERT them into the destination
          const destination = operationOriginal.destination === 'DEFAULT' ?
            DF.defaultGraph() :
            operationOriginal.destination;
          const source = operationOriginal.source === 'DEFAULT' ? DF.defaultGraph() : operationOriginal.source;

          return factory.createDeleteInsert(undefined, [
            factory.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'), destination),
          ], factory.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'), source));
        },
      },
    });

    return { operation, context: action.context };
  }
}
