import * as Promise from 'bluebird';
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

  evaluate(mapping: Bindings): Promise<RDF.Term> {
    const result = this.evalRec(this.inputExpr, mapping);
    return result.then((val) => log(val).toRDF());
  }

  evaluateAsEBV(mapping: Bindings): Promise<boolean> {
    const result = this.evalRec(this.inputExpr, mapping);
    return result.then((val) => log(val).coerceEBV());
  }

  evaluateAsInternal(mapping: Bindings): Promise<E.TermExpression> {
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

  private evalRec(expr: E.Expression, mapping: Bindings): Promise<E.TermExpression> {
    const evaluatorFunction = this.evalLookup[expr.expressionType];
    if (!evaluatorFunction) {
      return Promise.reject(new Err.InvalidExpressionType(expr));
    }
    return evaluatorFunction.bind(this)(expr, mapping);
  }

  private evalTerm(expr: E.TermExpression, mapping: Bindings): Promise<E.TermExpression> {
    return Promise.resolve(expr as E.TermExpression);
  }

  private evalVariable(expr: E.VariableExpression, mapping: Bindings): Promise<E.TermExpression> {
    return Promise.try(() => {
      const term = mapping.get(expr.name);

      if (!term) { throw new Err.UnboundVariableError(expr.name, mapping); }

      return transformTerm({
        term,
        type: 'expression',
        expressionType: 'term',
      }) as E.TermExpression;
    });
  }

  private evalOperator(expr: E.OperatorExpression, mapping: Bindings): Promise<E.TermExpression> {
    const { func, args } = expr;
    const pArgs = args.map((arg) => this.evalRec(arg, mapping));
    return Promise.all(pArgs).then((rArgs) => func.apply(rArgs));
  }

  private evalSpecialOperator(expr: E.SpecialOperatorExpression, mapping: Bindings): Promise<E.TermExpression> {
    const { func, args } = expr;
    return func.apply(args, mapping, this.evalRec.bind(this));
  }

  // TODO
  private evalNamed(expr: E.NamedExpression, mapping: Bindings): Promise<E.TermExpression> {
    return Promise.reject(new Err.UnimplementedError('Named Operator'));
  }

  // TODO
  private evalExistence(expr: E.ExistenceExpression, mapping: Bindings): Promise<E.TermExpression> {
    return Promise.reject(new Err.UnimplementedError('Existence Operator'));
  }

  // TODO
  private evalAggregate(expr: E.AggregateExpression, mapping: Bindings): Promise<E.TermExpression> {
    return Promise.reject(new Err.UnimplementedError('Aggregate Operator'));
  }
}

interface EvalLookup {
  [key: string]: (expr: E.Expression, mapping: Bindings) => Promise<E.TermExpression>;
}

function log<T>(val: T): T {
  // console.log(val);
  return val;
}
