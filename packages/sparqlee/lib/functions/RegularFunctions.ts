import * as hasha from 'hasha';
import { Map } from 'immutable';

import * as E from '../expressions';
import * as C from '../util/Consts';
import * as Err from '../util/Errors';
import * as P from '../util/Parsing';
import * as X from './XPathFunctions';

import { TypeURL as Type } from '../util/Consts';

import { OverloadMap } from './FunctionClasses';
import { bool, declare, number, string } from './Helpers';

type Term = E.TermExpression;

// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// Begin definitions

// ----------------------------------------------------------------------------
// Operator Mapping
// https://www.w3.org/TR/sparql11-query/#OperatorMapping
// ----------------------------------------------------------------------------

const not = {
  arity: 1,
  overloads: declare()
    .onTerm1((val: Term) => bool(!val.coerceEBV()))
    .collect(),
};

const unaryPlus = {
  arity: 1,
  overloads: declare()
    .onNumeric1((val: E.NumericLiteral) => {
      return number(val.typedValue, val.typeURL.value as Type);
    })
    .collect(),
};

const unaryMinus = {
  arity: 1,
  overloads: declare()
    .onNumeric1((val: E.NumericLiteral) => {
      return number(-val.typedValue, val.typeURL.value as Type);
    })
    .collect(),
};

const multiplication = {
  arity: 2,
  overloads: declare()
    .arithmetic((left, right) => left * right)
    .collect(),
};

const division = {
  arity: 2,
  overloads: declare()
    .arithmetic((left, right) => left / right)
    .onBinaryTyped(['integer', 'integer'],
      (left: number, right: number) => {
        if (right === 0) {
          throw new Err.ExpressionError('Integer division by 0');
        }
        return number(left / right, Type.XSD_DECIMAL);
      })
    .collect(),
};

const addition = {
  arity: 2,
  overloads: declare()
    .arithmetic((left, right) => left + right)
    .collect(),
};

const subtraction = {
  arity: 2,
  overloads: declare()
    .arithmetic((left, right) => left - right)
    .collect(),
};

// https://www.w3.org/TR/sparql11-query/#func-RDFterm-equal
const equality = {
  arity: 2,
  overloads: declare()
    .numberTest((left, right) => left === right)
    .stringTest((left, right) => left.localeCompare(right) === 0)
    .booleanTest((left, right) => left === right)
    .dateTimeTest((left, right) => left.getTime() === right.getTime())
    .set(['term', 'term'],
      ([left, right]) => bool(RDFTermEqual(left, right)),
    )
    .collect(),
};

function RDFTermEqual(_left: Term, _right: Term) {
  const left = _left.toRDF();
  const right = _right.toRDF();
  const val = left.equals(right);
  if ((left.termType === 'Literal') && (right.termType === 'Literal')) {
    throw new Err.RDFEqualTypeError([_left, _right]);
  }
  return val;
}

const inequality = {
  arity: 2,
  overloads: declare()
    .numberTest((left, right) => left !== right)
    .stringTest((left, right) => left.localeCompare(right) !== 0)
    .booleanTest((left, right) => left !== right)
    .dateTimeTest((left, right) => left.getTime() !== right.getTime())
    .set(['term', 'term'],
      ([left, right]) => bool(!RDFTermEqual(left, right)),
    )
    .collect(),
};

const lesserThan = {
  arity: 2,
  overloads: declare()
    .numberTest((left, right) => left < right)
    .stringTest((left, right) => left.localeCompare(right) === -1)
    .booleanTest((left, right) => left < right)
    .dateTimeTest((left, right) => left.getTime() < right.getTime())
    .collect(),
};

const greaterThan = {
  arity: 2,
  overloads: declare()
    .numberTest((left, right) => left > right)
    .stringTest((left, right) => left.localeCompare(right) === 1)
    .booleanTest((left, right) => left > right)
    .dateTimeTest((left, right) => left.getTime() > right.getTime())
    .collect(),
};

const lesserThanEqual = {
  arity: 2,
  overloads: declare()
    .numberTest((left, right) => left <= right)
    .stringTest((left, right) => left.localeCompare(right) !== 1)
    .booleanTest((left, right) => left <= right)
    .dateTimeTest((left, right) => left.getTime() <= right.getTime())
    .collect(),
};

const greaterThanEqual = {
  arity: 2,
  overloads: declare()
    .numberTest((left, right) => left >= right)
    .stringTest((left, right) => left.localeCompare(right) !== -1)
    .booleanTest((left, right) => left >= right)
    .dateTimeTest((left, right) => left.getTime() >= right.getTime())
    .collect(),
};

// ----------------------------------------------------------------------------
// Functions on RDF Terms
// https://www.w3.org/TR/sparql11-query/#func-rdfTerms
// ----------------------------------------------------------------------------

const isIRI = {
  arity: 1,
  overloads: declare().unimplemented('isIRI').collect(),
};

const isBlank = {
  arity: 1,
  overloads: declare().unimplemented('isBlank').collect(),
};

const isLiteral = {
  arity: 1,
  overloads: declare().unimplemented('isLiteral').collect(),
};

const isNumeric = {
  arity: 1,
  overloads: declare().unimplemented('isNumeric').collect(),
};

const toString = {
  arity: 1,
  overloads: declare()
    .onTerm1((term) => string(term.str()))
    .collect(),
};

const lang = {
  arity: 1,
  overloads: declare().onLiteral1((lit) => string(lit.language || '')).collect(),
};

const datatype = {
  arity: 1,
  overloads: declare().onLiteral1(
    (lit) => new E.NamedNode(lit.typeURL.value),
  ).collect(),
};

const IRI = {
  arity: 1,
  overloads: declare().unimplemented('IRI').collect(),
};

// https://www.w3.org/TR/sparql11-query/#func-bnode
// id has to be distinct over all id's in dataset
const BNODE = {
  arity: [0, 1],
  overloads: declare()
    // .set([], () => new E.BlankNode()) // TODO
    .onString1Typed((val) => new E.BlankNode(val))
    .collect(),
};

const STRDT = {
  arity: 2,
  overloads: declare().unimplemented('STRDT').collect(),
};

const STRLANG = {
  arity: 2,
  overloads: declare().unimplemented('STRLANG').collect(),
};

const UUID = {
  arity: 0,
  overloads: declare().unimplemented('UUID').collect(),
};

const STRUUID = {
  arity: 0,
  overloads: declare().unimplemented('STRUUID').collect(),
};

// ----------------------------------------------------------------------------
// Functions on strings
// https://www.w3.org/TR/sparql11-query/#func-forms
// ----------------------------------------------------------------------------

const STRLEN = {
  arity: 1,
  overloads: declare()
    .onLiteral1<string>((lit) => number(lit.typedValue.length, Type.XSD_INTEGER))
    .collect(),
};

const SUBSTR = {
  arity: [2, 3],
  overloads: declare().unimplemented('SUBSTR').collect(),
};

const UCASE = {
  arity: 1,
  overloads: declare().unimplemented('UCASE').collect(),
};

const LCASE = {
  arity: 1,
  overloads: declare().unimplemented('LCASE').collect(),
};

const STRSTARTS = {
  arity: 2,
  overloads: declare().unimplemented('STRSTARTS').collect(),
};

const STRENDS = {
  arity: 2,
  overloads: declare().unimplemented('STRENDS').collect(),
};

const CONTAINS = {
  arity: 2,
  overloads: declare().unimplemented('CONTAINS').collect(),
};

const STRBEFORE = {
  arity: 2,
  overloads: declare().unimplemented('STRBEFORE').collect(),
};

const STRAFTER = {
  arity: 2,
  overloads: declare().unimplemented('STRAFTER').collect(),
};

const ENCODE_FOR_URI = {
  arity: 1,
  overloads: declare().unimplemented('ENCODE_FOR_URI').collect(),
};

const CONCAT = {
  arity: Infinity,
  overloads: declare().unimplemented('CONCAT').collect(),
};

const langmatches = {
  arity: 2,
  overloads: declare()
    .onBinaryTyped(
      ['string', 'string'],
      (tag: string, range: string) => bool(X.langMatches(tag, range)),
    ).collect(),
};

const regex2 = (text: string, pattern: string) => bool(X.matches(text, pattern));
const regex3 = (text: string, pattern: string, flags: string) => bool(X.matches(text, pattern, flags));
const REGEX = {
  arity: [2, 3],
  overloads: declare()
    .onBinaryTyped(['string', 'string'], regex2)
    .onBinaryTyped(['langString', 'langString'], regex2)
    .onTernaryTyped(['string', 'string', 'string'], regex3)
    .onTernaryTyped(['langString', 'string', 'string'], regex3)
    .collect(),
};

const REPLACE = {
  arity: [3, 4],
  overloads: declare().unimplemented('REPLACE').collect(),
};

// ----------------------------------------------------------------------------
// Functions on numerics
// https://www.w3.org/TR/sparql11-query/#func-numerics
// ----------------------------------------------------------------------------

const abs = {
  arity: 1,
  overloads: declare()
    .onNumeric1(
      (num) => number(Math.abs(num.typedValue), num.typeURL.value as C.TypeURL))
    .collect(),
};

const round = {
  arity: 1,
  overloads: declare()
    .onNumeric1(
      (num) => number(Math.round(num.typedValue), num.typeURL.value as C.TypeURL))
    .collect(),
};

const ceil = {
  arity: 1,
  overloads: declare()
    .onNumeric1(
      (num) => number(Math.ceil(num.typedValue), num.typeURL.value as C.TypeURL))
    .collect(),
};

const floor = {
  arity: 1,
  overloads: declare()
    .onNumeric1(
      (num) => number(Math.floor(num.typedValue), num.typeURL.value as C.TypeURL))
    .collect(),
};

const rand = {
  arity: 0,
  overloads: declare()
    .set([], () => number(Math.random(), Type.XSD_DOUBLE))
    .collect(),
};

// ----------------------------------------------------------------------------
// Functions on Dates and Times
// https://www.w3.org/TR/sparql11-query/#func-date-time
// ----------------------------------------------------------------------------

function parseDate(dateLit: E.DateTimeLiteral): P.SplittedDate {
  // TODO: This is assuming datelits always have a string
  return P.parseXSDDateTime(dateLit.strValue);
}

const now = {
  arity: 0,
  overloads: declare().unimplemented('now').collect(),
};

const year = {
  arity: 1,
  overloads: declare()
    .onDateTime1(
      (date) => number(Number(parseDate(date).year), Type.XSD_INTEGER))
    .collect(),
};

const month = {
  arity: 1,
  overloads: declare()
    .onDateTime1(
      (date) => number(Number(parseDate(date).month), Type.XSD_INTEGER))
    .collect(),
};

const day = {
  arity: 1,
  overloads: declare()
    .onDateTime1(
      (date) => number(Number(parseDate(date).day), Type.XSD_INTEGER))
    .collect(),
};

const hours = {
  arity: 1,
  overloads: declare()
    .onDateTime1(
      (date) => number(Number(parseDate(date).hours), Type.XSD_INTEGER))
    .collect(),
};

const minutes = {
  arity: 1,
  overloads: declare()
    .onDateTime1(
      (date) => number(Number(parseDate(date).minutes), Type.XSD_INTEGER))
    .collect(),
};

const seconds = {
  arity: 1,
  overloads: declare()
    .onDateTime1(
      (date) => number(Number(parseDate(date).seconds), Type.XSD_DECIMAL))
    .collect(),
};

const timezone = {
  arity: 1,
  overloads: declare()
    .onDateTime1(
      (date) => {
        const duration = X.formatDayTimeDuration(parseDate(date).timezone);
        if (!duration) {
          throw new Err.InvalidTimezoneCall(date.strValue);
        }
        return new E.Literal(duration, C.make(Type.XSD_DAYTIME_DURATION), duration);
      },
    )
    .collect(),
};

const tz = {
  arity: 1,
  overloads: declare()
    .onDateTime1(
      (date) => string(parseDate(date).timezone))
    .collect(),
};

// ----------------------------------------------------------------------------
// Hash functions
// https://www.w3.org/TR/sparql11-query/#func-hash
// ----------------------------------------------------------------------------

const MD5 = {
  arity: 1,
  overloads: declare()
    .onString1Typed((str) => string(hasha(str, { algorithm: 'md5' })))
    .collect(),
};

const SHA1 = {
  arity: 1,
  overloads: declare()
    .onString1Typed((str) => string(hasha(str, { algorithm: 'sha1' })))
    .collect(),
};

const SHA256 = {
  arity: 1,
  overloads: declare()
    .onString1Typed((str) => string(hasha(str, { algorithm: 'sha256' })))
    .collect(),
};

const SHA384 = {
  arity: 1,
  overloads: declare()
    .onString1Typed((str) => string(hasha(str, { algorithm: 'sha384' })))
    .collect(),
};

const SHA512 = {
  arity: 1,
  overloads: declare()
    .onString1Typed((str) => string(hasha(str, { algorithm: 'sha512' })))
    .collect(),
};

// End definitions.
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------

/*
 * Collect all the definitions from above into an object
 */
const _definitions: { [key in C.RegularOperator]: Definition } = {
  // --------------------------------------------------------------------------
  // Operator Mapping
  // https://www.w3.org/TR/sparql11-query/#OperatorMapping
  // --------------------------------------------------------------------------
  '!': not,
  'UPLUS': unaryPlus,
  'UMINUS': unaryMinus,
  '*': multiplication,
  '/': division,
  '+': addition,
  '-': subtraction,
  '=': equality,
  '!=': inequality,
  '<': lesserThan,
  '>': greaterThan,
  '<=': lesserThanEqual,
  '>=': greaterThanEqual,

  // --------------------------------------------------------------------------
  // Functions on RDF Terms
  // https://www.w3.org/TR/sparql11-query/#func-rdfTerms
  // --------------------------------------------------------------------------
  'isIRI': isIRI,
  'isBlank': isBlank,
  'isLiteral': isLiteral,
  'isNumeric': isNumeric,
  'str': toString,
  'lang': lang,
  'datatype': datatype,
  'IRI': IRI,
  'BNODE': BNODE,
  'STRDT': STRDT,
  'STRLANG': STRLANG,
  'UUID': UUID,
  'STRUUID': STRUUID,

  // --------------------------------------------------------------------------
  // Functions on strings
  // https://www.w3.org/TR/sparql11-query/#func-forms
  // --------------------------------------------------------------------------
  'strlen': STRLEN,
  'SUBSTR': SUBSTR,
  'UCASE': UCASE,
  'LCASE': LCASE,
  'STRSTARTS': STRSTARTS,
  'STRENDS': STRENDS,
  'CONTAINS': CONTAINS,
  'STRBEFORE': STRBEFORE,
  'STRAFTER': STRAFTER,
  'ENCODE_FOR_URI': ENCODE_FOR_URI,
  'CONCAT': CONCAT,
  'langmatches': langmatches,
  'regex': REGEX,
  'REPLACE': REPLACE,

  // --------------------------------------------------------------------------
  // Functions on numerics
  // https://www.w3.org/TR/sparql11-query/#func-numerics
  // --------------------------------------------------------------------------
  'abs': abs,
  'round': round,
  'ceil': ceil,
  'floor': floor,
  'rand': rand,

  // --------------------------------------------------------------------------
  // Functions on Dates and Times
  // https://www.w3.org/TR/sparql11-query/#func-date-time
  // --------------------------------------------------------------------------
  'now': now,
  'year': year,
  'month': month,
  'day': day,
  'hours': hours,
  'minutes': minutes,
  'seconds': seconds,
  'timezone': timezone,
  'tz': tz,

  // --------------------------------------------------------------------------
  // Hash functions
  // https://www.w3.org/TR/sparql11-query/#func-hash
  // --------------------------------------------------------------------------
  'md5': MD5,
  'sha1': SHA1,
  'sha256': SHA256,
  'sha384': SHA384,
  'sha512': SHA512,
};

// ----------------------------------------------------------------------------
// The definitions and functionality for all operators
// ----------------------------------------------------------------------------

export interface Definition {
  arity: number | number[];
  overloads: OverloadMap;
}

export const definitions = Map<C.RegularOperator, Definition>(_definitions);
