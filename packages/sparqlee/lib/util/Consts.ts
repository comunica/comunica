// tslint:disable:variable-name
import { Map, Set } from 'immutable';
import * as RDFDM from 'rdf-data-model';
import * as RDF from 'rdf-js';

export const TRUE_STR = '"true"^^xsd:boolean';
export const FALSE_STR = '"false"^^xsd:boolean';
export const EVB_ERR_STR = '"not an dateTime"^^xsd:dateTime';

export enum DataType {
  XSD_STRING = 'http://www.w3.org/2001/XMLSchema#string',
  RDF_LANG_STRING = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#langString',

  XSD_BOOLEAN = 'http://www.w3.org/2001/XMLSchema#boolean',

  XSD_DATE_TIME = 'http://www.w3.org/2001/XMLSchema#dateTime',

  // Numeric types
  XSD_INTEGER = 'http://www.w3.org/2001/XMLSchema#integer',
  XSD_DECIMAL = 'http://www.w3.org/2001/XMLSchema#decimal',
  XSD_FLOAT = 'http://www.w3.org/2001/XMLSchema#float',
  XSD_DOUBLE = 'http://www.w3.org/2001/XMLSchema#double',

  // Derived numeric types
  XSD_NON_POSITIVE_INTEGER = 'http://www.w3.org/2001/XMLSchema#nonPositiveInteger',
  XSD_NEGATIVE_INTEGER = 'http://www.w3.org/2001/XMLSchema#negativeInteger',
  XSD_LONG = 'http://www.w3.org/2001/XMLSchema#long',
  XSD_INT = 'http://www.w3.org/2001/XMLSchema#int',
  XSD_SHORT = 'http://www.w3.org/2001/XMLSchema#short',
  XSD_BYTE = 'http://www.w3.org/2001/XMLSchema#byte',
  XSD_NON_NEGATIVE_INTEGER = 'http://www.w3.org/2001/XMLSchema#nonNegativeInteger',
  XSD_UNSIGNED_LONG = 'http://www.w3.org/2001/XMLSchema#unsignedLong',
  XSD_UNSIGNED_INT = 'http://www.w3.org/2001/XMLSchema#unsignedInt',
  XSD_UNSIGNED_SHORT = 'http://www.w3.org/2001/XMLSchema#unsignedShort',
  XSD_UNSIGNED_BYTE = 'http://www.w3.org/2001/XMLSchema#unsignedByte',
  XSD_POSITIVE_INTEGER = 'http://www.w3.org/2001/XMLSchema#positiveInteger',
}

export function make(dt: DataType) {
  return RDFDM.namedNode(dt);
}

// https://www.w3.org/TR/sparql11-query/#operandDataTypes
export enum NumericType {
  XSD_INTEGER = DataType.XSD_INTEGER,
  XSD_DECIMAL = DataType.XSD_DECIMAL,
  XSD_FLOAT = DataType.XSD_FLOAT,
  XSD_DOUBLE = DataType.XSD_DOUBLE,
  XSD_NON_POSITIVE_INTEGER = DataType.XSD_NON_POSITIVE_INTEGER,
  XSD_NEGATIVE_INTEGER = DataType.XSD_NEGATIVE_INTEGER,
  XSD_LONG = DataType.XSD_LONG,
  XSD_INT = DataType.XSD_INT,
  XSD_SHORT = DataType.XSD_SHORT,
  XSD_BYTE = DataType.XSD_BYTE,
  XSD_NON_NEGATIVE_INTEGER = DataType.XSD_NON_NEGATIVE_INTEGER,
  XSD_UNSIGNED_LONG = DataType.XSD_UNSIGNED_LONG,
  XSD_UNSIGNED_INT = DataType.XSD_UNSIGNED_INT,
  XSD_UNSIGNED_SHORT = DataType.XSD_UNSIGNED_SHORT,
  XSD_UNSIGNED_BYTE = DataType.XSD_UNSIGNED_BYTE,
  XSD_POSITIVE_INTEGER = DataType.XSD_POSITIVE_INTEGER,
}

export const commonTerms: { [key: string]: RDF.Term } = {
  true: RDFDM.literal('true', RDFDM.namedNode(DataType.XSD_BOOLEAN)),
  false: RDFDM.literal('false', RDFDM.namedNode(DataType.XSD_BOOLEAN)),
};

export type DataTypeCategory =
  'string'
  | 'date'
  | 'boolean'
  | 'integer'
  | 'decimal'
  | 'float'
  | 'double'
  | 'simple' // Some things are defined for simple strings
  | 'plain' // but not for general plain ones.
  | 'other'
  | 'invalid';

export type NumericTypeCategory = 'integer' | 'decimal' | 'float' | 'double';
export const NumericTypeCategories = Set(['integer', 'decimal', 'float', 'double']);

export function categorize(dataType: string): DataTypeCategory {
  switch (dataType) {
    case null:
    case undefined:
    case '': return 'plain';
    case DataType.XSD_STRING:
    case DataType.RDF_LANG_STRING: return 'string';
    case DataType.XSD_DATE_TIME: return 'date';
    case DataType.XSD_BOOLEAN: return 'boolean';

    case DataType.XSD_DECIMAL: return 'decimal';
    case DataType.XSD_FLOAT: return 'float';
    case DataType.XSD_DOUBLE: return 'double';
    case DataType.XSD_INTEGER:
    case DataType.XSD_NON_POSITIVE_INTEGER:
    case DataType.XSD_NEGATIVE_INTEGER:
    case DataType.XSD_LONG:
    case DataType.XSD_INT:
    case DataType.XSD_SHORT:
    case DataType.XSD_BYTE:
    case DataType.XSD_NON_NEGATIVE_INTEGER:
    case DataType.XSD_UNSIGNED_LONG:
    case DataType.XSD_UNSIGNED_INT:
    case DataType.XSD_UNSIGNED_SHORT:
    case DataType.XSD_UNSIGNED_BYTE:
    case DataType.XSD_POSITIVE_INTEGER: return 'integer';
    default: return 'other';
  }
}

// If datatypes get lost or lose specificity during operations, we can insert a
// concrete type, since categories should remain the same. This mostly (only)
// relevant for integer subtypes.
const _decategorize = Map<DataTypeCategory, DataType>([
  ['integer', DataType.XSD_INTEGER],
  ['float', DataType.XSD_FLOAT],
  ['double', DataType.XSD_DOUBLE],
  ['decimal', DataType.XSD_DECIMAL],
]);

export function decategorize(cat: DataTypeCategory): DataType {
  return _decategorize.get(cat);
}

// ----------------------------------------------------------------------------
// Operators
// ----------------------------------------------------------------------------
// TODO: Maybe rename to functions to match?

// TODO: Rename Operator to functions
export type OperatorType = keyof typeof Operator;
export type OperatorCategory = 'simple' | 'overloaded' | 'special';
export enum Operator {
  // Operator mapping
  // https://www.w3.org/TR/sparql11-query/#OperatorMapping
  NOT = '!',
  UMINUS = 'UMINUS',
  UPLUS = 'UPLUS',

  LOGICAL_AND = '&&',
  LOGICAL_OR = '||',

  EQUAL = '=',
  NOT_EQUAL = '!=',
  LT = '<',
  GT = '>',
  LTE = '<=',
  GTE = '>=',

  MULTIPLICATION = '*',
  DIVISION = '/',
  ADDITION = '+',
  SUBTRACTION = '-',

  // Functional Forms
  // https://www.w3.org/TR/sparql11-query/#func-forms
  BOUND = 'bound',
  IF = 'if',
  COALESCE = 'coalesce',
  // EXISTENCE = 'existence',
  // LOGICAL_OR = '||',
  // LOGICAL_AND = '&&',
  // EQUAL = '=',
  SAME_TERM = 'sameterm',
  IN = 'in',
  NOT_IN = 'notin',

  // Functions on RDF Terms
  // https://www.w3.org/TR/sparql11-query/#func-rdfTerms
  STR = 'str',
  LANG = 'lang',
  DATATYPE = 'datatype',

  // Functions on strings
  // https://www.w3.org/TR/sparql11-query/#func-strings
  LANG_MATCHES = 'langmatches',
  STRLEN = 'strlen',
  REGEX = 'regex',

  // Functions on numerics
  // https://www.w3.org/TR/sparql11-query/#func-numerics
  ABS = 'abs',

  // Functions on Dates and Times
  // https://www.w3.org/TR/sparql11-query/#func-date-time
  NOW = 'now',

  // Hash functions
  // https://www.w3.org/TR/sparql11-query/#func-hash

  // XPath Constructor functions
  // https://www.w3.org/TR/sparql11-query/#FunctionMapping
}

// tslint:disable-next-line:no-any
export const Operators = Set((Object as any).values(Operator));

// export const SpecialOperators = Set<Operator>([3]);

// export enum OverloadedOperator {
//   EQUAL = Operator.EQUAL,
//   NOT_EQUAL = Operator.NOT_EQUAL,
//   LT = Operator.LT,
//   GT = Operator.GT,
//   LTE = Operator.LTE,
//   GTE = Operator.GTE,

//   MULTIPLICATION = Operator.MULTIPLICATION,
//   DIVISION = Operator.DIVISION,
//   ADDITION = Operator.ADDITION,
//   SUBTRACTION = Operator.SUBTRACTION,
// }

// export enum SpecialOperator {
//   AND = Operator.AND,
//   OR = Operator.OR,
// }
