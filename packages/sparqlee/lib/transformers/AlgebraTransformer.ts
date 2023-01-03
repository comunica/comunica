import { Algebra as Alg } from 'sparqlalgebrajs';
import type { AsyncExtensionFunction, AsyncExtensionFunctionCreator } from '../evaluators/AsyncEvaluator';
import type { ICompleteSharedContext } from '../evaluators/evaluatorHelpers/BaseExpressionEvaluator';
import type { SyncExtensionFunction, SyncExtensionFunctionCreator } from '../evaluators/SyncEvaluator';
import * as E from '../expressions';
import type { AsyncExtensionApplication, SimpleApplication } from '../expressions';
import { namedFunctions, regularFunctions, specialFunctions } from '../functions';
import * as C from '../util/Consts';
import * as Err from '../util/Errors';
import { ExtensionFunctionError } from '../util/Errors';
import type { ITermTransformer } from './TermTransformer';
import { TermTransformer } from './TermTransformer';

type FunctionCreatorConfig = { type: 'sync'; creator: SyncExtensionFunctionCreator } |
{ type: 'async'; creator: AsyncExtensionFunctionCreator };

type AlgebraTransformConfig = ICompleteSharedContext & FunctionCreatorConfig;

export interface IAlgebraTransformer extends ITermTransformer{
  transformAlgebra: (expr: Alg.Expression) => E.Expression;
}

export class AlgebraTransformer extends TermTransformer implements IAlgebraTransformer {
  private readonly creatorConfig: FunctionCreatorConfig;
  public constructor(protected readonly algebraConfig: AlgebraTransformConfig) {
    super(algebraConfig.superTypeProvider);
    this.creatorConfig = <FunctionCreatorConfig> { type: algebraConfig.type, creator: algebraConfig.creator };
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
      return new E.SpecialOperator(specialArgs, specialFunc.applyAsync, specialFunc.applySync);
    }
    if (!C.Operators.has(operator)) {
      throw new Err.UnknownOperator(expr.operator);
    }
    const regularOp = <C.RegularOperator>operator;
    const regularArgs = expr.args.map(arg => this.transformAlgebra(arg));
    const regularFunc = regularFunctions[regularOp];
    if (!AlgebraTransformer.hasCorrectArity(regularArgs, regularFunc.arity)) {
      throw new Err.InvalidArity(regularArgs, regularOp);
    }
    return new E.Operator(regularArgs, args => regularFunc.apply(args, this.algebraConfig));
  }

  private wrapSyncFunction(func: SyncExtensionFunction, name: string): SimpleApplication {
    return args => {
      try {
        const res = func(args.map(arg => arg.toRDF()));
        return this.transformRDFTermUnsafe(res);
      } catch (error: unknown) {
        throw new ExtensionFunctionError(name, error);
      }
    };
  }

  private wrapAsyncFunction(func: AsyncExtensionFunction, name: string): AsyncExtensionApplication {
    return async args => {
      try {
        const res = await func(args.map(arg => arg.toRDF()));
        return this.transformRDFTermUnsafe(res);
      } catch (error: unknown) {
        throw new ExtensionFunctionError(name, error);
      }
    };
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
      return new E.Named(expr.name, namedArgs, args => namedFunc.apply(args, this.algebraConfig));
    }
    if (this.creatorConfig.type === 'sync') {
      // Expression might be extension function, check this for the sync
      const syncExtensionFunc = this.creatorConfig.creator(expr.name);
      if (syncExtensionFunc) {
        const simpleAppl = this.wrapSyncFunction(syncExtensionFunc, expr.name.value);
        return new E.SyncExtension(expr.name, namedArgs, simpleAppl);
      }
    } else {
      // The expression might be an extension function, check this for the async case
      const asyncExtensionFunc = this.creatorConfig.creator(expr.name);
      if (asyncExtensionFunc) {
        const asyncAppl = this.wrapAsyncFunction(asyncExtensionFunc, expr.name.value);
        return new E.AsyncExtension(expr.name, namedArgs, asyncAppl);
      }
    }
    throw new Err.UnknownNamedOperator(expr.name.value);
  }

  private static hasCorrectArity(args: E.Expression[], arity: number | number[]): boolean {
    // If the function has overloaded arity, the actual arity needs to be present.
    if (Array.isArray(arity)) {
      return arity.includes(args.length);
    }

    return args.length === arity;
  }

  public static transformAggregate(expr: Alg.AggregateExpression): E.Aggregate {
    const name = expr.aggregator;
    return new E.Aggregate(name, expr);
  }

  public static transformExistence(expr: Alg.ExistenceExpression): E.Existence {
    return new E.Existence(expr);
  }
}
