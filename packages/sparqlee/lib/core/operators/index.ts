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
    throw new TypeError("Unknown operator");
  }
  const op = opString as C.Operator;

  const definitionMeta = definitions.get(op);
  const { category, arity, definition } = definitionMeta;

  if (!definition) { throw new UnimplementedError(); }

  // We can check for arity allready (assuming no programming mistakes) because
  // each (term) argument should already represented by the expressions that
  // generates it.
  // Infinity is used to represent var-args.
  if (args.length !== arity && arity !== Infinity) {
    throw new InvalidArity(args, op);
  }

  const func = functions.get(op);
  const expressionType = 'operator';
  return { expressionType, func, args };

}

export const functions: Map<C.Operator, E.SPARQLFunc> = definitions.map((def, op) => {
  const { category, arity, definition } = def;
  switch (category) {
    case 'simple': {
      const { types, apply } = definition as SimpleDefinition;
      return new SimpleFunction(op, arity, types, apply);
    }
    case 'overloaded': {
      const overloadMap = definition as OverloadedDefinition;
      return new OverloadedFunction(op, arity, overloadMap);
    }
    case 'special': {
      // tslint:disable-next-line:variable-name
      const SpecialFunc = definition as SpecialDefinition;
      return new SpecialFunc(op);
    }
    default: throw new UnexpectedError('Unknown function type.');
  }
}).toMap();
