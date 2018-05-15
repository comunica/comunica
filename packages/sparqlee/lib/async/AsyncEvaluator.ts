import * as Promise from 'bluebird';
import * as RDF from 'rdf-js';
import { Algebra as Alg } from 'sparqlalgebrajs';

import * as E from '../core/Expressions';
import * as Err from '../util/Errors';
import * as P from '../util/Parsing';

import { transformAlgebra, transformTerm } from '../core/Transformation';
import { AsyncAggregator, AsyncLookUp, Bindings } from '../core/Types';
import { DataType as DT } from '../util/Consts';

export class AsyncEvaluator {
  private _expr: E.Expression;

  // TODO: Support passing functions to override default behaviour;
  constructor(
    expr: Alg.Expression,
    public lookup?: AsyncLookUp,
    public aggregator?: AsyncAggregator) {
    this._expr = transformAlgebra(expr);
  }

  evaluate(mapping: Bindings): Promise<RDF.Term> {
    return this._eval(this._expr, mapping).then((val) => log(val).toRDF());
  }

  evaluateAsEBV(mapping: Bindings): Promise<boolean> {
    return this._eval(this._expr, mapping).then((val) => log(val).coerceEBV());
  }

  evaluateAsInternal(mapping: Bindings): Promise<E.TermExpression> {
    return this._eval(this._expr, mapping);
  }

  private _eval(expr: E.Expression, mapping: Bindings): Promise<E.TermExpression> {
    const types = E.expressionTypes;
    switch (expr.expressionType) {
      case types.TERM:
        return Promise.resolve(expr as E.TermExpression);
      case types.VARIABLE:
        return Promise.try(() => (
          this._evalVar(expr as E.VariableExpression, mapping)
        ));
      case types.OPERATOR:
        return this._evalOp(expr as E.OperatorExpression, mapping);
      // TODO
      case types.NAMED:
        throw new Err.UnimplementedError('Named Operator');
      case types.EXISTENCE:
        throw new Err.UnimplementedError('Existence Operator');
      case types.AGGREGATE:
        throw new Err.UnimplementedError('Aggregate Operator');
      default: throw new Err.InvalidExpressionType(expr);
    }
  }

  private _evalVar(expr: E.VariableExpression, mapping: Bindings): E.TermExpression {
    const rdfTerm = mapping.get(expr.name);
    if (rdfTerm) {
      return transformTerm({
        type: 'expression',
        expressionType: 'term',
        term: rdfTerm,
      }) as E.TermExpression;
    } else {
      throw new Err.UnboundVariableError(expr.name, mapping);
    }
  }

  private _evalOp(expr: E.OperatorExpression, mapping: Bindings): Promise<E.TermExpression> {
    const { func, args } = expr;
    switch (func.functionClass) {
      case 'simple':
      case 'overloaded': {
        const pArgs = args.map((arg) => this._eval(arg, mapping));
        return Promise.all(pArgs).then((rArgs) => func.apply(rArgs));
      }
      case 'special': return func.apply(args, mapping, this._eval.bind(this));
      default: throw new Err.UnexpectedError('Unknown function class.');
    }
  }
}

function log<T>(val: T): T {
  // console.log(val);
  return val;
}
