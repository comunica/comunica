import { Map } from 'immutable';
import { expand, forAll, simple, str, unary } from './Helpers';

import * as C from '../../util/Consts';
import * as E from './../Expressions';
import * as Special from './SpecialFunctions';
import * as X from './XPath';

import { DataType as DT } from '../../util/Consts';
import { ExpressionError, UnimplementedError } from '../../util/Errors';
import { arithmetic, binary, bool, list, number, xPathTest } from './Helpers';
import { OverloadMap, SpecialFunctionAsync } from './Types';

// ----------------------------------------------------------------------------
// The definitions and functionality for all operators
// ----------------------------------------------------------------------------

export type FuncDefinition =
  | OverloadedDefinition
  | SpecialDefinition;

export interface DefinitionProps {
  arity: number | number[];
  category: C.OperatorCategory;
}

export type OverloadedDefinition = DefinitionProps & {
  arity: number | number[];
  category: 'overloaded';
  overloads: OverloadMap;
};

export type SpecialDefinition = DefinitionProps & {
  arity: number;
  category: 'special';
  constructor: new () => SpecialFunctionAsync;
};

type IDefinitionMap = { [key in C.Operator]: FuncDefinition };
type Term = E.TermExpression;

// TODO Maybe split in definitions for overloaded and async functions.
const _definitions: IDefinitionMap = {
  // --------------------------------------------------------------------------
  // Operator Mapping
  // https://www.w3.org/TR/sparql11-query/#OperatorMapping
  // --------------------------------------------------------------------------
  '!': {
    arity: 1,
    category: 'overloaded',
    overloads: simple(
      ['term'],
      () => { throw new UnimplementedError('! operator'); },
    ),
  },
  'UPLUS': {
    arity: 1,
    category: 'overloaded',
    overloads: simple(
      ['term'],
      () => { throw new UnimplementedError('Unary plus operator'); },
    ),
  },
  'UMINUS': {
    arity: 1,
    category: 'overloaded',
    overloads: simple(
      ['term'],
      () => { throw new UnimplementedError('Unary minus operator'); },
    ),
  },
  '&&': {
    arity: 2,
    category: 'special',
    constructor: Special.LogicalAndAsync,
  },
  '||': {
    arity: 2,
    category: 'special',
    constructor: Special.LogicalOrAsync,
  },
  '*': {
    arity: 2,
    category: 'overloaded',
    overloads: arithmetic(X.numericMultiply),
  },
  '/': {
    arity: 2,
    category: 'overloaded',
    overloads: arithmetic(X.numericDivide).set(
      list('integer', 'integer'),
      (args: Term[]) => {
        if ((args[1] as E.NumericLiteral).typedValue === 0) {
          throw new ExpressionError('Integer division by 0');
        }
        return number(binary(X.numericDivide, args), DT.XSD_DECIMAL);
      },
    ),
  },
  '+': {
    arity: 2,
    category: 'overloaded',
    overloads: arithmetic(X.numericAdd),
  },
  '-': {
    arity: 2,
    category: 'overloaded',
    overloads: arithmetic(X.numericSubtract),
  },
  '=': {
    arity: 2,
    category: 'overloaded',
    overloads: xPathTest(
      X.numericEqual,
      (left, right) => X.numericEqual(X.compare(left, right), 0),
      X.booleanEqual,
      X.dateTimeEqual,
    ).set(
      list('term', 'term'),
      (args: Term[]) => {
        return bool(Special.RDFTermEqual(args[0], args[1]));
      },
    ),
  },
  '!=': {
    arity: 2,
    category: 'overloaded',
    overloads: xPathTest(
      (left, right) => !X.numericEqual(left, right),
      (left, right) => !X.numericEqual(X.compare(left, right), 0),
      (left, right) => !X.booleanEqual(left, right),
      (left, right) => !X.dateTimeEqual(left, right),
    ),
  },
  '<': {
    arity: 2,
    category: 'overloaded',
    overloads: xPathTest(
      X.numericLessThan,
      (left, right) => X.numericEqual(X.compare(left, right), -1),
      X.booleanLessThan,
      X.dateTimeLessThan,
    ),
  },
  '>': {
    arity: 2,
    category: 'overloaded',
    overloads: xPathTest(
      X.numericGreaterThan,
      (left, right) => X.numericEqual(X.compare(left, right), 1),
      X.booleanGreaterThan,
      X.dateTimeGreaterThan,
    ),
  },
  '<=': {
    arity: 2,
    category: 'overloaded',
    overloads: xPathTest(
      (left, right) => X.numericLessThan(left, right) || X.numericEqual(left, right),
      (left, right) => !X.numericEqual(X.compare(left, right), 1),
      (left, right) => !X.booleanGreaterThan(left, right),
      (left, right) => !X.dateTimeGreaterThan(left, right),
    ),
  },
  '>=': {
    arity: 2,
    category: 'overloaded',
    overloads: xPathTest(
      (left, right) => X.numericGreaterThan(left, right) || X.numericEqual(left, right),
      (left, right) => !X.numericEqual(X.compare(left, right), -1),
      (left, right) => !X.booleanLessThan(left, right),
      (left, right) => !X.dateTimeLessThan(left, right),
    ),
  },
  // --------------------------------------------------------------------------
  // Functional Forms
  // https://www.w3.org/TR/sparql11-query/#func-forms
  // --------------------------------------------------------------------------
  'bound': {
    arity: 1,
    category: 'special',
    constructor: Special.Bound,
  },
  'if': {
    arity: 3,
    category: 'special',
    constructor: Special.If,
  },
  'coalesce': {
    arity: Infinity,
    category: 'special',
    constructor: Special.Coalesce,
  },
  'sameterm': {
    arity: 2,
    category: 'overloaded',
    overloads: simple(
      ['term', 'term'],
      (args: Term[]) => bool(Special.sameTerm(args[1], args[2])),
    ),
  },
  'in': {
    arity: Infinity,
    category: 'special',
    constructor: Special.In,
  },
  'notin': {
    arity: Infinity,
    category: 'special',
    constructor: Special.NotIn,
  },
  // --------------------------------------------------------------------------
  // Functions on RDF Terms
  // https://www.w3.org/TR/sparql11-query/#func-rdfTerms
  // --------------------------------------------------------------------------
  'str': {
    arity: 1,
    category: 'overloaded',
    overloads: simple(
      ['term'],
      (args: Term[]) => str(args[0].str()),
    ),
  },
  'lang': {
    arity: 1,
    category: 'overloaded',
    overloads: simple(
      ['literal'],
      (args: Array<E.Literal<string>>) => str(args[0].language || ''),
    ),
  },
  'datatype': {
    arity: 1,
    category: 'overloaded',
    overloads: simple(
      ['literal'],
      // tslint:disable-next-line:no-any
      (args: Array<E.Literal<any>>) => {
        const arg = args[0];
        return str((arg.dataType) ? arg.dataType.value : '');
      },
    ),
  },
  // --------------------------------------------------------------------------
  // Functions on strings
  // https://www.w3.org/TR/sparql11-query/#func-forms
  // TODO: Note somewhere that 'overloaded' is in the context of this type system.
  // Eg. strlen is overloaded, although it has identical behaviour,
  // but the types can not be captured by a single ArgumentType.
  // --------------------------------------------------------------------------
  'strlen': {
    arity: 1,
    category: 'overloaded',
    overloads: forAll(
      [['plain'], ['simple'], ['string']],
      (args: Term[]) => number(unary(X.stringLength, args), DT.XSD_INTEGER),
    ),
  },
  'langmatches': {
    arity: 2,
    category: 'overloaded',
    overloads: forAll(
      [
        // TODO: This deviates from the spec, as it only allows simple literals
        ['simple', 'simple'],
        ['simple', 'string'],
        ['string', 'simple'],
        ['string', 'string'],
      ],
      (args: Term[]) => bool(binary(X.langMatches, args)),
    ),
  },
  'regex': {
    arity: [2, 3],
    category: 'overloaded',
    // // TODO: This deviates from the spec, as the second and third argument should be simple literals
    overloads: forAll(
      [].concat(expand(['stringly', 'simple']))
        .concat(expand(['stringly', 'simple', 'simple'])),
      (args: Array<E.Literal<string>>) => bool(X.matches(
        args[0].typedValue,
        args[1].typedValue,
        ((args[2]) ? args[2].typedValue : ''),
      )),
    ),
  },

  // --------------------------------------------------------------------------
  // Functions on numerics
  // https://www.w3.org/TR/sparql11-query/#func-numerics
  // --------------------------------------------------------------------------
  'abs': {
    arity: 1,
    category: 'overloaded',
    overloads: forAll(
      [['term']],
      () => { throw new UnimplementedError('abs'); },
    ),
  },

  // --------------------------------------------------------------------------
  // Functions on Dates and Times
  // https://www.w3.org/TR/sparql11-query/#func-date-time
  // --------------------------------------------------------------------------
  'now': {
    arity: 0,
    category: 'overloaded',
    overloads: simple(
      ['term'],
      () => { throw new UnimplementedError('now function'); },
    ),
  },

  // --------------------------------------------------------------------------
  // Hash functions
  // https://www.w3.org/TR/sparql11-query/#func-hash
  // --------------------------------------------------------------------------

  // --------------------------------------------------------------------------
  // XPath Constructor functions
  // https://www.w3.org/TR/sparql11-query/#FunctionMapping
  // --------------------------------------------------------------------------
};

export const definitions = Map<C.Operator, FuncDefinition>(_definitions);
