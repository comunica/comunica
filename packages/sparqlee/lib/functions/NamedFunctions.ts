import { Map } from 'immutable';

import * as E from '../expressions';
import * as C from '../util/Consts';
import * as Err from '../util/Errors';

import { TypeURL } from '../util/Consts';
import {
  parseXSDDecimal,
  parseXSDFloat,
  parseXSDInteger,
} from '../util/Parsing';

import { OverloadMap } from './Core';
import { bool, dateTime, declare, number, string } from './Helpers';

type Term = E.TermExpression;

// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// Begin definitions.

// ----------------------------------------------------------------------------
// XPath Constructor functions
// https://www.w3.org/TR/sparql11-query/#
// https://www.w3.org/TR/xpath-functions/#casting-from-primitive-to-primitive
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
    .onBoolean1Typed((val) => number(val ? 1 : 0))
    .onUnary('string', (val: E.StringLiteral) => {
      const result = parseXSDFloat(val.str());
      if (!result) { throw new Err.CastError(val, TypeURL.XSD_FLOAT); }
      return number(result);
    })
    .copy({ from: ['string'], to: ['nonlexical'] })
    .collect(),
};

const toDouble = {
  arity: 1,
  overloads: declare()
    .onNumeric1((val: E.NumericLiteral) => number(val.typedValue, TypeURL.XSD_DOUBLE))
    .onBoolean1Typed((val) => number(val ? 1 : 0, TypeURL.XSD_DOUBLE))
    .onUnary('string', (val: E.Term) => {
      const result = parseXSDFloat(val.str());
      if (!result) { throw new Err.CastError(val, TypeURL.XSD_DOUBLE); }
      return number(result, TypeURL.XSD_DOUBLE);
    })
    .copy({ from: ['string'], to: ['nonlexical'] })
    .collect(),
};

const toDecimal = {
  arity: 1,
  overloads: declare()
    .onNumeric1((val: E.Term) => {
      const result = parseXSDDecimal(val.str());
      if (!result) { throw new Err.CastError(val, TypeURL.XSD_DECIMAL); }
      return number(result, TypeURL.XSD_DECIMAL);
    })
    .copy({ from: ['integer'], to: ['string'] })
    .copy({ from: ['integer'], to: ['nonlexical'] })
    .onBoolean1Typed((val) => number(val ? 1 : 0, TypeURL.XSD_DECIMAL))
    .collect(),
};

const toInteger = {
  arity: 1,
  overloads: declare()
    .onBoolean1Typed((val) => number(val ? 1 : 0, TypeURL.XSD_INTEGER))
    .onNumeric1((val: E.Term) => {
      const result = parseXSDInteger(val.str());
      if (!result) { throw new Err.CastError(val, TypeURL.XSD_INTEGER); }
      return number(result, TypeURL.XSD_INTEGER);
    })
    .copy({ from: ['integer'], to: ['string'] })
    .copy({ from: ['integer'], to: ['nonlexical'] })
    .collect(),
};

const toDatetime = {
  arity: 1,
  overloads: declare()
    .onUnary('date', (val: E.DateTimeLiteral) => val)
    .onUnary('string', (val: Term) => {
      const date = new Date(val.str());
      if (isNaN(date.getTime())) {
        throw new Err.CastError(val, TypeURL.XSD_DATE_TIME);
      }
      return dateTime(date, val.str());
    })
    .copy({ from: ['string'], to: ['nonlexical'] })
    .collect(),
};

const toBoolean = {
  arity: 1,
  overloads: declare()
    .onNumeric1((val: E.NumericLiteral) => bool(val.coerceEBV()))
    .onUnary('boolean', (val: Term) => val)
    .onUnary('string', (val: Term) => {
      const str = val.str();
      if (str !== 'true' && str !== 'false') {
        throw new Err.CastError(val, TypeURL.XSD_BOOLEAN);
      }
      return bool((str === 'true'));
    })
    .copy({ from: ['string'], to: ['nonlexical'] })
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
  [TypeURL.XSD_STRING]: toString,
  [TypeURL.XSD_FLOAT]: toFloat,
  [TypeURL.XSD_DOUBLE]: toDouble,
  [TypeURL.XSD_DECIMAL]: toDecimal,
  [TypeURL.XSD_INTEGER]: toInteger,
  [TypeURL.XSD_DATE_TIME]: toDatetime,
  [TypeURL.XSD_DATE]: toDatetime,
  [TypeURL.XSD_BOOLEAN]: toBoolean,
};

// ----------------------------------------------------------------------------
// The definitions and functionality for all operators
// ----------------------------------------------------------------------------

export interface Definition {
  arity: number | number[];
  overloads: OverloadMap;
}

export const namedDefinitions = Map<C.NamedOperator, Definition>(_definitions);
