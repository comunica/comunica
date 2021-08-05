import * as E from '../expressions';
import type { AsyncExtension, SyncExtension } from '../expressions';
import { transformRDFTermUnsafe } from '../Transformation';
import type { Bindings, IExpressionEvaluator } from '../Types';
import * as Err from '../util/Errors';

import type { AsyncEvaluatorContext } from './AsyncEvaluator';
import type { SyncEvaluatorContext } from './SyncEvaluator';

type Expression = E.Expression;
type Term = E.TermExpression;
type Variable = E.VariableExpression;
type Existence = E.ExistenceExpression;
type Operator = E.OperatorExpression;
type SpecialOperator = E.SpecialOperatorExpression;
type Named = E.NamedExpression;
type Aggregate = E.AggregateExpression;

const sharedEvaluators = {
  term(expr: Term, mapping: Bindings): Term {
    return expr;
  },
  variable(expr: Variable, mapping: Bindings): Term {
    const term = mapping.get(expr.name);
    if (!term) {
      throw new Err.UnboundVariableError(expr.name, mapping);
    }
    return transformRDFTermUnsafe(term);
  },
};

export class AsyncRecursiveEvaluator implements IExpressionEvaluator<Expression, Promise<Term>> {
  private readonly subEvaluators: Record<string, (expr: Expression, mapping: Bindings) => Promise<Term> | Term> = {
    // Shared
    [E.ExpressionType.Term]: sharedEvaluators.term.bind(this),
    [E.ExpressionType.Variable]: sharedEvaluators.variable.bind(this),

    // Async
    [E.ExpressionType.Operator]: this.evalOperator.bind(this),
    [E.ExpressionType.SpecialOperator]: this.evalSpecialOperator.bind(this),
    [E.ExpressionType.Named]: this.evalNamed.bind(this),
    [E.ExpressionType.Existence]: this.evalExistence.bind(this),
    [E.ExpressionType.Aggregate]: this.evalAggregate.bind(this),
    [E.ExpressionType.AsyncExtension]: this.evalAsyncExtension.bind(this),
  };

  public constructor(private readonly context: AsyncEvaluatorContext) { }

  public async evaluate(expr: Expression, mapping: Bindings): Promise<Term> {
    const evaluator = this.subEvaluators[expr.expressionType];
    if (!evaluator) {
      throw new Err.InvalidExpressionType(expr);
    }
    return evaluator.bind(this)(expr, mapping);
  }

  private async evalOperator(expr: Operator, mapping: Bindings): Promise<Term> {
    const argPromises = expr.args.map(arg => this.evaluate(arg, mapping));
    const argResults = await Promise.all(argPromises);
    return expr.apply(argResults);
  }

  private async evalSpecialOperator(expr: SpecialOperator, mapping: Bindings): Promise<Term> {
    const evaluate = this.evaluate.bind(this);
    const context = {
      args: expr.args,
      mapping,
      evaluate,
      context: {
        now: this.context.now,
        baseIRI: this.context.baseIRI,
        bnode: this.context.bnode,
      },
    };
    return expr.applyAsync(context);
  }

  private async _evalAsyncArgs(args: Expression[], mapping: Bindings): Promise<E.TermExpression[]> {
    const argPromises = args.map(arg => this.evaluate(arg, mapping));
    return await Promise.all(argPromises);
  }

  private async evalNamed(expr: Named, mapping: Bindings): Promise<Term> {
    return expr.apply(await this._evalAsyncArgs(expr.args, mapping));
  }

  private async evalAsyncExtension(expr: AsyncExtension, mapping: Bindings): Promise<Term> {
    return await expr.apply(await this._evalAsyncArgs(expr.args, mapping));
  }

  private async evalExistence(expr: Existence, mapping: Bindings): Promise<Term> {
    if (!this.context.exists) {
      throw new Err.NoExistenceHook();
    }

    return new E.BooleanLiteral(await this
      .context
      .exists(expr.expression, mapping));
  }

  // TODO: Remove?
  private async evalAggregate(expr: Aggregate, _mapping: Bindings): Promise<Term> {
    if (!this.context.aggregate) {
      throw new Err.NoExistenceHook();
    }

    return transformRDFTermUnsafe(await this
      .context
      .aggregate(expr.expression));
  }
}

export class SyncRecursiveEvaluator implements IExpressionEvaluator<Expression, Term> {
  private readonly subEvaluators: Record<string, (expr: Expression, mapping: Bindings) => Term> = {
    // Shared
    [E.ExpressionType.Term]: sharedEvaluators.term.bind(this),
    [E.ExpressionType.Variable]: sharedEvaluators.variable.bind(this),

    // Sync
    [E.ExpressionType.Operator]: this.evalOperator.bind(this),
    [E.ExpressionType.SpecialOperator]: this.evalSpecialOperator.bind(this),
    [E.ExpressionType.Named]: this.evalNamed.bind(this),
    [E.ExpressionType.Existence]: this.evalExistence.bind(this),
    [E.ExpressionType.Aggregate]: this.evalAggregate.bind(this),
    [E.ExpressionType.SyncExtension]: this.evalSyncExtension.bind(this),
  };

  public constructor(private readonly context: SyncEvaluatorContext) { }

  public evaluate(expr: Expression, mapping: Bindings): Term {
    const evaluator = this.subEvaluators[expr.expressionType];
    if (!evaluator) {
      throw new Err.InvalidExpressionType(expr);
    }
    return evaluator.bind(this)(expr, mapping);
  }

  private evalOperator(expr: Operator, mapping: Bindings): Term {
    const args = expr.args.map(arg => this.evaluate(arg, mapping));
    return expr.apply(args);
  }

  private evalSpecialOperator(expr: SpecialOperator, mapping: Bindings): Term {
    const evaluate = this.evaluate.bind(this);
    const context = {
      args: expr.args,
      mapping,
      evaluate,
      context: {
        now: this.context.now,
        baseIRI: this.context.baseIRI,
        bnode: this.context.bnode,
      },
    };
    return expr.applySync(context);
  }

  private evalNamed(expr: Named, mapping: Bindings): Term {
    const args = expr.args.map(arg => this.evaluate(arg, mapping));
    return expr.apply(args);
  }

  private evalSyncExtension(expr: SyncExtension, mapping: Bindings): Term {
    const args = expr.args.map(arg => this.evaluate(arg, mapping));
    return expr.apply(args);
  }

  private evalExistence(expr: Existence, mapping: Bindings): Term {
    if (!this.context.exists) {
      throw new Err.NoExistenceHook();
    }

    return new E.BooleanLiteral(this
      .context
      .exists(expr.expression, mapping));
  }

  private evalAggregate(expr: Aggregate, mapping: Bindings): Term {
    if (!this.context.aggregate) {
      throw new Err.NoAggregator();
    }

    return transformRDFTermUnsafe(this
      .context
      .aggregate(expr.expression));
  }
}
