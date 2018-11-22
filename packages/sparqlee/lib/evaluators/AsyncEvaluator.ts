import * as RDF from 'rdf-js';
import { Algebra as Alg } from 'sparqlalgebrajs';

import * as E from '../expressions/Expressions';
import * as Err from '../util/Errors';

import { transformAlgebra, transformTerm } from '../Transformation';
import { AsyncAggregator, AsyncLookUp, Bindings } from '../Types';

type Expression = E.Expression;
type Term = E.TermExpression;
type Variable = E.VariableExpression;
type Existence = E.ExistenceExpression;
type Operator = E.OperatorExpression;
type SpecialOperator = E.SpecialOperatorExpression;
type Named = E.NamedExpression;
type Aggregate = E.AggregateExpression;

export class AsyncEvaluator {
  private expr: Expression;

  // TODO: Support passing functions to override default behaviour;
  constructor(
    public algExpr: Alg.Expression,
    public lookup?: AsyncLookUp,
    public aggregator?: AsyncAggregator,
  ) {
    this.expr = transformAlgebra(algExpr, aggregator);
  }

  async evaluate(mapping: Bindings): Promise<RDF.Term> {
    const result = await this.evalRecursive(this.expr, mapping);
    return log(result).toRDF();
  }

  async evaluateAsEBV(mapping: Bindings): Promise<boolean> {
    const result = await this.evalRecursive(this.expr, mapping);
    return log(result).coerceEBV();
  }

  async evaluateAsInternal(mapping: Bindings): Promise<Term> {
    return this.evalRecursive(this.expr, mapping);
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
    const argPromises = expr.args.map((arg) => this.evalRecursive(arg, mapping));
    const argResults = await Promise.all(argPromises);
    return expr.apply(argResults);
  }

  private async evalSpecialOperator(expr: SpecialOperator, mapping: Bindings): Promise<Term> {
    const evaluate = this.evalRecursive.bind(this);
    const context = { args: expr.args, mapping, evaluate };
    return expr.applyAsync(context);
  }

  private async evalNamed(expr: Named, mapping: Bindings): Promise<Term> {
    const argPromises = expr.args.map((arg) => this.evalRecursive(arg, mapping));
    const argResults = await Promise.all(argPromises);
    return expr.apply(argResults);
  }

  // TODO
  private async evalExistence(expr: Existence, mapping: Bindings): Promise<Term> {
    throw new Err.UnimplementedError('Existence Operator');
  }

  // TODO
  private async evalAggregate(expr: Aggregate, mapping: Bindings): Promise<Term> {
    const result = await expr.aggregate(mapping);
    return transformTerm({
      type: 'expression',
      expressionType: 'term',
      term: result,
    }) as Term;
  }
}

interface EvalLookup {
  [key: string]: (expr: Expression, mapping: Bindings) => Promise<Term>;
}

function log<T>(val: T): T {
  // console.log(val);
  return val;
}
