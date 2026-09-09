import type {
  IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationOutput,
} from '@comunica/bus-optimize-query-operation';
import { ActorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import { Algebra, algebraUtils, isKnownOperation } from '@comunica/utils-algebra';

/**
 * A comunica Sort Limit Pushdown Optimize Query Operation Actor.
 *
 * It annotates every ORDER BY with the number of its results that a LIMIT above it will read.
 * `ORDER BY ?x LIMIT 10` otherwise materializes and sorts the whole solution sequence to return ten rows,
 * while the annotation lets it sort within a buffer of ten instead.
 */
export class ActorOptimizeQueryOperationSortLimitPushdown extends ActorOptimizeQueryOperation {
  public async test(_action: IActionOptimizeQueryOperation): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async run(action: IActionOptimizeQueryOperation): Promise<IActorOptimizeQueryOperationOutput> {
    const operation = algebraUtils.mapOperation(action.operation, {
      [Algebra.Types.SLICE]: {
        transform: (slice: Algebra.Slice) => {
          // Without a LIMIT, the number of results that will be read is unbounded
          if (slice.length === undefined) {
            return slice;
          }
          const input = ActorOptimizeQueryOperationSortLimitPushdown
            .annotate(slice.input, slice.start + slice.length);
          if (!input) {
            return slice;
          }
          const annotated: Algebra.Slice = { ...slice, input };
          return annotated;
        },
      },
    });
    return { operation, context: action.context };
  }

  /**
   * Annotate the ORDER BY that determines the first `sortLimit` results of the given operation.
   *
   * Only projections are traversed on the way down. A projection maps every input result to exactly one output
   * result in the same order, so a bound on its output is also a bound on its input.
   * The other operations that occur between a slice and its ORDER BY (DISTINCT, REDUCED, CONSTRUCT and DESCRIBE)
   * can all consume more results than they produce, so they are not traversed.
   *
   * @param operation The input of a slice, or of a projection traversed from one.
   * @param sortLimit The number of results that will be read from that operation.
   * @return The annotated operation, or undefined if there is no ORDER BY to annotate.
   */
  protected static annotate(operation: Algebra.Operation, sortLimit: number): Algebra.Operation | undefined {
    if (isKnownOperation(operation, Algebra.Types.ORDER_BY)) {
      const annotated: Algebra.OrderBy = { ...operation, metadata: { ...operation.metadata, sortLimit }};
      return annotated;
    }
    if (isKnownOperation(operation, Algebra.Types.PROJECT)) {
      const input = ActorOptimizeQueryOperationSortLimitPushdown.annotate(operation.input, sortLimit);
      if (input) {
        const annotated: Algebra.Project = { ...operation, input };
        return annotated;
      }
    }
  }
}
