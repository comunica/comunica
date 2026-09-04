import type { MediatorExpressionEvaluatorFactory } from '@comunica/bus-expression-evaluator-factory';
import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperationTypedMediated } from '@comunica/bus-query-operation';
import type { MediatorTermComparatorFactory } from '@comunica/bus-term-comparator-factory';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type { Bindings, IActionContext, IExpressionEvaluator, IQueryOperationResult } from '@comunica/types';
import { Algebra, isKnownSubType } from '@comunica/utils-algebra';
import { isExpressionError } from '@comunica/utils-expression-evaluator';
import { getOperationSortLimit, getSafeBindings } from '@comunica/utils-query-operation';
import type { Term } from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import { SortIterator } from './SortIterator';

/**
 * A binding annotated with the evaluation of the ORDER BY expressions, and with its position in the
 * input stream so that equal bindings keep their original order.
 */
interface IAnnotatedBindings<TResults> {
  bindings: Bindings;
  index: number;
  results: TResults;
}

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
    const { bindingsStream } = output;

    const orderByEvaluator = await this.mediatorTermComparatorFactory.mediate({ context });
    const ascending = operation.expressions.map(expr => this.isAscending(expr));
    const evaluators = await Promise.all(operation.expressions.map(expr => this.mediatorExpressionEvaluatorFactory
      .mediate({ algExpr: this.extractSortExpression(expr), context })));
    const { length } = evaluators;

    // Annotate every binding with the result of each expression, in a single pass over the stream
    let index = 0;
    const evaluate = async(evaluator: IExpressionEvaluator, bindings: Bindings): Promise<Term | undefined> => {
      try {
        return await evaluator.evaluate(bindings);
      } catch (error: unknown) {
        // We ignore all Expression errors.
        // Other errors (likely programming mistakes) are still propagated.
        // I can't recall where this is defined in the spec.
        if (!isExpressionError(<Error> error)) {
          bindingsStream.emit('error', error);
        }
      }
    };

    // Equal bindings keep their input order, which makes a bounded sort return exactly the
    // first `limit` results of an unbounded one.
    // When a LIMIT was pushed down onto this operation, only that many results have to be buffered.
    const options = { window: this.window, limit: getOperationSortLimit(operation) };
    let sortedStream: AsyncIterator<Bindings>;
    if (length === 1) {
      // Sorting on a single expression is by far the most common case, and is worth not paying for
      // an array per solution
      const [ evaluator ] = evaluators;
      const [ isAscending ] = ascending;
      const transformed = bindingsStream.transform<IAnnotatedBindings<Term | undefined>>({
        // eslint-disable-next-line ts/no-misused-promises
        transform: async(bindings, next, push) => {
          push({ bindings, index: index++, results: await evaluate(evaluator, bindings) });
          next();
        },
      });
      sortedStream = new SortIterator(transformed, (left, right) => {
        const compare = orderByEvaluator.orderTypes(left.results, right.results);
        if (compare !== 0) {
          return isAscending ? compare : -compare;
        }
        return left.index - right.index;
      }, options).map(({ bindings }) => bindings);
    } else {
      const transformed = bindingsStream.transform<IAnnotatedBindings<(Term | undefined)[]>>({
        // eslint-disable-next-line ts/no-misused-promises
        transform: async(bindings, next, push) => {
          const results: (Term | undefined)[] = Array.from({ length });
          for (let i = 0; i < length; i++) {
            results[i] = await evaluate(evaluators[i], bindings);
          }
          push({ bindings, index: index++, results });
          next();
        },
      });
      sortedStream = new SortIterator(transformed, (left, right) => {
        for (let i = 0; i < length; i++) {
          const compare = orderByEvaluator.orderTypes(left.results[i], right.results[i]);
          if (compare !== 0) {
            return ascending[i] ? compare : -compare;
          }
        }
        return left.index - right.index;
      }, options).map(({ bindings }) => bindings);
    }

    return {
      type: 'bindings',
      bindingsStream: sortedStream,
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
