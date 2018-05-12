import { Map } from 'immutable';

import * as C from '../../util/Consts';
import * as E from '../Expressions';

import { InvalidArity, UnexpectedError, UnimplementedError } from '../../util/Errors';
import {
  definitions,
  OverloadedDefinition,
  SimpleDefinition,
  SpecialDefinition,
} from './Definitions';
import { OverloadedFunction, SimpleFunction, SpecialFunctionAsync } from './Types';

// TODO: If args are known, try to calculate already
export function makeOp(opString: string, args: E.Expression[]): E.OperatorExpression {
  if (!C.Operators.contains(opString)) {
    // TODO Throw better error
    throw new TypeError('Unknown operator (possibly not implemented)');
  }
  const op = opString as C.Operator;

  const definitionMeta = definitions.get(op);
  const { category, arity } = definitionMeta;

  // We can check for arity allready (assuming no programming mistakes) because
  // each (term) argument should already represented by the expressions that
  // generates it.
  // Infinity is used to represent var-args.
  if (!(args.length === arity || arity === Infinity)
    && !(Array.isArray(arity) && arity.indexOf(args.length) >= 0)) {
    throw new InvalidArity(args, op);
  }

  const func = functions.get(op);
  const expressionType = 'operator';
  return { expressionType, func, args };

}

export const functions: Map<C.Operator, E.SPARQLFunc> = definitions.map((def, op) => {
  switch (def.category) {
    case 'simple': return new SimpleFunction(op, def.arity, def.types, def.apply);
    case 'overloaded': return new OverloadedFunction(op, def.arity, def.overloads);
    case 'special': return new def.constructor();
    default: throw new UnexpectedError('Unknown function type.');
  }
}).toMap();
