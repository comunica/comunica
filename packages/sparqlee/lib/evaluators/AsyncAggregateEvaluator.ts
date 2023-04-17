import type * as RDF from '@rdfjs/types';
import type { Algebra } from 'sparqlalgebrajs';
import type { IAsyncEvaluatorContext } from './AsyncEvaluator';
import { AsyncEvaluator } from './AsyncEvaluator';
import { BaseAggregateEvaluator } from './evaluatorHelpers/BaseAggregateEvaluator';

export class AsyncAggregateEvaluator extends BaseAggregateEvaluator {
  private readonly evaluator: AsyncEvaluator;

  public constructor(expr: Algebra.AggregateExpression, context?: IAsyncEvaluatorContext, throwError?: boolean) {
    super(expr, AsyncEvaluator.completeContext(context || {}), throwError);
    this.evaluator = new AsyncEvaluator(expr.expression, context);
    this.errorOccurred = false;
  }

  public async put(bindings: RDF.Bindings): Promise<void> {
    if (this.errorOccurred) {
      return;
    }
    if (this.isWildcard) {
      this.wildcardAggregator!.putBindings(bindings);
    } else {
      try {
        const startTerm = await this.evaluator.evaluate(bindings);
        if (!startTerm || this.errorOccurred) {
          return;
        }
        this.aggregator.put(startTerm);
      } catch (error: unknown) {
        this.safeThrow(error);
      }
    }
  }

  protected safeThrow(err: unknown): void {
    if (this.throwError) {
      throw err;
    } else {
      this.errorOccurred = true;
    }
  }
}
