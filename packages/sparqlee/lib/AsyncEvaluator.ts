import * as RDF from 'rdf-js';
import { Algebra as Alg } from 'sparqlalgebrajs';

import * as E from './core/Expressions';
import * as Err from './util/Errors';

import { transformAlgebra, transformTerm } from './core/Transformation';
import { AsyncAggregator, AsyncLookUp, Bindings } from './core/Types';

type Expression = E.Expression;
type Term = E.TermExpression;
type Variable = E.VariableExpression;
type Existence = E.ExistenceExpression;
type Operator = E.OperatorExpression;
type SpecialOperator = E.SpecialOperatorExpression;
type Named = E.NamedExpression;
type Aggregate = E.AggregateExpression;

export class AsyncEvaluator {
  private inputExpr: Expression;

  // TODO: Support passing functions to override default behaviour;
  constructor(
    expr: Alg.Expression,
    public lookup?: AsyncLookUp,
    public aggregator?: AsyncAggregator) {
    this.inputExpr = transformAlgebra(expr);
  }

  async evaluate(mapping: Bindings): Promise<RDF.Term> {
    const result = await this.evalRecursive(this.inputExpr, mapping);
    return log(result).toRDF();
  }

  async evaluateAsEBV(mapping: Bindings): Promise<boolean> {
    const result = await this.evalRecursive(this.inputExpr, mapping);
    return log(result).coerceEBV();
  }

  async evaluateAsInternal(mapping: Bindings): Promise<Term> {
    return this.evalRecursive(this.inputExpr, mapping);
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

  private async evalRecursive(expr: Expression, mapping: Bindings): Promise<Term> {
    const evaluatorFunction = this.evalLookup[expr.expressionType];
    if (!evaluatorFunction) { throw new Err.InvalidExpressionType(expr); }
    return evaluatorFunction.bind(this)(expr, mapping);
  }

  private async evalTerm(expr: Term, mapping: Bindings): Promise<Term> {
    return expr;
  }

  private async evalVariable(expr: Variable, mapping: Bindings): Promise<Term> {
    const term = mapping.get(expr.name);

    if (!term) { throw new Err.UnboundVariableError(expr.name, mapping); }

    return transformTerm({
      term,
      type: 'expression',
      expressionType: 'term',
    }) as Term;
  }

  private async evalOperator(expr: Operator, mapping: Bindings): Promise<Term> {
    const { func, args } = expr;
    const argPromises = args.map((arg) => this.evalRecursive(arg, mapping));
    const argResults = await Promise.all(argPromises);
    return func.apply(argResults);
  }

  private async evalSpecialOperator(expr: SpecialOperator, mapping: Bindings): Promise<Term> {
    const { func, args } = expr;
    const evaluate = this.evalRecursive.bind(this);
    const context = { args, mapping, evaluate };
    return func.apply(context);
  }

  private async evalNamed(expr: Named, mapping: Bindings): Promise<Term> {
    const { func, args } = expr;
    const argPromises = args.map((arg) => this.evalRecursive(arg, mapping));
    const argResults = await Promise.all(argPromises);
    return func.apply(argResults);
  }

  // TODO
  private async evalExistence(expr: Existence, mapping: Bindings): Promise<Term> {
    throw new Err.UnimplementedError('Existence Operator');
  }

  // TODO
  private async evalAggregate(expr: Aggregate, mapping: Bindings): Promise<Term> {
    throw new Err.UnimplementedError('Aggregate Operator');
  }
}

interface EvalLookup {
  [key: string]: (expr: Expression, mapping: Bindings) => Promise<Term>;
}

function log<T>(val: T): T {
  // console.log(val);
  return val;
}
