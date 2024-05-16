import type {
  IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationOutput,
  IActorOptimizeQueryOperationArgs,
} from '@comunica/bus-optimize-query-operation';
import { ActorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import type { IActorTest } from '@comunica/core';
import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';
import { Algebra, Util } from 'sparqlalgebrajs';

const DF = new DataFactory<RDF.BaseQuad>();

/**
 * A comunica Rewrite Add Optimize Query Operation Actor.
 */
export class ActorOptimizeQueryOperationRewriteAdd extends ActorOptimizeQueryOperation {
  public constructor(args: IActorOptimizeQueryOperationArgs) {
    super(args);
  }

  public async test(_action: IActionOptimizeQueryOperation): Promise<IActorTest> {
    return true;
  }

  public async run(action: IActionOptimizeQueryOperation): Promise<IActorOptimizeQueryOperationOutput> {
    const operation = Util.mapOperation(action.operation, {
      [Algebra.types.ADD](operationOriginal, factory) {
        // CONSTRUCT all quads from the source, and INSERT them into the destination
        const destination = operationOriginal.destination === 'DEFAULT' ?
          DF.defaultGraph() :
          operationOriginal.destination;
        const source = operationOriginal.source === 'DEFAULT' ? DF.defaultGraph() : operationOriginal.source;

        const result = factory.createDeleteInsert(undefined, [
          factory.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'), destination),
        ], factory.createPattern(DF.variable('s'), DF.variable('p'), DF.variable('o'), source));

        return {
          result,
          recurse: false,
        };
      },
    });

    return { operation, context: action.context };
  }
}
