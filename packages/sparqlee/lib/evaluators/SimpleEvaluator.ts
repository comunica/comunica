import * as RDF from 'rdf-js';
import { Algebra as Alg } from 'sparqlalgebrajs';

import * as E from '../expressions/Expressions';
import * as Err from '../util/Errors';

import { transformAlgebra, transformRDFTermUnsafe } from '../Transformation';
import { Bindings } from '../Types';

type Expression = E.Expression;
type Term = E.TermExpression;
type Variable = E.VariableExpression;
type Existence = E.ExistenceExpression;
type Operator = E.OperatorExpression;
type SpecialOperator = E.SpecialOperatorExpression;
type Named = E.NamedExpression;
type Aggregate = E.AggregateExpression;

/**
 * Evaluator that does not support EXISTS, AGGREGATES or custom Named operators.
 * Evaluates everything sync.
 */
export class SimpleEvaluator {
  private expr: Expression;

  constructor(public algExpr: Alg.Expression) {
    this.expr = transformAlgebra(algExpr);
  }

  evaluate(mapping: Bindings): RDF.Term {
    const result = this.evalRecursive(this.expr, mapping);
    return log(result).toRDF();
  }

  evaluateAsEBV(mapping: Bindings): boolean {
    const result = this.evalRecursive(this.expr, mapping);
    return log(result).coerceEBV();
  }

  evaluateAsInternal(mapping: Bindings): Term {
    return this.evalRecursive(this.expr, mapping);
  }

  // tslint:disable-next-line:member-ordering
  private readonly evaluators: {
    [key: string]: (expr: Expression, mapping: Bindings) => Term;
  } = {
      [E.ExpressionType.Term]: this.evalTerm,
      [E.ExpressionType.Variable]: this.evalVariable,
      [E.ExpressionType.Operator]: this.evalOperator,
      [E.ExpressionType.SpecialOperator]: this.evalSpecialOperator,
      [E.ExpressionType.Named]: this.evalNamed,
      [E.ExpressionType.Existence]: this.evalExistence,
      [E.ExpressionType.Aggregate]: this.evalAggregate,
    };

  private evalRecursive(expr: Expression, mapping: Bindings): Term {
    const evaluator = this.evaluators[expr.expressionType];
    if (!evaluator) { throw new Err.InvalidExpressionType(expr); }
    return evaluator.bind(this)(expr, mapping);
  }

  private evalTerm(expr: Term, mapping: Bindings): Term {
    return expr;
  }

  private evalVariable(expr: Variable, mapping: Bindings): Term {
    const term = mapping.get(expr.name);
    if (!term) {
      throw new Err.UnboundVariableError(expr.name, mapping);
    }
    return transformRDFTermUnsafe(term);
  }

  private evalOperator(expr: Operator, mapping: Bindings): Term {
    const args = expr.args.map((arg) => this.evalRecursive(arg, mapping));
    return expr.apply(args);
  }

  private evalSpecialOperator(expr: SpecialOperator, mapping: Bindings): Term {
    const evaluate = this.evalRecursive.bind(this);
    const context = { args: expr.args, mapping, evaluate };
    return expr.applySync(context);
  }

  private evalNamed(expr: Named, mapping: Bindings): Term {
    const args = expr.args.map((arg) => this.evalRecursive(arg, mapping));
    return expr.apply(args);
  }

  private evalExistence(expr: Existence, mapping: Bindings): Term {
    throw new UnsupportedOperation('EXISTS');
  }

  private evalAggregate(expr: Aggregate, mapping: Bindings): Term {
    throw new UnsupportedOperation(`aggregate ${expr.name}`);
  }
}

function log<T>(val: T): T {
  // console.log(val);
  return val;
}

export class UnsupportedOperation extends Error {
  constructor(operation: string) {
    super(`Operation '${operation}' is unsupported in SimpleEvaluator`);
  }
}
