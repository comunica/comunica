import { Map } from 'immutable';
import { expand, forAll, simple, str, unary } from './Helpers';

import * as C from '../../util/Consts';
import * as Err from '../../util/Errors';
import * as E from '../Expressions';
import * as Special from './SpecialFunctionsAsync';
import * as X from './XPath';

import { TypeURL as DT } from '../../util/Consts';
import { arithmetic, binary, bool, list, number, xPathTest } from './Helpers';
import { OverloadMap } from './Types';

// ----------------------------------------------------------------------------
// The definitions and functionality for all operators
// ----------------------------------------------------------------------------

export interface Definition {
  arity: number | number[];
  overloads: OverloadMap;
}
export type SpecialDefinition = Special.SpecialFunctionAsync;

type Term = E.TermExpression;

// ----------------------------------------------------------------------------
// Operator Mapping
// https://www.w3.org/TR/sparql11-query/#OperatorMapping
// ----------------------------------------------------------------------------

const not = {
  arity: 1,
  overloads: simple(
    ['term'],
    () => { throw new Err.UnimplementedError('! operator'); },
  ),
};

const unaryPlus = {
  arity: 1,
  overloads: simple(
    ['term'],
    () => { throw new Err.UnimplementedError('Unary plus operator'); },
  ),
};

const unaryMinus = {
  arity: 1,
  overloads: simple(
    ['term'],
    () => { throw new Err.UnimplementedError('Unary minus operator'); },
  ),
};

const multiplication = {
  arity: 2,
  overloads: arithmetic(X.numericMultiply),
};

const division = {
  arity: 2,
  overloads: arithmetic(X.numericDivide).set(
    list('integer', 'integer'),
    (args: Term[]) => {
      if ((args[1] as E.NumericLiteral).typedValue === 0) {
        throw new Err.ExpressionError('Integer division by 0');
      }
      return number(binary(X.numericDivide, args), DT.XSD_DECIMAL);
    },
  ),
};

const addition = {
  arity: 2,
  overloads: arithmetic(X.numericAdd),
};

const subtraction = {
  arity: 2,
  overloads: arithmetic(X.numericSubtract),
};

// https://www.w3.org/TR/sparql11-query/#func-RDFterm-equal
const equality = {
  arity: 2,
  overloads: xPathTest(
    X.numericEqual,
    (left, right) => X.numericEqual(X.compare(left, right), 0),
    X.booleanEqual,
    X.dateTimeEqual,
  ).set(
    list('term', 'term'),
    (args: Term[]) => {
      return bool(RDFTermEqual(args[0], args[1]));
    },
  ),
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
  overloads: xPathTest(
    (left, right) => !X.numericEqual(left, right),
    (left, right) => !X.numericEqual(X.compare(left, right), 0),
    (left, right) => !X.booleanEqual(left, right),
    (left, right) => !X.dateTimeEqual(left, right),
  ),
};

const lesserThan = {
  arity: 2,
  overloads: xPathTest(
    X.numericLessThan,
    (left, right) => X.numericEqual(X.compare(left, right), -1),
    X.booleanLessThan,
    X.dateTimeLessThan,
  ),
};

const greaterThan = {
  arity: 2,
  overloads: xPathTest(
    X.numericGreaterThan,
    (left, right) => X.numericEqual(X.compare(left, right), 1),
    X.booleanGreaterThan,
    X.dateTimeGreaterThan,
  ),
};

const lesserThanEqual = {
  arity: 2,
  overloads: xPathTest(
    (left, right) => X.numericLessThan(left, right) || X.numericEqual(left, right),
    (left, right) => !X.numericEqual(X.compare(left, right), 1),
    (left, right) => !X.booleanGreaterThan(left, right),
    (left, right) => !X.dateTimeGreaterThan(left, right),
  ),
};

const greaterThanEqual = {
  arity: 2,
  overloads: xPathTest(
    (left, right) => X.numericGreaterThan(left, right) || X.numericEqual(left, right),
    (left, right) => !X.numericEqual(X.compare(left, right), -1),
    (left, right) => !X.booleanLessThan(left, right),
    (left, right) => !X.dateTimeLessThan(left, right),
  ),
};

// ----------------------------------------------------------------------------
// Functions on RDF Terms
// https://www.w3.org/TR/sparql11-query/#func-rdfTerms
// ----------------------------------------------------------------------------
const strTerm = {
  arity: 1,
  overloads: simple(
    ['term'],
    (args: Term[]) => str(args[0].str()),
  ),
};

const lang = {
  arity: 1,
  overloads: simple(
    ['literal'],
    (args: Array<E.Literal<string>>) => str(args[0].language || ''),
  ),
};

const datatype = {
  arity: 1,
  overloads: simple(
    ['literal'],
    // tslint:disable-next-line:no-any
    (args: Array<E.Literal<any>>) => {
      const arg = args[0];
      return str((arg.typeURL) ? arg.typeURL.value : '');
    },
  ),
};

// ----------------------------------------------------------------------------
// Functions on strings
// https://www.w3.org/TR/sparql11-query/#func-forms
// ----------------------------------------------------------------------------

const strlen = {
  arity: 1,
  overloads: forAll(
    [['string'], ['langString']],
    (args: Term[]) => number(unary(X.stringLength, args), DT.XSD_INTEGER),
  ),
};

const langmatches = {
  arity: 2,
  overloads: simple(
    ['string', 'string'],
    (args: Term[]) => bool(binary(X.langMatches, args)),
  ),
};

const regex = {
  arity: [2, 3],
  // // TODO: This deviates from the spec, as the second and third argument should be simple literals
  overloads: forAll(
    [
      ['string', 'string'],
      ['langString', 'string'],
      ['string', 'string', 'string'],
      ['langString', 'string', 'string'],
    ],
    (args: Array<E.Literal<string>>) => bool(X.matches(
      args[0].typedValue,
      args[1].typedValue,
      ((args[2]) ? args[2].typedValue : ''),
    )),
  ),
};

// ----------------------------------------------------------------------------
// Functions on numerics
// https://www.w3.org/TR/sparql11-query/#func-numerics
// ----------------------------------------------------------------------------

const abs = {
  arity: 1,
  overloads: forAll(
    [['term']],
    () => { throw new Err.UnimplementedError('abs'); },
  ),
};

// ----------------------------------------------------------------------------
// Functions on Dates and Times
// https://www.w3.org/TR/sparql11-query/#func-date-time
// ----------------------------------------------------------------------------

const now = {
  arity: 0,
  overloads: simple(
    ['term'],
    () => { throw new Err.UnimplementedError('now function'); },
  ),
};

// ----------------------------------------------------------------------------
// Hash functions
// https://www.w3.org/TR/sparql11-query/#func-hash
// ----------------------------------------------------------------------------

// ----------------------------------------------------------------------------
// XPath Constructor functions
// https://www.w3.org/TR/sparql11-query/#FunctionMapping
// ----------------------------------------------------------------------------

// TODO Maybe split in definitions for overloaded and async functions.
const _definitions: { [key in C.Operator]: Definition } = {
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
  'str': strTerm,
  'lang': lang,
  'datatype': datatype,
  // --------------------------------------------------------------------------
  // Functions on strings
  // https://www.w3.org/TR/sparql11-query/#func-forms
  // --------------------------------------------------------------------------
  'strlen': strlen,
  'langmatches': langmatches,
  'regex': regex,
  // --------------------------------------------------------------------------
  // Functions on numerics
  // https://www.w3.org/TR/sparql11-query/#func-numerics
  // --------------------------------------------------------------------------
  'abs': abs,

  // --------------------------------------------------------------------------
  // Functions on Dates and Times
  // https://www.w3.org/TR/sparql11-query/#func-date-time
  // --------------------------------------------------------------------------
  'now': now,

  // --------------------------------------------------------------------------
  // Hash functions
  // https://www.w3.org/TR/sparql11-query/#func-hash
  // --------------------------------------------------------------------------

  // --------------------------------------------------------------------------
  // XPath Constructor functions
  // https://www.w3.org/TR/sparql11-query/#FunctionMapping
  // --------------------------------------------------------------------------
};

const _specialDefinitions: { [key in C.SpecialOperator]: SpecialDefinition } = {
  // --------------------------------------------------------------------------
  // Functional Forms
  // https://www.w3.org/TR/sparql11-query/#func-forms
  // --------------------------------------------------------------------------
  'bound': new Special.Bound(),
  'if': new Special.If(),
  'coalesce': new Special.Coalesce(),
  '&&': new Special.LogicalAndAsync(),
  '||': new Special.LogicalOrAsync(),
  'sameterm': new Special.SameTerm(),
  'in': new Special.In(),
  'notin': new Special.NotIn(),
};

export const definitions = Map<C.Operator, Definition>(_definitions);
export const specialDefinitions = Map<C.SpecialOperator, SpecialDefinition>(_specialDefinitions);
