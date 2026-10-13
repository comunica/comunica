import type {
  IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationOutput,
} from '@comunica/bus-optimize-query-operation';
import { ActorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import { Algebra, algebraUtils, isKnownOperation } from '@comunica/utils-algebra';

/**
 * A comunica Annotate Union Order Optimize Query Operation Actor.
 *
 * It annotates every union that is an input of a join with `orderUseful`: the names of the variables that it shares
 * with the other inputs of that join. A union whose inputs are sorted on one of them can emit its bindings in that
 * order, so that a merge join can join it. Elsewhere, keeping that order would only cost time.
 */
export class ActorOptimizeQueryOperationAnnotateUnionOrder extends ActorOptimizeQueryOperation {
  public async test(_action: IActionOptimizeQueryOperation): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async run(action: IActionOptimizeQueryOperation): Promise<IActorOptimizeQueryOperationOutput> {
    const operation = algebraUtils.mapOperation(action.operation, {
      [Algebra.Types.JOIN]: {
        transform: (join: Algebra.Join) => ActorOptimizeQueryOperationAnnotateUnionOrder.annotate(join),
      },
    });
    return { operation, context: action.context };
  }

  /**
   * Annotate the unions among the inputs of a join with the variables they share with its other inputs.
   * @param join A join.
   * @return The join with annotated inputs.
   */
  public static annotate(join: Algebra.Join): Algebra.Join {
    if (!join.input.some(input => isKnownOperation(input, Algebra.Types.UNION))) {
      return join;
    }
    const variables = join.input.map(input => algebraUtils.inScopeVariables(input).map(variable => variable.value));
    const input = join.input.map((operation, index) => {
      if (!isKnownOperation(operation, Algebra.Types.UNION)) {
        return operation;
      }
      const others = new Set(variables.flatMap((entry, otherIndex) => otherIndex === index ? [] : entry));
      const orderUseful = variables[index].filter(variable => others.has(variable));
      if (orderUseful.length === 0) {
        return operation;
      }
      const annotated: Algebra.Union = { ...operation, metadata: { ...operation.metadata, orderUseful }};
      return annotated;
    });
    return { ...join, input };
  }
}
