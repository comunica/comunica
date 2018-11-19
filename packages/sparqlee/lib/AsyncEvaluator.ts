import * as RDF from 'rdf-js';
import { Algebra as Alg } from 'sparqlalgebrajs';

import * as E from './core/Expressions';
import * as Err from './util/Errors';

import { transformAlgebra, transformTerm } from './core/Transformation';
import { AsyncAggregator, AsyncLookUp, Bindings } from './core/Types';

export class AsyncEvaluator {
  private inputExpr: E.Expression;

  // TODO: Support passing functions to override default behaviour;
  constructor(
    expr: Alg.Expression,
    public lookup?: AsyncLookUp,
    public aggregator?: AsyncAggregator) {
    this.inputExpr = transformAlgebra(expr);
  }

  async evaluate(mapping: Bindings): Promise<RDF.Term> {
    const result = await this.evalRec(this.inputExpr, mapping);
    return log(result).toRDF();
  }

  async evaluateAsEBV(mapping: Bindings): Promise<boolean> {
    const result = await this.evalRec(this.inputExpr, mapping);
    return log(result).coerceEBV();
  }

  async evaluateAsInternal(mapping: Bindings): Promise<E.TermExpression> {
    return this.evalRec(this.inputExpr, mapping);
  }

  // tslint:disable-next-line:member-ordering
  private readonly evalLookup: EvalLookup = {
    [E.ExpressionType.Term]: this.evalTerm.bind(this),
    [E.ExpressionType.Variable]: this.evalVariable,
    [E.ExpressionType.Operator]: this.evalOperator,
    [E.ExpressionType.SpecialOperator]: this.evalSpecialOperator,
    [E.ExpressionType.Named]: this.evalNamed,
    [E.ExpressionType.Existence]: this.evalExistence,
    [E.ExpressionType.Aggregate]: this.evalAggregate,
  };

  private async evalRec(expr: E.Expression, mapping: Bindings): Promise<E.TermExpression> {
    const evaluatorFunction = this.evalLookup[expr.expressionType];
    if (!evaluatorFunction) { throw new Err.InvalidExpressionType(expr); }
    return evaluatorFunction.bind(this)(expr, mapping);
  }

  private async evalTerm(expr: E.TermExpression, mapping: Bindings): Promise<E.TermExpression> {
    return expr as E.TermExpression;
  }

  private async evalVariable(expr: E.VariableExpression, mapping: Bindings): Promise<E.TermExpression> {
    const term = mapping.get(expr.name);

    if (!term) { throw new Err.UnboundVariableError(expr.name, mapping); }

    return transformTerm({
      term,
      type: 'expression',
      expressionType: 'term',
    }) as E.TermExpression;
  }

  private async evalOperator(expr: E.OperatorExpression, mapping: Bindings): Promise<E.TermExpression> {
    const { func, args } = expr;
    const argPromises = args.map((arg) => this.evalRec(arg, mapping));
    const argResults = await Promise.all(argPromises);
    return func.apply(argResults);
  }

  private async evalSpecialOperator(expr: E.SpecialOperatorExpression, mapping: Bindings): Promise<E.TermExpression> {
    const { func, args } = expr;
    return func.apply({ args, mapping, evaluate: this.evalRec.bind(this) });
  }

  private async evalNamed(expr: E.NamedExpression, mapping: Bindings): Promise<E.TermExpression> {
    const { func, args } = expr;
    const argPromises = args.map((arg) => this.evalRec(arg, mapping));
    const argResults = await Promise.all(argPromises);
    return func.apply(argResults);
  }

  // TODO
  private async evalExistence(expr: E.ExistenceExpression, mapping: Bindings): Promise<E.TermExpression> {
    throw new Err.UnimplementedError('Existence Operator');
  }

  // TODO
  private async evalAggregate(expr: E.AggregateExpression, mapping: Bindings): Promise<E.TermExpression> {
    throw new Err.UnimplementedError('Aggregate Operator');
  }
}

interface EvalLookup {
  [key: string]: (expr: E.Expression, mapping: Bindings) => Promise<E.TermExpression>;
}

function log<T>(val: T): T {
  // console.log(val);
  return val;
}
