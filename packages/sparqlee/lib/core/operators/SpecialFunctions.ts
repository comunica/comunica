
import * as Promise from 'bluebird';

import * as C from '../../util/Consts';
import * as Err from '../../util/Errors';
import * as E from '../Expressions';

import { Bindings } from '../Bindings';
import { bool } from './Helpers';
import { functions } from './index';
import { OverloadedFunction, SpecialFunctionAsync } from './Types';

export type AsyncTerm = Promise<E.ITermExpression>;
export type Evaluator = (expr: E.Expression, mapping: Bindings) => AsyncTerm;

export class Bound extends SpecialFunctionAsync {
  public apply(args: E.Expression[], mapping: Bindings, evaluate: Evaluator): AsyncTerm {
    const variable = args[0] as E.IVariableExpression;
    if (variable.expressionType !== 'variable') {
      throw new Err.InvalidArgumentTypes(args, C.Operator.BOUND);
    }
    const val = mapping.has(variable.name) && !!mapping.get(variable.name);
    return Promise.resolve(bool(val));
  }
}

export class If extends SpecialFunctionAsync {
  public apply(args: E.Expression[], mapping: Bindings, evaluate: Evaluator): AsyncTerm {
    const valFirstP = evaluate(args[0], mapping);
    return valFirstP.then((valFirst) => {
      const ebv = valFirst.coerceEBV();
      return (ebv)
        ? evaluate(args[1], mapping)
        : evaluate(args[2], mapping);
    });
  }
}

export class Coalesce extends SpecialFunctionAsync {
  public apply(args: E.Expression[], mapping: Bindings, evaluate: Evaluator): AsyncTerm {
    return Promise
      .mapSeries(args, (expr) =>
        evaluate(expr, mapping)
          .then((term) => new CoalesceBreaker(term))
          .catch((err) => new CoalesceContinuer(err))
          .then((controller) => {
            if (controller.type === 'breaker') {
              throw controller;
            } else {
              return controller;
            }
          }))
      .map((continuer: CoalesceContinuer) => continuer.err)
      .then((errors) => { throw new Err.CoalesceError(errors); })
      .catch(CoalesceBreaker, (br) => {
        return br.val;
      });
  }
}

// tslint:disable-next-line:interface-over-type-literal
type CoalesceController = { type: 'breaker' | 'continuer' };
class CoalesceBreaker extends Error implements CoalesceController {
  public type: 'breaker' = 'breaker';
  constructor(public val: E.ITermExpression) {
    super();
  }
}
class CoalesceContinuer implements CoalesceController {
  public type: 'continuer' = 'continuer';
  constructor(public err: Error) { }
}

// TODO: Might benefit from some smart people's input
// https://www.w3.org/TR/sparql11-query/#func-logical-or
export class LogicalOrAsync extends SpecialFunctionAsync {
  public apply(args: E.Expression[], mapping: Bindings, evaluate: Evaluator): AsyncTerm {
    const [leftExpr, rightExpr] = args;
    return evaluate(leftExpr, mapping)
      .then((left) => left.coerceEBV())
      .then((left) => {
        if (left) { return bool(true); }

        return evaluate(rightExpr, mapping)
          .then((right) => right.coerceEBV())
          .then((right) => bool(right));
      })
      .catch((err) => {
        return evaluate(rightExpr, mapping)
          .then((right) => right.coerceEBV())
          .then((right) => {
            if (right) { return bool(true); }
            throw err;
          });
      });
  }
}

// https://www.w3.org/TR/sparql11-query/#func-logical-and
export class LogicalAndAsync extends SpecialFunctionAsync {
  public apply(args: E.Expression[], mapping: Bindings, evaluate: Evaluator): AsyncTerm {
    const [leftExpr, rightExpr] = args;

    return evaluate(leftExpr, mapping)
      .then((left) => left.coerceEBV())
      .then((left) => {
        if (!left) { return bool(false); }
        return evaluate(rightExpr, mapping)
          .then((right) => right.coerceEBV())
          .then((right) => bool(right));
      })
      .catch((err) => {
        return evaluate(rightExpr, mapping)
          .then((right) => right.coerceEBV())
          .then((right) => {
            if (!right) { return bool(false); }
            throw err;
          });
      });
  }
}

// Maybe put some place else
// https://www.w3.org/TR/sparql11-query/#func-RDFterm-equal
export function RDFTermEqual(_left: E.ITermExpression, _right: E.ITermExpression) {
  const left = _left.toRDF();
  const right = _right.toRDF();
  const val = left.equals(right);
  if ((left.termType === 'Literal') && (right.termType === 'Literal')) {
    throw new Err.RDFEqualTypeError([_left, _right]);
  }
  return val;
}

export function sameTerm(left: E.ITermExpression, right: E.ITermExpression) {
  return left.toRDF().equals(right.toRDF());
}

export class In extends SpecialFunctionAsync {
  public apply(args: E.Expression[], mapping: Bindings, evaluate: Evaluator): AsyncTerm {
    if (args.length < 1) { throw new Err.InvalidArity(args, C.Operator.IN); }
    const [left, ...remaining] = args;
    const thunks = remaining.map((expr) => () => evaluate(expr, mapping));
    return evaluate(left, mapping)
      .then((_left) => inR(_left, thunks, []));
  }
}

function inR(left: E.ITermExpression, args: (() => AsyncTerm)[], results: (Error | false)[]): AsyncTerm {
  if (args.length === 0) {
    return (results.every((v) => !v))
      ? Promise.resolve(bool(false))
      : Promise.reject(new Err.InError(results));
  }
  const first = args.shift();
  return first()
    .then((v) => {
      const op = functions.get(C.Operator.EQUAL) as E.OverloadedFunc;
      return op.apply([left, v]);
    })
    .then(
      (result) => ((result as E.BooleanLiteral).typedValue)
        ? bool(true)
        : inR(left, args, [...results, false]),
      (err) => inR(left, args, [...results, err]),
  );
}

export class NotIn extends SpecialFunctionAsync {
  public apply(args: E.Expression[], mapping: Bindings, evaluate: Evaluator): AsyncTerm {
    return new In(C.Operator.IN)
      .apply(args, mapping, evaluate)
      .then((term: E.ITermExpression) => (term as E.BooleanLiteral).typedValue)
      .then((isIn) => bool(!isIn));
  }
}