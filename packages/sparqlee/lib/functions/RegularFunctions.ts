import { BigNumber } from 'bignumber.js';
import { sha1, sha256, sha384, sha512 } from 'hash.js';
import { DataFactory } from 'rdf-data-factory';
import { resolve as resolveRelativeIri } from 'relative-to-absolute-iri';
import { hash as md5 } from 'spark-md5';
import * as uuid from 'uuid';

import type { ICompleteSharedContext } from '../evaluators/evaluatorHelpers/BaseExpressionEvaluator';
import * as E from '../expressions';
import { TermTransformer } from '../transformers/TermTransformer';
import * as C from '../util/Consts';
import { TypeAlias, TypeURL } from '../util/Consts';
import * as Err from '../util/Errors';
import * as P from '../util/Parsing';
import type { IOverloadedDefinition } from './Core';
import { bool, decimal, declare, double, integer, langString, string } from './Helpers';
import * as X from './XPathFunctions';

const DF = new DataFactory();

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
  overloads: declare(C.RegularOperator.NOT)
    .onTerm1(() => val => bool(!val.coerceEBV()))
    .collect(),
};

const unaryPlus = {
  arity: 1,
  overloads: declare(C.RegularOperator.UPLUS)
    .numericConverter(() => val => val)
    .collect(),
};

const unaryMinus = {
  arity: 1,
  overloads: declare(C.RegularOperator.UMINUS)
    .numericConverter(() => val => -val)
    .collect(),
};

const multiplication = {
  arity: 2,
  overloads: declare(C.RegularOperator.MULTIPLICATION)
    .arithmetic(() => (left, right) => new BigNumber(left).times(right).toNumber())
    .collect(),
};

const division = {
  arity: 2,
  overloads: declare(C.RegularOperator.DIVISION)
    .arithmetic(() => (left, right) => new BigNumber(left).div(right).toNumber())
    .onBinaryTyped(
      [ TypeURL.XSD_INTEGER, TypeURL.XSD_INTEGER ],
      () => (left: number, right: number) => {
        if (right === 0) {
          throw new Err.ExpressionError('Integer division by 0');
        }
        return decimal(new BigNumber(left).div(right).toNumber());
      },
    )
    .collect(),
};

const addition = {
  arity: 2,
  overloads: declare(C.RegularOperator.ADDITION)
    .arithmetic(() => (left, right) => new BigNumber(left).plus(right).toNumber())
    .collect(),
};

const subtraction = {
  arity: 2,
  overloads: declare(C.RegularOperator.SUBTRACTION)
    .arithmetic(() => (left, right) => new BigNumber(left).minus(right).toNumber())
    .collect(),
};

// https://www.w3.org/TR/sparql11-query/#func-RDFterm-equal
const equality = {
  arity: 2,
  overloads: declare(C.RegularOperator.EQUAL)
    .numberTest(() => (left, right) => left === right)
    .stringTest(() => (left, right) => left.localeCompare(right) === 0)
    .set(
      [ TypeURL.RDF_LANG_STRING, TypeURL.RDF_LANG_STRING ],
      () => ([ left, right ]: E.LangStringLiteral[]) => bool(left.str() === right.str() &&
        left.language === right.language),
    )
    .booleanTest(() => (left, right) => left === right)
    .dateTimeTest(() => (left, right) => left.getTime() === right.getTime())
    .set(
      [ 'term', 'term' ],
      () => ([ left, right ]) => bool(RDFTermEqual(left, right)),
    )
    .collect(),
};

function RDFTermEqual(_left: Term, _right: Term): boolean {
  const left = _left.toRDF();
  const right = _right.toRDF();
  const val = left.equals(right);
  if (!val && (left.termType === 'Literal') && (right.termType === 'Literal')) {
    throw new Err.RDFEqualTypeError([ _left, _right ]);
  }
  return val;
}

const inequality = {
  arity: 2,
  overloads: declare(C.RegularOperator.NOT_EQUAL)
    .numberTest(() => (left, right) => left !== right)
    .stringTest(() => (left, right) => left.localeCompare(right) !== 0)
    .booleanTest(() => (left, right) => left !== right)
    .dateTimeTest(() => (left, right) => left.getTime() !== right.getTime())
    .set(
      [ 'term', 'term' ],
      () => ([ left, right ]) => bool(!RDFTermEqual(left, right)),
    )
    .collect(),
};

const lesserThan = {
  arity: 2,
  overloads: declare(C.RegularOperator.LT)
    .numberTest(() => (left, right) => left < right)
    .stringTest(() => (left, right) => left.localeCompare(right) === -1)
    .booleanTest(() => (left, right) => left < right)
    .dateTimeTest(() => (left, right) => left.getTime() < right.getTime())
    .collect(),
};

const greaterThan = {
  arity: 2,
  overloads: declare(C.RegularOperator.GT)
    .numberTest(() => (left, right) => left > right)
    .stringTest(() => (left, right) => left.localeCompare(right) === 1)
    .booleanTest(() => (left, right) => left > right)
    .dateTimeTest(() => (left, right) => left.getTime() > right.getTime())
    .collect(),
};

const lesserThanEqual = {
  arity: 2,
  overloads: declare(C.RegularOperator.LTE)
    .numberTest(() => (left, right) => left <= right)
    .stringTest(() => (left, right) => left.localeCompare(right) !== 1)
    .booleanTest(() => (left, right) => left <= right)
    .dateTimeTest(() => (left, right) => left.getTime() <= right.getTime())
    .collect(),
};

const greaterThanEqual = {
  arity: 2,
  overloads: declare(C.RegularOperator.GTE)
    .numberTest(() => (left, right) => left >= right)
    .stringTest(() => (left, right) => left.localeCompare(right) !== -1)
    .booleanTest(() => (left, right) => left >= right)
    .dateTimeTest(() => (left, right) => left.getTime() >= right.getTime())
    .collect(),
};

// ----------------------------------------------------------------------------
// Functions on RDF Terms
// https://www.w3.org/TR/sparql11-query/#func-rdfTerms
// ----------------------------------------------------------------------------

/**
 * https://www.w3.org/TR/sparql11-query/#func-isIRI
 */
const isIRI = {
  arity: 1,
  overloads: declare(C.RegularOperator.IS_IRI)
    .onTerm1(() => term => bool(term.termType === 'namedNode'))
    .collect(),
};

/**
 * https://www.w3.org/TR/sparql11-query/#func-isBlank
 */
const isBlank = {
  arity: 1,
  overloads: declare(C.RegularOperator.IS_BLANK)
    .onTerm1(() => term => bool(term.termType === 'blankNode'))
    .collect(),
};

/**
 * https://www.w3.org/TR/sparql11-query/#func-isLiteral
 */
const isLiteral = {
  arity: 1,
  overloads: declare(C.RegularOperator.IS_LITERAL)
    .onTerm1(() => term => bool(term.termType === 'literal'))
    .collect(),
};

/**
 * https://www.w3.org/TR/sparql11-query/#func-isNumeric
 */
const isNumeric = {
  arity: 1,
  overloads: declare(C.RegularOperator.IS_NUMERIC)
    .onNumeric1(() => term => bool(true))
    .onTerm1(() => term => bool(false))
    .collect(),
};

/**
 * https://www.w3.org/TR/sparql11-query/#func-str
 */
const STR = {
  arity: 1,
  overloads: declare(C.RegularOperator.STR)
    .onTerm1(() => term => string(term.str()))
    .collect(),
};

/**
 * https://www.w3.org/TR/sparql11-query/#func-lang
 */
const lang = {
  arity: 1,
  overloads: declare(C.RegularOperator.LANG)
    .onLiteral1(() => lit => string(lit.language || ''))
    .collect(),
};

/**
 * https://www.w3.org/TR/sparql11-query/#func-datatype
 */
const datatype = {
  arity: 1,
  overloads: declare(C.RegularOperator.DATATYPE)
    .onLiteral1(() => lit => new E.NamedNode(lit.dataType))
    .collect(),
};

/**
 * https://www.w3.org/TR/sparql11-query/#func-iri
 */
const IRI = {
  arity: 1,
  overloads: declare(C.RegularOperator.IRI)
    .set([ 'namedNode' ], context => args => {
      const lit = <E.NamedNode> args[0];
      const iri = resolveRelativeIri(lit.str(), context.baseIRI || '');
      return new E.NamedNode(iri);
    })
    .onString1(context => lit => {
      const iri = resolveRelativeIri(lit.str(), context.baseIRI || '');
      return new E.NamedNode(iri);
    })
    .collect(),
};

// See special functions
// const BNODE = {};

/**
 * https://www.w3.org/TR/sparql11-query/#func-strdt
 */
const STRDT = {
  arity: 2,
  overloads: declare(C.RegularOperator.STRDT).set(
    [ TypeURL.XSD_STRING, 'namedNode' ],
    ({ superTypeProvider }) => ([ str, iri ]: [E.StringLiteral, E.NamedNode]) => {
      const lit = DF.literal(str.typedValue, DF.namedNode(iri.value));
      return new TermTransformer(superTypeProvider).transformLiteral(lit);
    },
  ).collect(),
};
/**
 * https://www.w3.org/TR/sparql11-query/#func-strlang
 */
const STRLANG = {
  arity: 2,
  overloads: declare(C.RegularOperator.STRLANG)
    .onBinaryTyped(
      [ TypeURL.XSD_STRING, TypeURL.XSD_STRING ],
      () => (val: string, language: string) => new E.LangStringLiteral(val, language.toLowerCase()),
    )
    .collect(),
};

/**
 * https://www.w3.org/TR/sparql11-query/#func-uuid
 */
const UUID = {
  arity: 0,
  overloads: declare(C.RegularOperator.UUID)
    .set([], () => () => new E.NamedNode(`urn:uuid:${uuid.v4()}`))
    .collect(),
};

/**
 * https://www.w3.org/TR/sparql11-query/#func-struuid
 */
const STRUUID = {
  arity: 0,
  overloads: declare(C.RegularOperator.STRUUID)
    .set([], () => () => string(uuid.v4()))
    .collect(),
};

// ----------------------------------------------------------------------------
// Functions on strings
// https://www.w3.org/TR/sparql11-query/#func-forms
// ----------------------------------------------------------------------------

/**
 * https://www.w3.org/TR/sparql11-query/#func-strlen
 */
const STRLEN = {
  arity: 1,
  overloads: declare(C.RegularOperator.STRLEN)
    .onStringly1(() => str => integer([ ...str.typedValue ].length))
    .collect(),
};

/**
 * https://www.w3.org/TR/sparql11-query/#func-substr
 */
const SUBSTR = {
  arity: [ 2, 3 ],
  overloads: declare(C.RegularOperator.SUBSTR)
    .onBinaryTyped(
      [ TypeURL.XSD_STRING, TypeURL.XSD_INTEGER ],
      () => (source: string, startingLoc: number) => string([ ...source ].slice(startingLoc - 1).join('')),
    )
    .onBinary(
      [ TypeURL.RDF_LANG_STRING, TypeURL.XSD_INTEGER ],
      () => (source: E.LangStringLiteral, startingLoc: E.NumericLiteral) => {
        const sub = [ ...source.typedValue ].slice(startingLoc.typedValue - 1).join('');
        return langString(sub, source.language);
      },
    )
    .onTernaryTyped([ TypeURL.XSD_STRING, TypeURL.XSD_INTEGER, TypeURL.XSD_INTEGER ],
      () => (source: string, startingLoc: number, length: number) =>
        string([ ...source ].slice(startingLoc - 1, length + startingLoc - 1).join('')))
    .onTernary([ TypeURL.RDF_LANG_STRING, TypeURL.XSD_INTEGER, TypeURL.XSD_INTEGER ],
      () => (source: E.LangStringLiteral, startingLoc: E.NumericLiteral, length: E.NumericLiteral) => {
        const sub = [ ...source.typedValue ].slice(startingLoc.typedValue - 1,
          length.typedValue + startingLoc.typedValue - 1).join('');
        return langString(sub, source.language);
      })
    .collect(),
};

/**
 * https://www.w3.org/TR/sparql11-query/#func-ucase
 */
const UCASE = {
  arity: 1,
  overloads: declare(C.RegularOperator.UCASE)
    .onString1Typed(() => lit => string(lit.toUpperCase()))
    .onLangString1(() => lit => langString(lit.typedValue.toUpperCase(), lit.language))
    .collect(),
};

/**
 * https://www.w3.org/TR/sparql11-query/#func-lcase
 */
const LCASE = {
  arity: 1,
  overloads: declare(C.RegularOperator.LCASE)
    .onString1Typed(() => lit => string(lit.toLowerCase()))
    .onLangString1(() => lit => langString(lit.typedValue.toLowerCase(), lit.language))
    .collect(),
};

/**
 * https://www.w3.org/TR/sparql11-query/#func-strstarts
 * for this and the following functions you'll see (string, langstring) is not allowed. This behaviour is defined in:
 * https://www.w3.org/TR/sparql11-query/#func-arg-compatibility
 */
const STRSTARTS = {
  arity: 2,
  overloads: declare(C.RegularOperator.STRSTARTS)
    .onBinaryTyped(
      [ TypeAlias.SPARQL_STRINGLY, TypeURL.XSD_STRING ],
      () => (arg1: string, arg2: string) => bool(arg1.startsWith(arg2)),
    )
    .onBinary(
      [ TypeURL.RDF_LANG_STRING, TypeURL.RDF_LANG_STRING ],
      () => (arg1: E.LangStringLiteral, arg2: E.LangStringLiteral) => {
        if (arg1.language !== arg2.language) {
          throw new Err.IncompatibleLanguageOperation(arg1, arg2);
        }
        return bool(arg1.typedValue.startsWith(arg2.typedValue));
      },
    )
    .collect(),
};

/**
 * https://www.w3.org/TR/sparql11-query/#func-strends
 */
const STRENDS = {
  arity: 2,
  overloads: declare(C.RegularOperator.STRENDS)
    .onBinaryTyped(
      [ TypeAlias.SPARQL_STRINGLY, TypeURL.XSD_STRING ],
      () => (arg1: string, arg2: string) => bool(arg1.endsWith(arg2)),
    )
    .onBinary(
      [ TypeURL.RDF_LANG_STRING, TypeURL.RDF_LANG_STRING ],
      () => (arg1: E.LangStringLiteral, arg2: E.LangStringLiteral) => {
        if (arg1.language !== arg2.language) {
          throw new Err.IncompatibleLanguageOperation(arg1, arg2);
        }
        return bool(arg1.typedValue.endsWith(arg2.typedValue));
      },
    )
    .collect(),
};

/**
 * https://www.w3.org/TR/sparql11-query/#func-contains
 */
const CONTAINS = {
  arity: 2,
  overloads: declare(C.RegularOperator.CONTAINS)
    .onBinaryTyped(
      [ TypeAlias.SPARQL_STRINGLY, TypeURL.XSD_STRING ],
      () => (arg1: string, arg2: string) => bool(arg1.includes(arg2)),
    )
    .onBinary(
      [ TypeURL.RDF_LANG_STRING, TypeURL.RDF_LANG_STRING ],
      () => (arg1: E.LangStringLiteral, arg2: E.LangStringLiteral) => {
        if (arg1.language !== arg2.language) {
          throw new Err.IncompatibleLanguageOperation(arg1, arg2);
        }
        return bool(arg1.typedValue.includes(arg2.typedValue));
      },
    )
    .collect(),
};

/**
 * https://www.w3.org/TR/sparql11-query/#func-strbefore
 */
const STRBEFORE = {
  arity: 2,
  overloads: declare(C.RegularOperator.STRBEFORE)
    .onBinaryTyped(
      [ TypeURL.XSD_STRING, TypeURL.XSD_STRING ],
      () => (arg1: string, arg2: string) => string(arg1.slice(0, Math.max(0, arg1.indexOf(arg2)))),
    )
    .onBinary(
      [ TypeURL.RDF_LANG_STRING, TypeURL.XSD_STRING ],
      () => (arg1: E.LangStringLiteral, arg2: E.StringLiteral) => {
        const [ a1, a2 ] = [ arg1.typedValue, arg2.typedValue ];
        const sub = arg1.typedValue.slice(0, Math.max(0, a1.indexOf(a2)));
        return sub || !a2 ? langString(sub, arg1.language) : string(sub);
      },
    )
    .onBinary(
      [ TypeURL.RDF_LANG_STRING, TypeURL.RDF_LANG_STRING ],
      () => (arg1: E.LangStringLiteral, arg2: E.LangStringLiteral) => {
        if (arg1.language !== arg2.language) {
          throw new Err.IncompatibleLanguageOperation(arg1, arg2);
        }
        const [ a1, a2 ] = [ arg1.typedValue, arg2.typedValue ];
        const sub = arg1.typedValue.slice(0, Math.max(0, a1.indexOf(a2)));
        return sub || !a2 ? langString(sub, arg1.language) : string(sub);
      },
    )
    .collect(),
};

/**
 * https://www.w3.org/TR/sparql11-query/#func-strafter
 */
const STRAFTER = {
  arity: 2,
  overloads: declare(C.RegularOperator.STRAFTER)
    .onBinaryTyped(
      [ TypeURL.XSD_STRING, TypeURL.XSD_STRING ],
      () => (arg1: string, arg2: string) => string(arg1.slice(arg1.indexOf(arg2)).slice(arg2.length)),
    )
    .onBinary(
      [ TypeURL.RDF_LANG_STRING, TypeURL.XSD_STRING ],
      () => (arg1: E.LangStringLiteral, arg2: E.StringLiteral) => {
        const [ a1, a2 ] = [ arg1.typedValue, arg2.typedValue ];
        const sub = a1.slice(a1.indexOf(a2)).slice(a2.length);
        return sub || !a2 ? langString(sub, arg1.language) : string(sub);
      },
    )
    .onBinary(
      [ TypeURL.RDF_LANG_STRING, TypeURL.RDF_LANG_STRING ],
      () => (arg1: E.LangStringLiteral, arg2: E.LangStringLiteral) => {
        if (arg1.language !== arg2.language) {
          throw new Err.IncompatibleLanguageOperation(arg1, arg2);
        }
        const [ a1, a2 ] = [ arg1.typedValue, arg2.typedValue ];
        const sub = a1.slice(a1.indexOf(a2)).slice(a2.length);
        return sub || !a2 ? langString(sub, arg1.language) : string(sub);
      },
    )
    .collect(),
};

/**
 * https://www.w3.org/TR/sparql11-query/#func-encode
 */
const ENCODE_FOR_URI = {
  arity: 1,
  overloads: declare(C.RegularOperator.ENCODE_FOR_URI)
    .onStringly1Typed(() => val => string(encodeURI(val))).collect(),
};

// See special operators
// const CONCAT = {}

/**
 * https://www.w3.org/TR/sparql11-query/#func-langMatches
 */
const langmatches = {
  arity: 2,
  overloads: declare(C.RegularOperator.LANG_MATCHES)
    .onBinaryTyped(
      [ TypeURL.XSD_STRING, TypeURL.XSD_STRING ],
      () => (tag: string, range: string) => bool(X.langMatches(tag, range)),
    ).collect(),
};

const regex2: (context: ICompleteSharedContext) => (text: string, pattern: string) => E.BooleanLiteral =
  () => (text: string, pattern: string) => bool(X.matches(text, pattern));
const regex3: (context: ICompleteSharedContext) => (text: string, pattern: string, flags: string) => E.BooleanLiteral =
  () => (text: string, pattern: string, flags: string) => bool(X.matches(text, pattern, flags));
/**
 * https://www.w3.org/TR/sparql11-query/#func-regex
 */
const REGEX = {
  arity: [ 2, 3 ],
  overloads: declare(C.RegularOperator.REGEX)
    .onBinaryTyped([ TypeAlias.SPARQL_STRINGLY, TypeURL.XSD_STRING ], regex2)
    .onTernaryTyped([ TypeAlias.SPARQL_STRINGLY, TypeURL.XSD_STRING, TypeURL.XSD_STRING ], regex3)
    .collect(),
};

/**
 * https://www.w3.org/TR/sparql11-query/#func-replace
 */
const REPLACE = {
  arity: [ 3, 4 ],
  overloads: declare(C.RegularOperator.REPLACE)
    .onTernaryTyped(
      [ TypeURL.XSD_STRING, TypeURL.XSD_STRING, TypeURL.XSD_STRING ],
      () => (arg: string, pattern: string, replacement: string) =>
        string(X.replace(arg, pattern, replacement)),
    )
    .set(
      [ TypeURL.RDF_LANG_STRING, TypeURL.XSD_STRING, TypeURL.XSD_STRING ],
      () => ([ arg, pattern, replacement ]: [E.LangStringLiteral, E.StringLiteral, E.StringLiteral]) => {
        const result = X.replace(arg.typedValue, pattern.typedValue, replacement.typedValue);
        return langString(result, arg.language);
      },
    )
    .onQuaternaryTyped(
      [ TypeURL.XSD_STRING, TypeURL.XSD_STRING, TypeURL.XSD_STRING, TypeURL.XSD_STRING ],
      () => (arg: string, pattern: string, replacement: string, flags: string) =>
        string(X.replace(arg, pattern, replacement, flags)),
    )
    .set(
      [ TypeURL.RDF_LANG_STRING, TypeURL.XSD_STRING, TypeURL.XSD_STRING, TypeURL.XSD_STRING ],
      () => ([ arg, pattern, replacement, flags ]:
      [E.LangStringLiteral, E.StringLiteral, E.StringLiteral, E.StringLiteral]) => {
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

/**
 * https://www.w3.org/TR/sparql11-query/#func-abs
 */
const abs = {
  arity: 1,
  overloads: declare(C.RegularOperator.ABS)
    .numericConverter(() => num => Math.abs(num))
    .collect(),
};

/**
 * https://www.w3.org/TR/sparql11-query/#func-round
 */
const round = {
  arity: 1,
  overloads: declare(C.RegularOperator.ROUND)
    .numericConverter(() => num => Math.round(num))
    .collect(),
};

/**
 * https://www.w3.org/TR/sparql11-query/#func-ceil
 */
const ceil = {
  arity: 1,
  overloads: declare(C.RegularOperator.CEIL)
    .numericConverter(() => num => Math.ceil(num))
    .collect(),
};

/**
 * https://www.w3.org/TR/sparql11-query/#func-floor
 */
const floor = {
  arity: 1,
  overloads: declare(C.RegularOperator.FLOOR)
    .numericConverter(() => num => Math.floor(num))
    .collect(),
};

/**
 * https://www.w3.org/TR/sparql11-query/#idp2130040
 */
const rand = {
  arity: 0,
  overloads: declare(C.RegularOperator.RAND)
    .set([], () => () => double(Math.random()))
    .collect(),
};

// ----------------------------------------------------------------------------
// Functions on Dates and Times
// https://www.w3.org/TR/sparql11-query/#func-date-time
// ----------------------------------------------------------------------------

function parseDate(dateLit: E.DateTimeLiteral): P.ISplittedDate {
  return P.parseXSDDateTime(dateLit.str());
}

/**
 * https://www.w3.org/TR/sparql11-query/#func-now
 */
const now = {
  arity: 0,
  overloads: declare(C.RegularOperator.NOW).set([], (sharedContext: ICompleteSharedContext) => () =>
    new E.DateTimeLiteral(sharedContext.now, sharedContext.now.toISOString())).collect(),
};

/**
 * https://www.w3.org/TR/sparql11-query/#func-year
 */
const year = {
  arity: 1,
  overloads: declare(C.RegularOperator.YEAR)
    .onDateTime1(
      () => date => integer(Number(parseDate(date).year)),
    )
    .collect(),
};

/**
 * https://www.w3.org/TR/sparql11-query/#func-month
 */
const month = {
  arity: 1,
  overloads: declare(C.RegularOperator.MONTH)
    .onDateTime1(
      () => date => integer(Number(parseDate(date).month)),
    )
    .collect(),
};

/**
 * https://www.w3.org/TR/sparql11-query/#func-day
 */
const day = {
  arity: 1,
  overloads: declare(C.RegularOperator.DAY)
    .onDateTime1(
      () => date => integer(Number(parseDate(date).day)),
    )
    .collect(),
};

/**
 * https://www.w3.org/TR/sparql11-query/#func-hours
 */
const hours = {
  arity: 1,
  overloads: declare(C.RegularOperator.HOURS)
    .onDateTime1(
      () => date => integer(Number(parseDate(date).hours)),
    )
    .collect(),
};

/**
 * https://www.w3.org/TR/sparql11-query/#func-minutes
 */
const minutes = {
  arity: 1,
  overloads: declare(C.RegularOperator.MINUTES)
    .onDateTime1(() => date => integer(Number(parseDate(date).minutes)))
    .collect(),
};

/**
 * https://www.w3.org/TR/sparql11-query/#func-seconds
 */
const seconds = {
  arity: 1,
  overloads: declare(C.RegularOperator.SECONDS)
    .onDateTime1(() => date => decimal(Number(parseDate(date).seconds)))
    .collect(),
};

/**
 * https://www.w3.org/TR/sparql11-query/#func-timezone
 */
const timezone = {
  arity: 1,
  overloads: declare(C.RegularOperator.TIMEZONE)
    .onDateTime1(
      () => date => {
        const duration = X.formatDayTimeDuration(parseDate(date).timezone);
        if (!duration) {
          throw new Err.InvalidTimezoneCall(date.strValue);
        }
        return new E.Literal(duration, TypeURL.XSD_DAYTIME_DURATION, duration);
      },
    )
    .collect(),
};

/**
 * https://www.w3.org/TR/sparql11-query/#func-tz
 */
const tz = {
  arity: 1,
  overloads: declare(C.RegularOperator.TZ)
    .onDateTime1(
      () => date => string(parseDate(date).timezone),
    )
    .collect(),
};

// ----------------------------------------------------------------------------
// Hash functions
// https://www.w3.org/TR/sparql11-query/#func-hash
// ----------------------------------------------------------------------------

/**
 * https://www.w3.org/TR/sparql11-query/#func-md5
 */
const MD5 = {
  arity: 1,
  overloads: declare(C.RegularOperator.MD5)
    .onString1Typed(() => str => string(md5(str)))
    .collect(),
};

/**
 * https://www.w3.org/TR/sparql11-query/#func-sha1
 */
const SHA1 = {
  arity: 1,
  overloads: declare(C.RegularOperator.SHA1)
    .onString1Typed(() => str => string(sha1().update(str).digest('hex')))
    .collect(),
};

/**
 * https://www.w3.org/TR/sparql11-query/#func-sha256
 */
const SHA256 = {
  arity: 1,
  overloads: declare(C.RegularOperator.SHA256)
    .onString1Typed(() => str => string(sha256().update(str).digest('hex')))
    .collect(),
};

/**
 * https://www.w3.org/TR/sparql11-query/#func-sha384
 */
const SHA384 = {
  arity: 1,
  overloads: declare(C.RegularOperator.SHA384)
    .onString1Typed(() => str => string(sha384().update(str).digest('hex')))
    .collect(),
};

/**
 * https://www.w3.org/TR/sparql11-query/#func-sha512
 */
const SHA512 = {
  arity: 1,
  overloads: declare(C.RegularOperator.SHA512)
    .onString1Typed(() => str => string(sha512().update(str).digest('hex')))
    .collect(),
};

// End definitions.
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------
// ----------------------------------------------------------------------------

/**
 * Collect all the definitions from above into an object
 */
export const definitions: Record<C.RegularOperator, IOverloadedDefinition> = {
  // --------------------------------------------------------------------------
  // Operator Mapping
  // https://www.w3.org/TR/sparql11-query/#OperatorMapping
  // --------------------------------------------------------------------------
  '!': not,
  uplus: unaryPlus,
  uminus: unaryMinus,
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
  isiri: isIRI,
  isuri: isIRI,
  isblank: isBlank,
  isliteral: isLiteral,
  isnumeric: isNumeric,
  str: STR,
  lang,
  datatype,
  iri: IRI,
  uri: IRI,
  // 'BNODE': BNODE (see special operators),
  strdt: STRDT,
  strlang: STRLANG,
  uuid: UUID,
  struuid: STRUUID,

  // --------------------------------------------------------------------------
  // Functions on strings
  // https://www.w3.org/TR/sparql11-query/#func-forms
  // --------------------------------------------------------------------------
  strlen: STRLEN,
  substr: SUBSTR,
  ucase: UCASE,
  lcase: LCASE,
  strstarts: STRSTARTS,
  strends: STRENDS,
  contains: CONTAINS,
  strbefore: STRBEFORE,
  strafter: STRAFTER,
  encode_for_uri: ENCODE_FOR_URI,
  // 'concat': CONCAT (see special operators)
  langmatches,
  regex: REGEX,
  replace: REPLACE,

  // --------------------------------------------------------------------------
  // Functions on numerics
  // https://www.w3.org/TR/sparql11-query/#func-numerics
  // --------------------------------------------------------------------------
  abs,
  round,
  ceil,
  floor,
  rand,

  // --------------------------------------------------------------------------
  // Functions on Dates and Times
  // https://www.w3.org/TR/sparql11-query/#func-date-time
  // --------------------------------------------------------------------------
  now,
  year,
  month,
  day,
  hours,
  minutes,
  seconds,
  timezone,
  tz,

  // --------------------------------------------------------------------------
  // Hash functions
  // https://www.w3.org/TR/sparql11-query/#func-hash
  // --------------------------------------------------------------------------
  md5: MD5,
  sha1: SHA1,
  sha256: SHA256,
  sha384: SHA384,
  sha512: SHA512,
};
