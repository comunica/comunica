import type {
  IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationOutput,
  IActorOptimizeQueryOperationArgs,
} from '@comunica/bus-optimize-query-operation';
import { ActorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import type { TestResult, IActorTest } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type { ComunicaDataFactory } from '@comunica/types';
import { getExpressionVariables } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';
import type { Algebra } from 'sparqlalgebrajs';
import { Factory, Util } from 'sparqlalgebrajs';

/**
 * A comunica LeftJoin Expression Pushdown Optimize Query Operation Actor.
 */
export class ActorOptimizeQueryOperationLeftjoinExpressionPushdown extends ActorOptimizeQueryOperation {
  public constructor(args: IActorOptimizeQueryOperationArgs) {
    super(args);
  }

  public async test(_action: IActionOptimizeQueryOperation): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async run(action: IActionOptimizeQueryOperation): Promise<IActorOptimizeQueryOperationOutput> {
    const dataFactory: ComunicaDataFactory = action.context.getSafe(KeysInitQuery.dataFactory);
    const algebraFactory = new Factory(dataFactory);
    let operation: Algebra.Operation = action.operation;

    // eslint-disable-next-line ts/no-this-alias
    const self = this;
    operation = Util.mapOperation(operation, {
      leftjoin(op: Algebra.LeftJoin, factory: Factory) {
        // Try to push the expression to either the left or right if it exclusively overlaps with just one of them.
        if (op.expression) {
          const variablesExpression = getExpressionVariables(op.expression);
          const variablesLeft = Util.inScopeVariables(op.input[0]);
          const variablesRight = Util.inScopeVariables(op.input[1]);
          const intersectLeft = self.variablesIntersect(variablesExpression, variablesLeft);
          const intersectRight = self.variablesIntersect(variablesExpression, variablesRight);
          if (intersectLeft && !intersectRight) {
            self.logDebug(action.context, `Pushed down optional expression to left-hand operator`);
            return {
              recurse: true,
              result: factory.createLeftJoin(
                factory.createFilter(op.input[0], op.expression),
                op.input[1],
              ),
            };
          }
          if (!intersectLeft && intersectRight) {
            self.logDebug(action.context, `Pushed down optional expression to right-hand operator`);
            return {
              recurse: true,
              result: factory.createLeftJoin(
                op.input[0],
                factory.createFilter(op.input[1], op.expression),
              ),
            };
          }
        }

        return {
          recurse: true,
          result: op,
        };
      },
    }, algebraFactory);

    return { operation, context: action.context };
  }

  /**
   * Check if there is an overlap between the two given lists of variables.
   * @param varsA A list of variables.
   * @param varsB A list of variables.
   */
  public variablesIntersect(varsA: RDF.Variable[], varsB: RDF.Variable[]): boolean {
    return varsA.some(varA => varsB.some(varB => varA.equals(varB)));
  }
}
