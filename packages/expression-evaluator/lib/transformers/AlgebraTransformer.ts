import type { FunctionBusType } from '@comunica/types';
import { Algebra as Alg } from 'sparqlalgebrajs';

import * as E from '../expressions';
import * as C from '../util/Consts';
import * as Err from '../util/Errors';
import type { ISuperTypeProvider } from '../util/TypeHandling';
import type { ITermTransformer } from './TermTransformer';
import { TermTransformer } from './TermTransformer';

export interface IAlgebraTransformer extends ITermTransformer{
  transformAlgebra: (expr: Alg.Expression) => Promise<E.Expression>;
}

export class AlgebraTransformer extends TermTransformer implements IAlgebraTransformer {
  private readonly functions: FunctionBusType;
  public constructor(superTypeProvided: ISuperTypeProvider, functions: FunctionBusType) {
    super(superTypeProvided);
    this.functions = functions;
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
    const funcName = expr.name.value;
    const namedArgs = await Promise.all(expr.args.map(arg => this.transformAlgebra(arg)));
    if (C.NamedOperators.has(<C.NamedOperator>funcName)) {
      // Return a basic named expression
      const op = <C.NamedOperator>expr.name.value;
      const namedFunc = await this.functions({ functionName: op, arguments: expr.args });
      return new E.Named(expr.name, namedArgs, args => namedFunc.apply(args));
    }
    // The expression might be an extension function, check this.
    // TODO: this should be done using the correct mediator?
    // const asyncExtensionFunc = this.creatorConfig.creator(expr.name);
    // if (asyncExtensionFunc) {
    //   const asyncAppl = this.wrapAsyncFunction(asyncExtensionFunc, expr.name.value);
    //   return new E.AsyncExtension(expr.name, namedArgs, asyncAppl);
    // }
    throw new Err.UnknownNamedOperator(expr.name.value);
  }

  public static transformAggregate(expr: Alg.AggregateExpression): E.Aggregate {
    const name = expr.aggregator;
    return new E.Aggregate(name, expr);
  }

  public static transformExistence(expr: Alg.ExistenceExpression): E.Existence {
    return new E.Existence(expr);
  }
}
