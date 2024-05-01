import type { MediatorFunctionFactory } from '@comunica/bus-function-factory';
import { KeysExpressionEvaluator } from '@comunica/context-entries';

import * as E from '@comunica/expression-evaluator/lib/expressions';
import { TermTransformer } from '@comunica/expression-evaluator/lib/transformers/TermTransformer';
import * as C from '@comunica/expression-evaluator/lib/util/Consts';
import * as Err from '@comunica/expression-evaluator/lib/util/Errors';
import type { IActionContext } from '@comunica/types';
import { Algebra as Alg } from 'sparqlalgebrajs';

export class AlgebraTransformer extends TermTransformer {
  public constructor(
    private readonly context: IActionContext,
    private readonly mediatorFunctionFactory: MediatorFunctionFactory,
  ) {
    super(context.getSafe(KeysExpressionEvaluator.superTypeProvider));
  }

  public async transformAlgebra(expr: Alg.Expression): Promise<E.Expression> {
    const types = Alg.expressionTypes;

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

  private static transformWildcard(term: Alg.WildcardExpression): E.Expression {
    return new E.NamedNode(term.wildcard.value);
  }

  private async transformOperator(expr: Alg.OperatorExpression):
  Promise<E.OperatorExpression | E.SpecialOperatorExpression> {
    const operator = expr.operator.toLowerCase();
    if (!C.Operators.has(operator)) {
      throw new Err.UnknownOperator(expr.operator);
    }
    const operatorFunc = await this.mediatorFunctionFactory.mediate({
      functionName: operator,
      arguments: expr.args,
      context: this.context,
    });
    const operatorArgs = await Promise.all(expr.args.map(arg => this.transformAlgebra(arg)));
    if (!operatorFunc.checkArity(operatorArgs)) {
      throw new Err.InvalidArity(operatorArgs, <C.Operator>operator);
    }
    if (C.SpecialOperators.has(operator)) {
      return new E.SpecialOperator(operatorArgs, operatorFunc.apply);
    }
    return new E.Operator(operatorArgs, operatorFunc.apply);
  }

  private async transformNamed(expr: Alg.NamedExpression): Promise<E.NamedExpression> {
    const namedArgs = await Promise.all(expr.args.map(arg => this.transformAlgebra(arg)));
    // Return a basic named expression
    const op = <C.NamedOperator>expr.name.value;
    const namedFunc = await this.mediatorFunctionFactory.mediate({
      functionName: op,
      arguments: expr.args,
      context: this.context,
    });
    if (!namedFunc) {
      throw new Err.UnknownNamedOperator(expr.name.value);
    }
    return new E.Named(expr.name, namedArgs, args => namedFunc.apply(args));
  }

  public static transformAggregate(expr: Alg.AggregateExpression): E.Aggregate {
    const name = expr.aggregator;
    return new E.Aggregate(name, expr);
  }

  public static transformExistence(expr: Alg.ExistenceExpression): E.Existence {
    return new E.Existence(expr);
  }
}
