import * as RDFDM from '@rdfjs/data-model';
import * as hash from 'create-hash';
import {Decimal} from 'decimal.js';
import * as uuid from 'uuid';

import { Map } from 'immutable';

import * as E from '../expressions';
import * as C from '../util/Consts';
import * as Err from '../util/Errors';
import * as P from '../util/Parsing';
import * as X from './XPathFunctions';

import { TypeURL } from '../util/Consts';

import { transformLiteral } from '../Transformation';
import { OverloadMap } from './Core';
import { bool, declare, langString, log, number, string } from './Helpers';

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
    .onTerm1((val) => bool(!val.coerceEBV()))
    .collect(),
};

const unaryPlus = {
  arity: 1,
  overloads: declare()
    .onNumeric1((val) => number(val.typedValue, val.typeURL.value as TypeURL))
    .collect(),
};

const unaryMinus = {
  arity: 1,
  overloads: declare()
    .onNumeric1((val) => number(-val.typedValue, val.typeURL.value as TypeURL))
    .collect(),
};

const multiplication = {
  arity: 2,
  overloads: declare()
    .arithmetic((left, right) => Decimal.mul(left, right).toNumber())
    .collect(),
};

const division = {
  arity: 2,
  overloads: declare()
    .arithmetic((left, right) => Decimal.div(left, right).toNumber())
    .onBinaryTyped(
      ['integer', 'integer'],
      (left: number, right: number) => {
        if (right === 0) {
          throw new Err.ExpressionError('Integer division by 0');
        }
        return number(Decimal.div(left, right).toNumber(), TypeURL.XSD_DECIMAL);
      })
    .collect(),
};

const addition = {
  arity: 2,
  overloads: declare()
    .arithmetic((left, right) => Decimal.add(left, right).toNumber())
    .collect(),
};

const subtraction = {
  arity: 2,
  overloads: declare()
    .arithmetic((left, right) => Decimal.sub(left, right).toNumber())
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
    .set(
      ['term', 'term'],
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
    .set(
      ['term', 'term'],
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
  overloads: declare()
    .onTerm1((term) => bool(term.termType === 'namedNode'))
    .collect(),
};

const isBlank = {
  arity: 1,
  overloads: declare()
    .onTerm1((term) => bool(term.termType === 'blankNode'))
    .collect(),
};

const isLiteral = {
  arity: 1,
  overloads: declare()
    .onTerm1((term) => bool(term.termType === 'literal'))
    .collect(),
};

const isNumeric = {
  arity: 1,
  overloads: declare()
    .onNumeric1((term) => bool(true))
    .onTerm1((term) => bool(false))
    .collect(),
};

const toString = {
  arity: 1,
  overloads: declare()
    .onTerm1((term) => string(term.str()))
    .collect(),
};

const lang = {
  arity: 1,
  overloads: declare()
    .onLiteral1((lit) => string(lit.language || ''))
    .collect(),
};

const datatype = {
  arity: 1,
  overloads: declare()
    .onLiteral1((lit) => new E.NamedNode(lit.typeURL.value))
    .collect(),
};

// See special operators
// const IRI = {};

// See special functions
// const BNODE = {};

const STRDT = {
  arity: 2,
  overloads: declare()
    .onBinary(
      ['string', 'namedNode'],
      (str: E.StringLiteral, iri: E.NamedNode) => {
        const lit = RDFDM.literal(str.typedValue, RDFDM.namedNode(iri.value));
        return transformLiteral(lit);
      })
    .collect(),
};

const STRLANG = {
  arity: 2,
  overloads: declare()
    .onBinaryTyped(
      ['string', 'string'],
      (val: string, language: string) => new E.LangStringLiteral(val, language.toLowerCase()),
    )
    .collect(),
};

const UUID = {
  arity: 0,
  overloads: declare()
    .set([], () => new E.NamedNode(`urn:uuid:${uuid.v4()}`))
    .collect(),
};

const STRUUID = {
  arity: 0,
  overloads: declare()
    .set([], () => string(uuid.v4()))
    .collect(),
};

// ----------------------------------------------------------------------------
// Functions on strings
// https://www.w3.org/TR/sparql11-query/#func-forms
// ----------------------------------------------------------------------------

const STRLEN = {
  arity: 1,
  overloads: declare()
    .onStringly1((str) => number(str.typedValue.length, TypeURL.XSD_INTEGER))
    .collect(),
};

const SUBSTR = {
  arity: [2, 3],
  overloads: declare()
    .onBinaryTyped(
      ['string', 'integer'],
      (source: string, startingLoc: number) => {
        return string(source.substr(startingLoc - 1));
      })
    .onBinary(
      ['langString', 'integer'],
      (source: E.LangStringLiteral, startingLoc: E.NumericLiteral) => {
        const sub = source.typedValue.substr(startingLoc.typedValue - 1);
        return langString(sub, source.language);
      })
    .onTernaryTyped(['string', 'integer', 'integer'],
      (source: string, startingLoc: number, length: number) => {
        return string(source.substr(startingLoc - 1, length));
      })
    .onTernary(['langString', 'integer', 'integer'],
      (source: E.LangStringLiteral, startingLoc: E.NumericLiteral, length: E.NumericLiteral) => {
        const sub = source.typedValue.substr(startingLoc.typedValue - 1, length.typedValue);
        return langString(sub, source.language);
      })
    .collect(),
};

const UCASE = {
  arity: 1,
  overloads: declare()
    .onString1Typed((lit) => string(lit.toUpperCase()))
    .onLangString1((lit) => langString(lit.typedValue.toUpperCase(), lit.language))
    .collect(),
};

const LCASE = {
  arity: 1,
  overloads: declare()
    .onString1Typed((lit) => string(lit.toLowerCase()))
    .onLangString1((lit) => langString(lit.typedValue.toLowerCase(), lit.language))
    .collect(),
};

const STRSTARTS = {
  arity: 2,
  overloads: declare()
    .onBinaryTyped(
      ['string', 'string'],
      (arg1: string, arg2: string) => bool(arg1.startsWith(arg2)),
    )
    .onBinaryTyped(
      ['langString', 'string'],
      (arg1: string, arg2: string) => bool(arg1.includes(arg2)),
    )
    .onBinary(
      ['langString', 'langString'],
      (arg1: E.LangStringLiteral, arg2: E.LangStringLiteral) => {
        if (arg1.language !== arg2.language) {
          throw new Err.IncompatibleLanguageOperation(arg1, arg2);
        }
        return bool(arg1.typedValue.startsWith(arg2.typedValue));
      })
    .collect(),
};

const STRENDS = {
  arity: 2,
  overloads: declare()
    .onBinaryTyped(
      ['string', 'string'],
      (arg1: string, arg2: string) => bool(arg1.endsWith(arg2)),
    )
    .onBinaryTyped(
      ['langString', 'string'],
      (arg1: string, arg2: string) => bool(arg1.includes(arg2)),
    )
    .onBinary(
      ['langString', 'langString'],
      (arg1: E.LangStringLiteral, arg2: E.LangStringLiteral) => {
        if (arg1.language !== arg2.language) {
          throw new Err.IncompatibleLanguageOperation(arg1, arg2);
        }
        return bool(arg1.typedValue.endsWith(arg2.typedValue));
      })
    .collect(),
};

const CONTAINS = {
  arity: 2,
  overloads: declare()
    .onBinaryTyped(
      ['string', 'string'],
      (arg1: string, arg2: string) => bool(arg1.includes(arg2)),
    )
    .onBinaryTyped(
      ['langString', 'string'],
      (arg1: string, arg2: string) => bool(arg1.includes(arg2)),
    )
    .onBinary(
      ['langString', 'langString'],
      (arg1: E.LangStringLiteral, arg2: E.LangStringLiteral) => {
        if (arg1.language !== arg2.language) {
          throw new Err.IncompatibleLanguageOperation(arg1, arg2);
        }
        return bool(arg1.typedValue.includes(arg2.typedValue));
      })
    .collect(),
};

const STRBEFORE = {
  arity: 2,
  overloads: declare()
    .onBinaryTyped(
      ['string', 'string'],
      (arg1: string, arg2: string) => string(arg1.substr(0, arg1.indexOf(arg2))),
    )
    .onBinary(
      ['langString', 'string'],
      (arg1: E.LangStringLiteral, arg2: E.StringLiteral) => {
        const [a1, a2] = [arg1.typedValue, arg2.typedValue];
        const sub = arg1.typedValue.substr(0, a1.indexOf(a2));
        return (sub || !a2) ? langString(sub, arg1.language) : string(sub);
      },
    )
    .onBinary(
      ['langString', 'langString'],
      (arg1: E.LangStringLiteral, arg2: E.LangStringLiteral) => {
        if (arg1.language !== arg2.language) {
          throw new Err.IncompatibleLanguageOperation(arg1, arg2);
        }
        const [a1, a2] = [arg1.typedValue, arg2.typedValue];
        const sub = arg1.typedValue.substr(0, a1.indexOf(a2));
        return (sub || !a2) ? langString(sub, arg1.language) : string(sub);
      })
    .collect(),
};

const STRAFTER = {
  arity: 2,
  overloads: declare()
    .onBinaryTyped(
      ['string', 'string'],
      (arg1: string, arg2: string) => string(arg1.substr(arg1.indexOf(arg2)).substr(arg2.length)),
    )
    .onBinary(
      ['langString', 'string'],
      (arg1: E.LangStringLiteral, arg2: E.StringLiteral) => {
        const [a1, a2] = [arg1.typedValue, arg2.typedValue];
        const sub = a1.substr(a1.indexOf(a2)).substr(a2.length);
        return (sub || !a2) ? langString(sub, arg1.language) : string(sub);
      },
    )
    .onBinary(
      ['langString', 'langString'],
      (arg1: E.LangStringLiteral, arg2: E.LangStringLiteral) => {
        if (arg1.language !== arg2.language) {
          throw new Err.IncompatibleLanguageOperation(arg1, arg2);
        }
        const [a1, a2] = [arg1.typedValue, arg2.typedValue];
        const sub = a1.substr(a1.indexOf(a2)).substr(a2.length);
        return (sub || !a2) ? langString(sub, arg1.language) : string(sub);
      })
    .collect(),
};

const ENCODE_FOR_URI = {
  arity: 1,
  overloads: declare()
    .onStringly1Typed((val) => string(encodeURI(val))).collect(),
};

// See special operators
// const CONCAT = {}

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
    .onBinaryTyped(['langString', 'string'], regex2)
    .onTernaryTyped(['string', 'string', 'string'], regex3)
    .onTernaryTyped(['langString', 'string', 'string'], regex3)
    .collect(),
};

const REPLACE = {
  arity: [3, 4],
  overloads: declare()
    .onTernaryTyped(
      ['string', 'string', 'string'],
      (arg: string, pattern: string, replacement: string) =>
        string(X.replace(arg, pattern, replacement)),
    )
    .set(
      ['langString', 'string', 'string'],
      ([arg, pattern, replacement]: [E.LangStringLiteral, E.StringLiteral, E.StringLiteral]) => {
        const result = X.replace(arg.typedValue, pattern.typedValue, replacement.typedValue);
        return langString(result, arg.language);
      },
    )
    .onQuaternaryTyped(
      ['string', 'string', 'string', 'string'],
      (arg: string, pattern: string, replacement: string, flags: string) =>
        string(X.replace(arg, pattern, replacement, flags)),
    )
    .set(
      ['langString', 'string', 'string', 'string'],
      ([arg, pattern, replacement, flags]
        : [E.LangStringLiteral, E.StringLiteral, E.StringLiteral, E.StringLiteral]) => {
        const result = X.replace(arg.typedValue, pattern.typedValue, replacement.typedValue, flags.typedValue);
        return langString(result, arg.language);
      },
    )
    .collect(),
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
    .set([], () => number(Math.random(), TypeURL.XSD_DOUBLE))
    .collect(),
};

// ----------------------------------------------------------------------------
// Functions on Dates and Times
// https://www.w3.org/TR/sparql11-query/#func-date-time
// ----------------------------------------------------------------------------

function parseDate(dateLit: E.DateTimeLiteral): P.SplittedDate {
  return P.parseXSDDateTime(dateLit.str());
}

// See special operators
// const now = {};

const year = {
  arity: 1,
  overloads: declare()
    .onDateTime1(
      (date) => number(Number(parseDate(date).year), TypeURL.XSD_INTEGER))
    .collect(),
};

const month = {
  arity: 1,
  overloads: declare()
    .onDateTime1(
      (date) => number(Number(parseDate(date).month), TypeURL.XSD_INTEGER))
    .collect(),
};

const day = {
  arity: 1,
  overloads: declare()
    .onDateTime1(
      (date) => number(Number(parseDate(date).day), TypeURL.XSD_INTEGER))
    .collect(),
};

const hours = {
  arity: 1,
  overloads: declare()
    .onDateTime1(
      (date) => number(Number(parseDate(date).hours), TypeURL.XSD_INTEGER))
    .collect(),
};

const minutes = {
  arity: 1,
  overloads: declare()
    .onDateTime1(
      (date) => number(Number(parseDate(date).minutes), TypeURL.XSD_INTEGER))
    .collect(),
};

const seconds = {
  arity: 1,
  overloads: declare()
    .onDateTime1(
      (date) => number(Number(parseDate(date).seconds), TypeURL.XSD_DECIMAL))
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
        return new E.Literal(duration, C.make(TypeURL.XSD_DAYTIME_DURATION), duration);
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
    .onString1Typed((str) => string(hash('md5').update(str).digest('hex')))
    .collect(),
};

const SHA1 = {
  arity: 1,
  overloads: declare()
    .onString1Typed((str) => string(hash('sha1').update(str).digest('hex')))
    .collect(),
};

const SHA256 = {
  arity: 1,
  overloads: declare()
    .onString1Typed((str) => string(hash('sha256').update(str).digest('hex')))
    .collect(),
};

const SHA384 = {
  arity: 1,
  overloads: declare()
    .onString1Typed((str) => string(hash('sha384').update(str).digest('hex')))
    .collect(),
};

const SHA512 = {
  arity: 1,
  overloads: declare()
    .onString1Typed((str) => string(hash('sha512').update(str).digest('hex')))
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
  'isiri': isIRI,
  'isblank': isBlank,
  'isliteral': isLiteral,
  'isnumeric': isNumeric,
  'str': toString,
  'lang': lang,
  'datatype': datatype,
  // 'iri': IRI (see special operators),
  // 'uri': IRI (see special operators),
  // 'BNODE': BNODE (see special operators),
  'strdt': STRDT,
  'strlang': STRLANG,
  'uuid': UUID,
  'struuid': STRUUID,

  // --------------------------------------------------------------------------
  // Functions on strings
  // https://www.w3.org/TR/sparql11-query/#func-forms
  // --------------------------------------------------------------------------
  'strlen': STRLEN,
  'substr': SUBSTR,
  'ucase': UCASE,
  'lcase': LCASE,
  'strstarts': STRSTARTS,
  'strends': STRENDS,
  'contains': CONTAINS,
  'strbefore': STRBEFORE,
  'strafter': STRAFTER,
  'encode_for_uri': ENCODE_FOR_URI,
  // 'concat': CONCAT (see special operators)
  'langmatches': langmatches,
  'regex': REGEX,
  'replace': REPLACE,

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
  // 'now': now (see special operators),
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
