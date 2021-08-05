import type { Algebra } from 'sparqlalgebrajs';
import type { Bindings } from '../Types';
import type { IAsyncEvaluatorConfig } from './AsyncEvaluator';
import { AsyncEvaluator } from './AsyncEvaluator';
import { BaseAggregateEvaluator } from './BaseAggregateEvaluator';

export class AsyncAggregateEvaluator extends BaseAggregateEvaluator {
  private readonly evaluator: AsyncEvaluator;
  private errorOccurred: boolean;

  public constructor(expr: Algebra.AggregateExpression, config?: IAsyncEvaluatorConfig, throwError?: boolean) {
    super(expr, throwError);
    this.evaluator = new AsyncEvaluator(expr.expression, config);
    this.errorOccurred = false;
  }

  public put(bindings: Bindings): Promise<void> {
    return this.init(bindings);
  }

  protected async __put(bindings: Bindings): Promise<void> {
    try {
      const term = await this.evaluator.evaluate(bindings);
      this.state = this.aggregator.put(this.state, term);
    } catch (error: unknown) {
      this.safeThrow(error);
    }
  }

  protected safeThrow(err: unknown): void {
    if (this.throwError) {
      throw err;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      this.put = async() => {};
      // eslint-disable-next-line unicorn/no-useless-undefined
      this.result = () => undefined;
      this.errorOccurred = true;
    }
  }

  private async init(start: Bindings): Promise<void> {
    try {
      const startTerm = await this.evaluator.evaluate(start);
      if (!startTerm || this.errorOccurred) {
        return;
      }
      if (this.state) {
        // Another put already initialized this, we should just handle the put as in __put and not init anymore
        this.state = this.aggregator.put(this.state, startTerm);
        return;
      }
      this.state = this.aggregator.init(startTerm);
      if (this.state) {
        this.put = this.__put.bind(this);
        this.result = this.__result.bind(this);
      }
    } catch (error: unknown) {
      this.safeThrow(error);
    }
  }
}
