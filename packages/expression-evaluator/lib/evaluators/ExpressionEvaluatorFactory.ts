import type { IAggregator, MediatorExpressionEvaluatorAggregate } from '@comunica/bus-expression-evaluator-aggregate';
import type { IActionContext } from '@comunica/types';
import type { Algebra as Alg } from 'sparqlalgebrajs';
import type { IAsyncEvaluatorContext } from './ExpressionEvaluator';
import { ExpressionEvaluator } from './ExpressionEvaluator';

export class ExpressionEvaluatorFactory {
  public readonly mediatorExpressionEvaluatorAggregate: MediatorExpressionEvaluatorAggregate;

  public constructor(args: IExpressionEvaluatorFactoryArgs) {
    this.mediatorExpressionEvaluatorAggregate = args.mediatorExpressionEvaluatorAggregate;
  }

  public createEvaluator(algExpr: Alg.Expression, context: IAsyncEvaluatorContext): ExpressionEvaluator {
    return new ExpressionEvaluator(algExpr, context, this);
  }

  public async createAggregator(algExpr: Alg.AggregateExpression, context: IActionContext): Promise<IAggregator> {
    return (await this.mediatorExpressionEvaluatorAggregate.mediate({
      expr: algExpr,
      factory: this,
      context,
    })).aggregator;
  }
}

interface IExpressionEvaluatorFactoryArgs {
  mediatorExpressionEvaluatorAggregate: MediatorExpressionEvaluatorAggregate;
}
