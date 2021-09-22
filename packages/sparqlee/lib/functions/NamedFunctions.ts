import type * as E from '../expressions';
import type * as C from '../util/Consts';
import { TypeAlias, TypeURL } from '../util/Consts';
import * as Err from '../util/Errors';

import { parseXSDDecimal, parseXSDFloat, parseXSDInteger } from '../util/Parsing';

import type { IOverloadedDefinition } from './Core';
import { bool, dateTime, decimal, declare, double, float, integer, string } from './Helpers';

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

/**
 * https://www.w3.org/TR/xpath-functions/#casting-to-string
 */
const xsdToString = {
  arity: 1,
  overloads: declare(TypeURL.XSD_STRING)
    .onNumeric1(() => (val: E.NumericLiteral) => string(float(val.typedValue).str()))
    .onBoolean1Typed(() => val => string(bool(val).str()))
    .onTerm1(() => (val: E.StringLiteral) => string(val.str()))
    .collect(),
};

const xsdToFloat = {
  arity: 1,
  overloads: declare(TypeURL.XSD_FLOAT)
    .onNumeric1(() => (val: E.NumericLiteral) => float(val.typedValue))
    .onBoolean1Typed(() => val => float(val ? 1 : 0))
    .onUnary(TypeURL.XSD_STRING, () => (val: E.StringLiteral) => {
      const result = parseXSDFloat(val.str());
      if (result === undefined) {
        throw new Err.CastError(val, TypeURL.XSD_FLOAT);
      }
      return float(result);
    })
    .copy({ from: [ TypeURL.XSD_STRING ], to: [ TypeAlias.SPARQL_NON_LEXICAL ]})
    .collect(),
};

const xsdToDouble = {
  arity: 1,
  overloads: declare(TypeURL.XSD_DOUBLE)
    .onNumeric1(() => (val: E.NumericLiteral) => double(val.typedValue))
    .onBoolean1Typed(() => val => double(val ? 1 : 0))
    .onUnary(TypeURL.XSD_STRING, () => (val: E.Term) => {
      const result = parseXSDFloat(val.str());
      if (result === undefined) {
        throw new Err.CastError(val, TypeURL.XSD_DOUBLE);
      }
      return double(result);
    })
    .copy({ from: [ TypeURL.XSD_STRING ], to: [ TypeAlias.SPARQL_NON_LEXICAL ]})
    .collect(),
};

const xsdToDecimal = {
  arity: 1,
  overloads: declare(TypeURL.XSD_DECIMAL)
    .onNumeric1(() => (val: E.Term) => {
      const result = parseXSDDecimal(val.str());
      if (result === undefined) {
        throw new Err.CastError(val, TypeURL.XSD_DECIMAL);
      }
      return decimal(result);
    })
    .onString1(() => (val: E.Term) => {
      const str = val.str();
      const result = /^([+-])?(\d+(\.\d+)?)$/u.test(str) ? parseXSDDecimal(str) : undefined;
      if (result === undefined) {
        throw new Err.CastError(val, TypeURL.XSD_DECIMAL);
      }
      return decimal(result);
    })
    .copy({ from: [ TypeURL.XSD_STRING ], to: [ TypeAlias.SPARQL_NON_LEXICAL ]})
    .onBoolean1Typed(() => val => decimal(val ? 1 : 0))
    .collect(),
};

const xsdToInteger = {
  arity: 1,
  overloads: declare(TypeURL.XSD_INTEGER)
    .onBoolean1Typed(() => val => integer(val ? 1 : 0))
    .onNumeric1(() => (val: E.Term) => {
      const result = parseXSDInteger(val.str());
      if (result === undefined) {
        throw new Err.CastError(val, TypeURL.XSD_INTEGER);
      }
      return integer(result);
    })
    .onString1(() => (val: E.Term) => {
      const str = val.str();
      const result = /^\d+$/u.test(str) ? parseXSDInteger(str) : undefined;
      if (result === undefined) {
        throw new Err.CastError(val, TypeURL.XSD_INTEGER);
      }
      return integer(result);
    })
    .copy({ from: [ TypeAlias.SPARQL_NUMERIC ], to: [ TypeAlias.SPARQL_NON_LEXICAL ]})
    .collect(),
};

const xsdToDatetime = {
  arity: 1,
  overloads: declare(TypeURL.XSD_DATE_TIME)
    .onUnary(TypeURL.XSD_DATE_TIME, () => (val: E.DateTimeLiteral) => val)
    .onUnary(TypeURL.XSD_STRING, () => (val: Term) => {
      const date = new Date(val.str());
      if (Number.isNaN(date.getTime())) {
        throw new Err.CastError(val, TypeURL.XSD_DATE_TIME);
      }
      return dateTime(date, val.str());
    })
    .copy({ from: [ TypeURL.XSD_STRING ], to: [ TypeAlias.SPARQL_NON_LEXICAL ]})
    .collect(),
};

const xsdToBoolean = {
  arity: 1,
  overloads: declare(TypeURL.XSD_BOOLEAN)
    .onNumeric1(() => (val: E.NumericLiteral) => bool(val.coerceEBV()))
    .onUnary(TypeURL.XSD_BOOLEAN, () => (val: Term) => bool(val.coerceEBV()))
    .onUnary(TypeURL.XSD_STRING, () => (val: Term) => {
      switch (val.str()) {
        case 'true':
          return bool(true);
        case 'false':
          return bool(false);
        case '1':
          return bool(true);
        case '0':
          return bool(false);
        default:
          throw new Err.CastError(val, TypeURL.XSD_BOOLEAN);
      }
    })
    .copy({ from: [ TypeURL.XSD_STRING ], to: [ TypeAlias.SPARQL_NON_LEXICAL ]})
    .collect(),
};

// End definitions.
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------

export const namedDefinitions: Record<C.NamedOperator, IOverloadedDefinition> = {
  // --------------------------------------------------------------------------
  // XPath Constructor functions
  // https://www.w3.org/TR/sparql11-query/#FunctionMapping
  // --------------------------------------------------------------------------
  [TypeURL.XSD_STRING]: xsdToString,
  [TypeURL.XSD_FLOAT]: xsdToFloat,
  [TypeURL.XSD_DOUBLE]: xsdToDouble,
  [TypeURL.XSD_DECIMAL]: xsdToDecimal,
  [TypeURL.XSD_INTEGER]: xsdToInteger,
  [TypeURL.XSD_DATE_TIME]: xsdToDatetime,
  [TypeURL.XSD_DATE]: xsdToDatetime,
  [TypeURL.XSD_BOOLEAN]: xsdToBoolean,
};
