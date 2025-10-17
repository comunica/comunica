import type { MediatorFunctionFactory } from '@comunica/bus-function-factory';
import { KeysExpressionEvaluator } from '@comunica/context-entries';
import type { Expression, IActionContext, OperatorExpression } from '@comunica/types';
import { Algebra, AlgebraFactory, isKnownSubType } from '@comunica/utils-algebra';
import * as ExprEval from '@comunica/utils-expression-evaluator';

export class AlgebraTransformer extends ExprEval.TermTransformer {
  private readonly AF = new AlgebraFactory();
  public constructor(
    private readonly context: IActionContext,
    private readonly mediatorFunctionFactory: MediatorFunctionFactory,
  ) {
    super(context.getSafe(KeysExpressionEvaluator.superTypeProvider));
  }

  public async transformAlgebra(expr: Algebra.Expression): Promise<Expression> {
    if (isKnownSubType(expr, Algebra.ExpressionTypes.TERM)) {
      // A triple term is actually not a term since it itself can contain
      // variables thereby having the properties of an operator, we therefore map it to the triple operator here.
      // Not that this is needed because the EE has a shortcut for terms and sees them as distinct from operators.
      if (expr.term.termType === 'Quad') {
        return await this.transformOperator(this.AF.createOperatorExpression('triple', [
          this.AF.createTermExpression(expr.term.subject),
          this.AF.createTermExpression(expr.term.predicate),
          this.AF.createTermExpression(expr.term.object),
        ]));
      }
      return this.transformTerm(expr);
    }
    if (isKnownSubType(expr, Algebra.ExpressionTypes.OPERATOR)) {
      return await this.transformOperator(expr);
    }
    if (isKnownSubType(expr, Algebra.ExpressionTypes.NAMED)) {
      return await this.transformNamed(expr);
    }
    if (isKnownSubType(expr, Algebra.ExpressionTypes.EXISTENCE)) {
      return AlgebraTransformer.transformExistence(expr);
    }
    if (isKnownSubType(expr, Algebra.ExpressionTypes.AGGREGATE)) {
      return AlgebraTransformer.transformAggregate(expr);
    }
    if (isKnownSubType(expr, Algebra.ExpressionTypes.WILDCARD)) {
      return AlgebraTransformer.transformWildcard(expr);
    }
    throw new Error(`Expression of type ${expr.subType} cannot be converted into internal representation of expression.`);
  }

  private static transformWildcard(_term: Algebra.WildcardExpression): Expression {
    return new ExprEval.NamedNode('*');
  }

  private async getOperator(operator: string, expr: Algebra.OperatorExpression | Algebra.NamedExpression):
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

  private async transformOperator(expr: Algebra.OperatorExpression): Promise<OperatorExpression> {
    return this.getOperator(expr.operator.toLowerCase(), expr);
  }

  private async transformNamed(expr: Algebra.NamedExpression): Promise<OperatorExpression> {
    return this.getOperator(expr.name.value, expr);
  }

  public static transformAggregate(expr: Algebra.AggregateExpression): ExprEval.Aggregate {
    const name = expr.aggregator;
    return new ExprEval.Aggregate(name, expr);
  }

  public static transformExistence(expr: Algebra.ExistenceExpression): ExprEval.Existence {
    return new ExprEval.Existence(expr);
  }
}
