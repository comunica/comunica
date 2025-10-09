import type { MediatorExpressionEvaluatorFactory } from '@comunica/bus-expression-evaluator-factory';
import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperationTypedMediated } from '@comunica/bus-query-operation';
import type { MediatorTermComparatorFactory } from '@comunica/bus-term-comparator-factory';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type { Bindings, IActionContext, IQueryOperationResult } from '@comunica/types';
import { Algebra, isKnownSubType } from '@comunica/utils-algebra';
import { isExpressionError } from '@comunica/utils-expression-evaluator';
import { getSafeBindings } from '@comunica/utils-query-operation';
import type { Term } from '@rdfjs/types';
import { SortIterator } from './SortIterator';

/**
 * A comunica OrderBy Query Operation Actor.
 */
export class ActorQueryOperationOrderBy extends ActorQueryOperationTypedMediated<Algebra.OrderBy> {
  private readonly window: number;
  private readonly mediatorExpressionEvaluatorFactory: MediatorExpressionEvaluatorFactory;
  private readonly mediatorTermComparatorFactory: MediatorTermComparatorFactory;

  public constructor(args: IActorQueryOperationOrderBySparqleeArgs) {
    super(args, Algebra.Types.ORDER_BY);
    this.window = args.window ?? Number.POSITIVE_INFINITY;
    this.mediatorExpressionEvaluatorFactory = args.mediatorExpressionEvaluatorFactory;
    this.mediatorTermComparatorFactory = args.mediatorTermComparatorFactory;
  }

  public async testOperation(): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async runOperation(operation: Algebra.OrderBy, context: IActionContext):
  Promise<IQueryOperationResult> {
    const outputRaw = await this.mediatorQueryOperation.mediate({ operation: operation.input, context });
    const output = getSafeBindings(outputRaw);

    const options = { window: this.window };
    let { bindingsStream } = output;

    // Sorting backwards since the first one is the most important therefore should be ordered last.
    const orderByEvaluator = await this.mediatorTermComparatorFactory.mediate({ context });

    for (let i = operation.expressions.length - 1; i >= 0; i--) {
      let expr = operation.expressions[i];
      const isAscending = this.isAscending(expr);
      expr = this.extractSortExpression(expr);
      // Transform the stream by annotating it with the expr result
      const evaluator = await this.mediatorExpressionEvaluatorFactory
        .mediate({ algExpr: expr, context });
      interface IAnnotatedBinding {
        bindings: Bindings;
        result: Term | undefined;
      }

      const transform = async(bindings: Bindings, next: any, push: (result: IAnnotatedBinding) => void):
      Promise<void> => {
        try {
          const result = await evaluator.evaluate(bindings);
          push({ bindings, result });
        } catch (error: unknown) {
          // We ignore all Expression errors.
          // Other errors (likely programming mistakes) are still propagated.
          // I can't recall where this is defined in the spec.
          if (!isExpressionError(<Error> error)) {
            bindingsStream.emit('error', error);
          }
          push({ bindings, result: undefined });
        }
        next();
      };
      // eslint-disable-next-line ts/no-misused-promises
      const transformedStream = bindingsStream.transform<IAnnotatedBinding>({ transform });

      // Sort the annoted stream
      const sortedStream = new SortIterator(transformedStream, (left, right) => {
        let compare = orderByEvaluator.orderTypes(left.result, right.result);
        if (!isAscending) {
          compare *= -1;
        }
        return compare;
      }, options);

      // Remove the annotation
      bindingsStream = sortedStream.map(({ bindings }) => bindings);
    }

    return {
      type: 'bindings',
      bindingsStream,
      metadata: output.metadata,
    };
  }

  // Remove descending operator if necessary
  private extractSortExpression(expr: Algebra.Expression): Algebra.Expression {
    if (isKnownSubType(expr, Algebra.ExpressionTypes.OPERATOR)) {
      return expr.operator === 'desc' ?
        expr.args[0] :
        expr;
    }
    return expr;
  }

  private isAscending(expr: Algebra.Expression): boolean {
    if (isKnownSubType(expr, Algebra.ExpressionTypes.OPERATOR)) {
      return expr.operator !== 'desc';
    }
    return true;
  }
}

/**
 * The window parameter determines how many of the elements to consider when sorting.
 */
export interface IActorQueryOperationOrderBySparqleeArgs extends IActorQueryOperationTypedMediatedArgs {
  /**
   * The size of the window for the sort iterator.
   * @range {integer}
   */
  window?: number;
  mediatorExpressionEvaluatorFactory: MediatorExpressionEvaluatorFactory;
  mediatorTermComparatorFactory: MediatorTermComparatorFactory;
}
