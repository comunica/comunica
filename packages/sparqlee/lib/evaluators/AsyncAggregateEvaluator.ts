import {BaseAggregateEvaluator} from './BaseAggregateEvaluator';
import {AsyncEvaluator, AsyncEvaluatorConfig} from './AsyncEvaluator';
import {Algebra} from 'sparqlalgebrajs';
import {Bindings} from '../Types';

export class AsyncAggregateEvaluator extends BaseAggregateEvaluator {
  private evaluator: AsyncEvaluator;
  private errorOccurred: boolean;

  constructor(expr: Algebra.AggregateExpression, config?: AsyncEvaluatorConfig, throwError?: boolean) {
    super(expr, throwError);
    this.evaluator = new AsyncEvaluator(expr.expression, config);
    this.errorOccurred = false;
  }

  put(bindings: Bindings): Promise<void> {
    return this.init(bindings);
  }

  protected async __put(bindings: Bindings): Promise<void> {
    try {
      const term = await this.evaluator.evaluate(bindings);
      this.state = this.aggregator.put(this.state, term);
    } catch (err) {
      this.safeThrow(err);
    }
  }

  protected safeThrow(err: Error): void {
    if (this.throwError) {
      throw err;
    } else {
      this.put = async () => {
        return;
      };
      this.result = () => undefined;
      this.errorOccurred = true;
    }
  }

  private async init(start: Bindings): Promise<void> {
    try {
      const startTerm = await this.evaluator.evaluate(start);
      if (!startTerm || this.errorOccurred) return;
      if (this.state) {
        // Another put already initialized this, we should just handle the put as in __put and not init anymore
        this.state = this.aggregator.put(this.state, startTerm);
        return;
      }
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
