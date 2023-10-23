import { Algebra as Alg } from 'sparqlalgebrajs';

import * as E from '../expressions';
import { namedFunctions, regularFunctions, specialFunctions } from '../functions';
import * as C from '../util/Consts';
import * as Err from '../util/Errors';
import type { ISuperTypeProvider } from '../util/TypeHandling';
import type { ITermTransformer } from './TermTransformer';
import { TermTransformer } from './TermTransformer';

export interface IAlgebraTransformer extends ITermTransformer{
  transformAlgebra: (expr: Alg.Expression) => E.Expression;
}

export class AlgebraTransformer extends TermTransformer implements IAlgebraTransformer {
  public constructor(superTypeProvided: ISuperTypeProvider) {
    super(superTypeProvided);
  }

  public transformAlgebra(expr: Alg.Expression): E.Expression {
    const types = Alg.expressionTypes;

    switch (expr.expressionType) {
      case types.TERM:
        return this.transformTerm(expr);
      case types.OPERATOR:
        return this.transformOperator(expr);
      case types.NAMED:
        return this.transformNamed(expr);
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

  private transformOperator(expr: Alg.OperatorExpression): E.OperatorExpression | E.SpecialOperatorExpression {
    const operator = expr.operator.toLowerCase();
    if (C.SpecialOperators.has(operator)) {
      const specialOp = <C.SpecialOperator>operator;
      const specialArgs = expr.args.map(arg => this.transformAlgebra(arg));
      const specialFunc = specialFunctions[specialOp];
      if (!specialFunc.checkArity(specialArgs)) {
        throw new Err.InvalidArity(specialArgs, specialOp);
      }
      return new E.SpecialOperator(specialArgs, specialFunc.apply);
    }
    if (!C.Operators.has(operator)) {
      throw new Err.UnknownOperator(expr.operator);
    }
    const regularOp = <C.RegularOperator>operator;
    const regularArgs = expr.args.map(arg => this.transformAlgebra(arg));
    const regularFunc = regularFunctions[regularOp];
    if (!regularFunc.checkArity(regularArgs)) {
      throw new Err.InvalidArity(regularArgs, regularOp);
    }
    return new E.Operator(regularArgs, args => regularFunc.apply(args));
  }

  // TODO: Support passing functions to override default behaviour;
  private transformNamed(expr: Alg.NamedExpression):
  E.NamedExpression | E.AsyncExtensionExpression | E.SyncExtensionExpression {
    const funcName = expr.name.value;
    const namedArgs = expr.args.map(arg => this.transformAlgebra(arg));
    if (C.NamedOperators.has(<C.NamedOperator>funcName)) {
      // Return a basic named expression
      const op = <C.NamedOperator>expr.name.value;
      const namedFunc = namedFunctions[op];
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
