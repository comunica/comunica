import type { IExpressionFunction } from '@comunica/types';
import { Algebra as Alg } from 'sparqlalgebrajs';

import * as E from '../expressions';
import * as C from '../util/Consts';
import * as Err from '../util/Errors';
import type { ISuperTypeProvider } from '../util/TypeHandling';
import { TermTransformer } from './TermTransformer';

export class AlgebraTransformer extends TermTransformer {
  public constructor(
    superTypeProvided: ISuperTypeProvider,
    private readonly functions: (args: { functionName: string; arguments?: Alg.Expression[] }) =>
    Promise<IExpressionFunction>,
  ) {
    super(superTypeProvided);
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
    const operatorFunc = await this.functions({ functionName: operator, arguments: expr.args });
    const operatorArgs = await Promise.all(expr.args.map(arg => this.transformAlgebra(arg)));
    if (!operatorFunc.checkArity(operatorArgs)) {
      throw new Err.InvalidArity(operatorArgs, <C.Operator> operator);
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
    try {
      const namedFunc = await this.functions({ functionName: op, arguments: expr.args });
      return new E.Named(expr.name, namedArgs, args => namedFunc.apply(args));
    } catch {
      throw new Err.UnknownNamedOperator(expr.name.value);
    }
  }

  public static transformAggregate(expr: Alg.AggregateExpression): E.Aggregate {
    const name = expr.aggregator;
    return new E.Aggregate(name, expr);
  }

  public static transformExistence(expr: Alg.ExistenceExpression): E.Existence {
    return new E.Existence(expr);
  }
}
