import * as Promise from 'bluebird';
import * as RDF from 'rdf-js';
import { Algebra as Alg } from 'sparqlalgebrajs';

import * as E from '../core/Expressions';
import * as Err from '../util/Errors';
import * as P from '../util/Parsing';

import { Bindings } from '../core/Bindings';
import { makeOp } from '../core/operators/index';
import { transformAlgebra, transformTerm } from '../core/Transformation';
import { Lookup } from "../FromExpressionStream";
import { DataType as DT } from '../util/Consts';

export class AsyncEvaluator {
  private _expr: E.Expression;
  private _lookup: Lookup;

  constructor(expr: Alg.Expression, public lookup: Lookup) {
    this._expr = transformAlgebra(expr);
  }

  public evaluate(mapping: Bindings): Promise<RDF.Term> {
    return this._eval(this._expr, mapping).then((val) => log(val).toRDF());
  }

  public evaluateAsEBV(mapping: Bindings): Promise<boolean> {
    return this._eval(this._expr, mapping).then((val) => log(val).coerceEBV());
  }

  public evaluateAsInternal(mapping: Bindings): Promise<E.ITermExpression> {
    return this._eval(this._expr, mapping);
  }

  private _eval(expr: E.Expression, mapping: Bindings): Promise<E.ITermExpression> {
    const types = E.expressionTypes;
    switch (expr.expressionType) {
      case types.TERM:
        return Promise.resolve(<E.ITermExpression> expr);
      case types.VARIABLE:
        return Promise.try(() => (
          this._evalVar(<E.IVariableExpression> expr, mapping)
        ));
      case types.OPERATOR:
        return this._evalOp(<E.IOperatorExpression> expr, mapping);
      // TODO
      case types.NAMED:
        throw new Err.UnimplementedError();
      case types.EXISTENCE:
        throw new Err.UnimplementedError();
      case types.AGGREGATE:
        throw new Err.UnimplementedError();
      default: throw new Err.InvalidExpressionType(expr);
    }
  }

  private _evalVar(expr: E.IVariableExpression, mapping: Bindings): E.ITermExpression {
    const rdfTerm = mapping.get(expr.name);
    if (rdfTerm) {
      return <E.ITermExpression> transformTerm({
        type: 'expression',
        expressionType: 'term',
        term: rdfTerm,
      });
    } else {
      throw new TypeError("Unbound variable");
    }
  }

  private _evalOp(expr: E.IOperatorExpression, mapping: Bindings): Promise<E.ITermExpression> {
    const { func, args } = expr;
    switch (func.functionClass) {
      case 'simple': {
        const pArgs = args.map((arg) => this._eval(arg, mapping));
        return Promise.all(pArgs).then((rArgs) => func.apply(rArgs));
      }
      case 'overloaded': {
        const pArgs = args.map((arg) => this._eval(arg, mapping));
        return Promise.all(pArgs).then((rArgs) => func.apply(rArgs));
      }
      case 'special': {
        return func.apply(args, mapping, this._eval.bind(this));
      }
      default: throw new Err.UnexpectedError("Unknown function class.");
    }
  }

  private _transform(expr: Alg.Expression): E.Expression {
    const types = Alg.expressionTypes;
    switch (expr.expressionType) {
      case types.TERM: return transformTerm(<Alg.TermExpression> expr);
      case types.OPERATOR: {
        const opIn = <Alg.OperatorExpression> expr;
        const args = opIn.args.map((a) => this._transform(a));
        // NOTE: If abstracted, sync and async should be differentiated
        return makeOp(opIn.operator, args);
      }
      // TODO
      case types.NAMED: throw new Err.UnimplementedError();
      case types.EXISTENCE: throw new Err.UnimplementedError();
      case types.AGGREGATE: throw new Err.UnimplementedError();
      default: throw new Err.InvalidExpressionType(expr);
    }
  }
}

function log(val: any) {
  // console.log(val);
  return val;
}
