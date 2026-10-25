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
 *
 * Unions below operators that keep the order of their input, such as filters and projections, and unions within
 * such unions, are annotated as well.
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
    const variables = join.input.map(input => algebraUtils.inScopeVariables(input).map(variable => variable.value));
    const input = join.input.map((operation, index) => {
      const others = new Set(variables.flatMap((entry, otherIndex) => otherIndex === index ? [] : entry));
      return ActorOptimizeQueryOperationAnnotateUnionOrder
        .annotateOrderPreserving(operation, variables[index].filter(variable => others.has(variable)));
    });
    return { ...join, input };
  }

  /**
   * Annotate the unions in an operation that pass their order on to its output.
   * Operators that keep the order of their input are descended into, as are the inputs of a union.
   * @param operation An operation.
   * @param shared The names of the variables that the order of the output can be useful for.
   * @return The operation with annotated unions.
   */
  public static annotateOrderPreserving(operation: Algebra.Operation, shared: string[]): Algebra.Operation {
    if (shared.length === 0) {
      return operation;
    }
    if (isKnownOperation(operation, Algebra.Types.UNION)) {
      const inScope = new Set(algebraUtils.inScopeVariables(operation).map(variable => variable.value));
      const orderUseful = shared.filter(variable => inScope.has(variable));
      if (orderUseful.length === 0) {
        return operation;
      }
      const annotated: Algebra.Union = {
        ...operation,
        input: operation.input
          .map(input => ActorOptimizeQueryOperationAnnotateUnionOrder.annotateOrderPreserving(input, orderUseful)),
        metadata: { ...operation.metadata, orderUseful },
      };
      return annotated;
    }
    if (isKnownOperation(operation, Algebra.Types.PROJECT)) {
      const projected = new Set(operation.variables.map(variable => variable.value));
      const project: Algebra.Project = {
        ...operation,
        input: ActorOptimizeQueryOperationAnnotateUnionOrder
          .annotateOrderPreserving(operation.input, shared.filter(variable => projected.has(variable))),
      };
      return project;
    }
    if (isKnownOperation(operation, Algebra.Types.FILTER) ||
      isKnownOperation(operation, Algebra.Types.EXTEND) ||
      isKnownOperation(operation, Algebra.Types.DISTINCT) ||
      isKnownOperation(operation, Algebra.Types.REDUCED) ||
      isKnownOperation(operation, Algebra.Types.SLICE)) {
      const wrapper: typeof operation = {
        ...operation,
        input: ActorOptimizeQueryOperationAnnotateUnionOrder.annotateOrderPreserving(operation.input, shared),
      };
      return wrapper;
    }
    return operation;
  }
}
