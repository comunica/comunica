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
import { Algebra, AlgebraFactory, algebraUtils } from '@comunica/utils-algebra';
import { getExpressionVariables } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';

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
    const algebraFactory = new AlgebraFactory(dataFactory);
    let operation: Algebra.Operation = action.operation;

    // eslint-disable-next-line ts/no-this-alias
    const self = this;
    // TODO: pass algebraFactory when traqula supports this.
    operation = algebraUtils.mapOperation(operation, {
      [Algebra.Types.LEFT_JOIN]: {
        transform: (op: Algebra.LeftJoin) => {
          // Try to push the expression to either the left or right if it exclusively overlaps with just one of them.
          if (op.expression) {
            const variablesExpression = getExpressionVariables(op.expression);
            const variablesLeft = algebraUtils.inScopeVariables(op.input[0]);
            const variablesRight = algebraUtils.inScopeVariables(op.input[1]);
            const intersectLeft = self.variablesIntersect(variablesExpression, variablesLeft);
            const intersectRight = self.variablesIntersect(variablesExpression, variablesRight);
            if (intersectLeft && !intersectRight) {
              self.logDebug(action.context, `Pushed down optional expression to left-hand operator`);
              return algebraFactory.createLeftJoin(
                algebraFactory.createFilter(op.input[0], op.expression),
                op.input[1],
              );
            }
            if (!intersectLeft && intersectRight) {
              self.logDebug(action.context, `Pushed down optional expression to right-hand operator`);
              return algebraFactory.createLeftJoin(
                op.input[0],
                algebraFactory.createFilter(op.input[1], op.expression),
              );
            }
          }

          return op;
        },
      },
    });

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
