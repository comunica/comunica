import { Map } from 'immutable';

import * as C from '../../util/Consts';
import * as Err from '../../util/Errors';
import * as E from '../Expressions';

import { TypeURL as Type } from '../../util/Consts';
import { parseXSDDecimal, parseXSDFloat, parseXSDInteger } from '../../util/Parsing';

import { OverloadMap } from './FunctionClasses';
import { bool, dateTime, declare, number, string } from './Helpers';

type Term = E.TermExpression;

// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// Begin definitions.

// ----------------------------------------------------------------------------
// XPath Constructor functions
// https://www.w3.org/TR/sparql11-query/#FunctionMapping
// ----------------------------------------------------------------------------

const toString = {
  arity: 1,
  overloads: declare()
    .onTerm1((term) => string(term.str()))
    .collect(),
};

const toFloat = {
  arity: 1,
  overloads: declare()
    .onNumeric1((val: E.NumericLiteral) => number(val.typedValue))
    .setLitUnary('boolean', (val: boolean) => number(val ? 1 : 0))
    .setUnary('string', (val: E.StringLiteral) => {
      const result = parseXSDFloat(val.str());
      if (!result) { throw new Err.CastError(val, Type.XSD_FLOAT); }
      return number(result);
    })
    .copyTo(['nonlexical'])
    .collect(),
};

const toDouble = {
  arity: 1,
  overloads: declare()
    .onNumeric1((val: E.NumericLiteral) => number(val.typedValue, Type.XSD_DOUBLE))
    .setLitUnary('boolean', (val: boolean) => number(val ? 1 : 0, Type.XSD_DOUBLE))
    .setUnary('string', (val: E.Term) => {
      const result = parseXSDFloat(val.str());
      if (!result) { throw new Err.CastError(val, Type.XSD_DOUBLE); }
      return number(result, Type.XSD_DOUBLE);
    })
    .copyTo(['nonlexical'])
    .collect(),
};

const toDecimal = {
  arity: 1,
  overloads: declare()
    .onNumeric1((val: E.Term) => {
      const result = parseXSDDecimal(val.str());
      if (!result) { throw new Err.CastError(val, Type.XSD_DECIMAL); }
      return number(result, Type.XSD_DECIMAL);
    })
    .copyTo(['string'])
    .copyTo(['nonlexical'])
    .setLitUnary('boolean', (val: boolean) => number(val ? 1 : 0, Type.XSD_DECIMAL))
    .collect(),
};

const toInteger = {
  arity: 1,
  overloads: declare()
    .setLitUnary('boolean', (val: boolean) => number(val ? 1 : 0, Type.XSD_INTEGER))
    .onNumeric1((val: E.Term) => {
      const result = parseXSDInteger(val.str());
      if (!result) { throw new Err.CastError(val, Type.XSD_INTEGER); }
      return number(result, Type.XSD_INTEGER);
    })
    .copyTo(['string'])
    .copyTo(['nonlexical'])
    .collect(),
};

const toDatetime = {
  arity: 1,
  overloads: declare()
    .setLitUnary('date', (val: Date) => dateTime(val))
    .setUnary('string', (val: Term) => {
      const date = new Date(val.str());
      if (isNaN(date.getTime())) {
        throw new Err.CastError(val, Type.XSD_DATE_TIME);
      }
      return dateTime(date);
    })
    .copyTo(['nonlexical'])
    .collect(),
};

const toBoolean = {
  arity: 1,
  overloads: declare()
    .onNumeric1((val: E.NumericLiteral) => bool(val.coerceEBV()))
    .setUnary('boolean', (val: Term) => val)
    .setUnary('string', (val: Term) => {
      const str = val.str();
      if (str !== 'true' && str !== 'false') {
        throw new Err.CastError(val, Type.XSD_BOOLEAN);
      }
      return bool((str === 'true'));
    })
    .copyTo(['nonlexical'])
    .collect(),
};

// End definitions.
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------

const _definitions: { [key in C.NamedOperator]: Definition } = {
  // --------------------------------------------------------------------------
  // XPath Constructor functions
  // https://www.w3.org/TR/sparql11-query/#FunctionMapping
  // --------------------------------------------------------------------------
  str: toString,
  flt: toFloat,
  dbl: toDouble,
  dec: toDecimal,
  int: toInteger,
  dT: toDatetime,
  bool: toBoolean,
};

// ----------------------------------------------------------------------------
// The definitions and functionality for all operators
// ----------------------------------------------------------------------------

export interface Definition {
  arity: number | number[];
  overloads: OverloadMap;
}

export const namedDefinitions = Map<C.NamedOperator, Definition>(_definitions);
