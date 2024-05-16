import { BindingsFactory } from '@comunica/bindings-factory';
import type { MediatorMergeBindingsContext } from '@comunica/bus-merge-bindings-context';
import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import {
  ActorQueryOperation,
  ActorQueryOperationTypedMediated,
} from '@comunica/bus-query-operation';
import type { IActorTest } from '@comunica/core';
import { AsyncEvaluator, isExpressionError, orderTypes } from '@comunica/expression-evaluator';
import type { Bindings, IActionContext, IQueryOperationResult } from '@comunica/types';
import type { Term } from '@rdfjs/types';
import { Algebra } from 'sparqlalgebrajs';
import { SortIterator } from './SortIterator';

/**
 * A comunica OrderBy Sparqlee Query Operation Actor.
 */
export class ActorQueryOperationOrderBy extends ActorQueryOperationTypedMediated<Algebra.OrderBy> {
  private readonly window: number;
  public readonly mediatorMergeBindingsContext: MediatorMergeBindingsContext;

  public constructor(args: IActorQueryOperationOrderBySparqleeArgs) {
    super(args, 'orderby');
    this.window = args.window ?? Number.POSITIVE_INFINITY;
  }

  public async testOperation(operation: Algebra.OrderBy, context: IActionContext): Promise<IActorTest> {
    // Will throw error for unsupported operators
    const bindingsFactory = await BindingsFactory.create(this.mediatorMergeBindingsContext, context);

    for (let expr of operation.expressions) {
      expr = this.extractSortExpression(expr);
      const _ = new AsyncEvaluator(
        expr,
        ActorQueryOperation.getAsyncExpressionContext(context, this.mediatorQueryOperation, bindingsFactory),
      );
    }
    return true;
  }

  public async runOperation(operation: Algebra.OrderBy, context: IActionContext):
  Promise<IQueryOperationResult> {
    const outputRaw = await this.mediatorQueryOperation.mediate({ operation: operation.input, context });
    const output = ActorQueryOperation.getSafeBindings(outputRaw);

    const options = { window: this.window };
    const bindingsFactory = await BindingsFactory.create(this.mediatorMergeBindingsContext, context);
    const sparqleeConfig = {
      ...ActorQueryOperation.getAsyncExpressionContext(context, this.mediatorQueryOperation, bindingsFactory),
    };
    let { bindingsStream } = output;

    // Sorting backwards since the first one is the most important therefore should be ordered last.
    for (let i = operation.expressions.length - 1; i >= 0; i--) {
      let expr = operation.expressions[i];
      const isAscending = this.isAscending(expr);
      expr = this.extractSortExpression(expr);
      // Transform the stream by annotating it with the expr result
      const evaluator = new AsyncEvaluator(expr, sparqleeConfig);
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
        let compare = orderTypes(left.result, right.result);
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
    const { expressionType, operator } = expr;
    if (expressionType !== Algebra.expressionTypes.OPERATOR) {
      return expr;
    }
    return operator === 'desc' ?
      expr.args[0] :
      expr;
  }

  private isAscending(expr: Algebra.Expression): boolean {
    const { expressionType, operator } = expr;
    if (expressionType !== Algebra.expressionTypes.OPERATOR) {
      return true;
    }
    return operator !== 'desc';
  }
}

/**
 * The window parameter determines how many of the elements to consider when sorting.
 */
export interface IActorQueryOperationOrderBySparqleeArgs extends IActorQueryOperationTypedMediatedArgs {
  /**
   * A mediator for creating binding context merge handlers
   */
  mediatorMergeBindingsContext: MediatorMergeBindingsContext;
  /**
   * The size of the window for the sort iterator.
   * @range {integer}
   */
  window?: number;
}
