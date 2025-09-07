import type { MediatorFunctionFactory } from '@comunica/bus-function-factory';
import { KeysExpressionEvaluator } from '@comunica/context-entries';
import type { Expression, IActionContext, OperatorExpression } from '@comunica/types';
import * as ExprEval from '@comunica/utils-expression-evaluator';
import { Algebra as Alg } from '@traqula/algebra-transformations-1-1';

export class AlgebraTransformer extends ExprEval.TermTransformer {
  public constructor(
    private readonly context: IActionContext,
    private readonly mediatorFunctionFactory: MediatorFunctionFactory,
  ) {
    super(context.getSafe(KeysExpressionEvaluator.superTypeProvider));
  }

  public async transformAlgebra(expr: Alg.Expression): Promise<Expression> {
    const types = Alg.ExpressionTypes;

    switch (expr.expressionType) {
      case types.TERM:
        return this.transformTerm(expr);
      case types.OPERATOR:
        return await this.transformOperator(expr);
      case types.NAMED:
        return await this.transformNamed(expr);
      case types.EXISTENCE:
        return AlgebraTransformer.transformExistence(expr);
      case types.AGGREGATE:
        return AlgebraTransformer.transformAggregate(expr);
      case types.WILDCARD:
        return AlgebraTransformer.transformWildcard(expr);
    }
  }

  private static transformWildcard(_term: Alg.WildcardExpression): Expression {
    return new ExprEval.NamedNode('*');
  }

  private async getOperator(operator: string, expr: Alg.OperatorExpression | Alg.NamedExpression):
  Promise<OperatorExpression> {
    const operatorFunc = await this.mediatorFunctionFactory.mediate({
      functionName: operator,
      arguments: expr.args,
      context: this.context,
    });
    const operatorArgs = await Promise.all(expr.args.map(arg => this.transformAlgebra(arg)));
    if (!operatorFunc.checkArity(operatorArgs)) {
      throw new ExprEval.InvalidArity(operatorArgs, operator);
    }
    return new ExprEval.Operator(operator, operatorArgs, operatorFunc.apply);
  }

  private async transformOperator(expr: Alg.OperatorExpression): Promise<OperatorExpression> {
    return this.getOperator(expr.operator.toLowerCase(), expr);
  }

  private async transformNamed(expr: Alg.NamedExpression): Promise<OperatorExpression> {
    return this.getOperator(expr.name.value, expr);
  }

  public static transformAggregate(expr: Alg.AggregateExpression): ExprEval.Aggregate {
    const name = expr.aggregator;
    return new ExprEval.Aggregate(name, expr);
  }

  public static transformExistence(expr: Alg.ExistenceExpression): ExprEval.Existence {
    return new ExprEval.Existence(expr);
  }
}
