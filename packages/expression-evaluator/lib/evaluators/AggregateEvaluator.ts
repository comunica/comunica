import type { ComunicaDataFactory } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import type { Algebra } from 'sparqlalgebrajs';
import { BaseAggregateEvaluator } from './evaluatorHelpers/BaseAggregateEvaluator';
import type { ISyncEvaluatorContext } from './SyncEvaluator';
import { SyncEvaluator } from './SyncEvaluator';

// TODO: Support hooks & change name to SyncAggregateEvaluator
export class AggregateEvaluator extends BaseAggregateEvaluator {
  private readonly evaluator: SyncEvaluator;

  public constructor(
    expr: Algebra.AggregateExpression,
    dataFactory: ComunicaDataFactory,
    context?: ISyncEvaluatorContext,
    throwError?: boolean,
  ) {
    super(expr, SyncEvaluator.completeContext(context ?? { dataFactory }), throwError);
    this.evaluator = new SyncEvaluator(dataFactory, expr.expression, context);
  }

  public put(bindings: RDF.Bindings): void {
    if (this.errorOccurred) {
      return;
    }
    if (this.isWildcard) {
      this.wildcardAggregator!.putBindings(bindings);
    } else {
      try {
        const startTerm = this.evaluator.evaluate(bindings);
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
