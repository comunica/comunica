
import * as C from '../../util/Consts';
import * as Err from '../../util/Errors';
import * as E from '../Expressions';

import { Bindings } from '../Types';
import { bool } from './Helpers';
import { regularFunctions, specialFunctions } from './index';
import { SpecialFunctionAsync } from './Types';

export type AsyncTerm = Promise<E.TermExpression>;
export type Evaluator = (expr: E.Expression, mapping: Bindings) => AsyncTerm;

export class Bound extends SpecialFunctionAsync {
  operator = C.SpecialOperator.BOUND;
  arity = 1;

  async apply(args: E.Expression[], mapping: Bindings, evaluate: Evaluator): Promise<E.TermExpression> {
    const variable = args[0] as E.VariableExpression;
    if (variable.expressionType !== E.ExpressionType.Variable) {
      throw new Err.InvalidArgumentTypes(args, C.SpecialOperator.BOUND);
    }
    const val = mapping.has(variable.name) && !!mapping.get(variable.name);
    return bool(val);
  }
}

export class If extends SpecialFunctionAsync {
  operator = C.SpecialOperator.IF;
  arity = 3;

  async apply(args: E.Expression[], mapping: Bindings, evaluate: Evaluator): Promise<E.TermExpression> {
    const valFirst = await evaluate(args[0], mapping);
    const ebv = valFirst.coerceEBV();
    return (ebv)
      ? evaluate(args[1], mapping)
      : evaluate(args[2], mapping);
  }
}

export class Coalesce extends SpecialFunctionAsync {
  operator = C.SpecialOperator.COALESCE;
  arity = Infinity;

  async apply(args: E.Expression[], mapping: Bindings, evaluate: Evaluator): Promise<E.TermExpression> {
    const errors: Error[] = [];
    for (const expr of args) {
      try {
        return await evaluate(expr, mapping);
      } catch (err) {
        errors.push(err);
      }
    }
    throw new Err.CoalesceError(errors);
  }
}

// TODO: Might benefit from some smart people's input
// https://www.w3.org/TR/sparql11-query/#func-logical-or
export class LogicalOrAsync extends SpecialFunctionAsync {
  operator = C.SpecialOperator.LOGICAL_OR;
  arity = 2;

  async apply(args: E.Expression[], mapping: Bindings, evaluate: Evaluator): Promise<E.TermExpression> {
    const [leftExpr, rightExpr] = args;
    try {
      const leftTerm = await evaluate(leftExpr, mapping);
      const left = leftTerm.coerceEBV();
      if (left) { return bool(true); }
      const rightTerm = await evaluate(rightExpr, mapping);
      const right = rightTerm.coerceEBV();
      return bool(right);
    } catch (leftErr) {
      const rightTerm = await evaluate(rightExpr, mapping);
      const right = rightTerm.coerceEBV();
      if (!right) { throw leftErr; }
      return bool(true);
    }
  }
}

// https://www.w3.org/TR/sparql11-query/#func-logical-and
export class LogicalAndAsync extends SpecialFunctionAsync {
  operator = C.SpecialOperator.LOGICAL_AND;
  arity = 2;

  async apply(args: E.Expression[], mapping: Bindings, evaluate: Evaluator): Promise<E.TermExpression> {
    const [leftExpr, rightExpr] = args;
    try {
      const leftTerm = await evaluate(leftExpr, mapping);
      const left = leftTerm.coerceEBV();
      if (!left) { return bool(false); }
      const rightTerm = await evaluate(rightExpr, mapping);
      const right = rightTerm.coerceEBV();
      return bool(right);
    } catch (leftErr) {
      const rightTerm = await evaluate(rightExpr, mapping);
      const right = rightTerm.coerceEBV();
      if (right) { throw leftErr; }
      return bool(false);
    }
  }
}

// Maybe put some place else
// https://www.w3.org/TR/sparql11-query/#func-RDFterm-equal
export function RDFTermEqual(_left: E.TermExpression, _right: E.TermExpression) {
  const left = _left.toRDF();
  const right = _right.toRDF();
  const val = left.equals(right);
  if ((left.termType === 'Literal') && (right.termType === 'Literal')) {
    throw new Err.RDFEqualTypeError([_left, _right]);
  }
  return val;
}

export class SameTerm extends SpecialFunctionAsync {
  operator = C.SpecialOperator.SAME_TERM;
  arity = 2;

  async apply(args: E.Expression[], mapping: Bindings, evaluate: Evaluator): Promise<E.TermExpression> {
    if (args.length !== 2) { throw new Err.InvalidArity(args, C.SpecialOperator.SAME_TERM); }
    const [leftExpr, rightExpr] = args.map((a) => evaluate(a, mapping));
    const left = await leftExpr;
    const right = await rightExpr;
    return bool(left.toRDF().equals(right.toRDF()));
  }
}

export class In extends SpecialFunctionAsync {
  operator = C.SpecialOperator.IN;
  arity = Infinity;

  async apply(args: E.Expression[], mapping: Bindings, evaluate: Evaluator): Promise<E.TermExpression> {
    if (args.length < 1) { throw new Err.InvalidArity(args, C.SpecialOperator.IN); }
    const [leftExpr, ...remaining] = args;
    // const thunks = remaining.map((expr) => () => evaluate(expr, mapping));
    const left = await evaluate(leftExpr, mapping);
    return inRecursive(left, { args: remaining, mapping, evaluate }, []);
  }
}

interface Context { args: E.Expression[]; mapping: Bindings; evaluate: Evaluator; }

async function inRecursive(
  needle: E.TermExpression,
  { args, mapping, evaluate }: Context,
  results: Array<Error | false>,
): Promise<E.TermExpression> {

  if (args.length === 0) {
    const noErrors = results.every((v) => !v);
    return (noErrors) ? bool(false) : Promise.reject(new Err.InError(results));
  }

  try {
    const next = await evaluate(args.shift(), mapping);
    const isEqual = regularFunctions.get(C.Operator.EQUAL);
    if (isEqual.apply([needle, next])) {
      return bool(true);
    } else {
      inRecursive(needle, { args, mapping, evaluate }, [...results, false]);
    }
  } catch (err) {
    return inRecursive(needle, { args, mapping, evaluate }, [...results, err]);
  }
}

export class NotIn extends SpecialFunctionAsync {
  operator = C.SpecialOperator.NOT_IN;
  arity = Infinity;

  async apply(args: E.Expression[], mapping: Bindings, evaluate: Evaluator): Promise<E.TermExpression> {
    const _in = specialFunctions.get(C.SpecialOperator.IN);
    const isIn = await _in.apply(args, mapping, evaluate);
    return bool(!(isIn as E.BooleanLiteral).typedValue);
  }
}
