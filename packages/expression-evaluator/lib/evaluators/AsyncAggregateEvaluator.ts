import type { ComunicaDataFactory } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { Algebra } from 'sparqlalgebrajs';
import type { IAsyncEvaluatorContext } from './AsyncEvaluator.js';
import { AsyncEvaluator } from './AsyncEvaluator.js';
import { BaseAggregateEvaluator } from './evaluatorHelpers/BaseAggregateEvaluator.js';

export class AsyncAggregateEvaluator extends BaseAggregateEvaluator {
  private readonly evaluator: AsyncEvaluator;

  public constructor(
    expr: Algebra.AggregateExpression,
    public dataFactory: ComunicaDataFactory,
    context?: IAsyncEvaluatorContext,
    throwError?: boolean,
  ) {
    super(expr, AsyncEvaluator.completeContext(context ?? { dataFactory }), throwError);
    this.evaluator = new AsyncEvaluator(dataFactory, expr.expression, context);
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
