import {Algebra} from 'sparqlalgebrajs';
import {Bindings} from '../Types';
import {SyncEvaluator, SyncEvaluatorConfig} from './SyncEvaluator';
import {BaseAggregateEvaluator} from './BaseAggregateEvaluator';

// TODO: Support hooks & change name to SyncAggregateEvaluator
export class AggregateEvaluator extends BaseAggregateEvaluator{
  private evaluator: SyncEvaluator;

  constructor(expr: Algebra.AggregateExpression, config?: SyncEvaluatorConfig, throwError?: boolean) {
    super(expr, throwError);
    this.evaluator = new SyncEvaluator(expr.expression, config);
  }

  put(bindings: Bindings): void {
    this.init(bindings);
  }

  protected __put(bindings: Bindings): void {
    try {
      const term = this.evaluator.evaluate(bindings);
      this.state = this.aggregator.put(this.state, term);
    } catch (err) {
      this.safeThrow(err);
    }
  }

  protected safeThrow(err: Error): void {
    if (this.throwError) {
      throw err;
    } else {
      this.put = () => { return; };
      this.result = () => undefined;
    }
  }

  private init(start: Bindings): void {
    try {
      const startTerm = this.evaluator.evaluate(start);
      this.state = this.aggregator.init(startTerm);
      if (this.state) {
        this.put = this.__put;
        this.result = this.__result;
      }
    } catch (err) {
      this.safeThrow(err);
    }
  }
}

