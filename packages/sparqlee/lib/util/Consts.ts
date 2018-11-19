// tslint:disable:variable-name
import * as RDFDM from '@rdfjs/data-model';
import { Map, Set } from 'immutable';
import * as RDF from 'rdf-js';

export const TRUE_STR = '"true"^^xsd:boolean';
export const FALSE_STR = '"false"^^xsd:boolean';
export const EVB_ERR_STR = '"not an dateTime"^^xsd:dateTime';

export enum TypeURL {
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

export function make(dt: TypeURL) {
  return RDFDM.namedNode(dt);
}

// https://www.w3.org/TR/sparql11-query/#operandDataTypes
export enum NumericType {
  XSD_INTEGER = TypeURL.XSD_INTEGER,
  XSD_DECIMAL = TypeURL.XSD_DECIMAL,
  XSD_FLOAT = TypeURL.XSD_FLOAT,
  XSD_DOUBLE = TypeURL.XSD_DOUBLE,
  XSD_NON_POSITIVE_INTEGER = TypeURL.XSD_NON_POSITIVE_INTEGER,
  XSD_NEGATIVE_INTEGER = TypeURL.XSD_NEGATIVE_INTEGER,
  XSD_LONG = TypeURL.XSD_LONG,
  XSD_INT = TypeURL.XSD_INT,
  XSD_SHORT = TypeURL.XSD_SHORT,
  XSD_BYTE = TypeURL.XSD_BYTE,
  XSD_NON_NEGATIVE_INTEGER = TypeURL.XSD_NON_NEGATIVE_INTEGER,
  XSD_UNSIGNED_LONG = TypeURL.XSD_UNSIGNED_LONG,
  XSD_UNSIGNED_INT = TypeURL.XSD_UNSIGNED_INT,
  XSD_UNSIGNED_SHORT = TypeURL.XSD_UNSIGNED_SHORT,
  XSD_UNSIGNED_BYTE = TypeURL.XSD_UNSIGNED_BYTE,
  XSD_POSITIVE_INTEGER = TypeURL.XSD_POSITIVE_INTEGER,
}

export const commonTerms: { [key: string]: RDF.Term } = {
  true: RDFDM.literal('true', RDFDM.namedNode(TypeURL.XSD_BOOLEAN)),
  false: RDFDM.literal('false', RDFDM.namedNode(TypeURL.XSD_BOOLEAN)),
};

export type Type =
  'string'
  | 'langString'
  | 'date'
  | 'boolean'
  | 'integer'
  | 'decimal'
  | 'float'
  | 'double'
  | 'other'
  | 'nonlexical';

export type NumericTypeCategory = 'integer' | 'decimal' | 'float' | 'double';
export const NumericTypeCategories = Set(['integer', 'decimal', 'float', 'double']);

export function type(typeURL: string): Type {
  switch (typeURL) {
    case null:
    case undefined:
    case '':
    case TypeURL.XSD_STRING: return 'string';
    case TypeURL.RDF_LANG_STRING: return 'langString';
    case TypeURL.XSD_DATE_TIME: return 'date';
    case TypeURL.XSD_BOOLEAN: return 'boolean';

    case TypeURL.XSD_DECIMAL: return 'decimal';
    case TypeURL.XSD_FLOAT: return 'float';
    case TypeURL.XSD_DOUBLE: return 'double';
    case TypeURL.XSD_INTEGER:
    case TypeURL.XSD_NON_POSITIVE_INTEGER:
    case TypeURL.XSD_NEGATIVE_INTEGER:
    case TypeURL.XSD_LONG:
    case TypeURL.XSD_INT:
    case TypeURL.XSD_SHORT:
    case TypeURL.XSD_BYTE:
    case TypeURL.XSD_NON_NEGATIVE_INTEGER:
    case TypeURL.XSD_UNSIGNED_LONG:
    case TypeURL.XSD_UNSIGNED_INT:
    case TypeURL.XSD_UNSIGNED_SHORT:
    case TypeURL.XSD_UNSIGNED_BYTE:
    case TypeURL.XSD_POSITIVE_INTEGER: return 'integer';
    default: return 'other';
  }
}

// If datatypes get lost or lose specificity during operations, we can insert a
// concrete type, since categories should remain the same. This mostly (only)
// relevant for integer subtypes.
const _decategorize = Map<Type, TypeURL>([
  ['integer', TypeURL.XSD_INTEGER],
  ['float', TypeURL.XSD_FLOAT],
  ['double', TypeURL.XSD_DOUBLE],
  ['decimal', TypeURL.XSD_DECIMAL],
]);

export function decategorize(cat: Type): TypeURL {
  return _decategorize.get(cat);
}

// ----------------------------------------------------------------------------
// Operators
// ----------------------------------------------------------------------------

export type OperatorCategory = 'regular' | 'special';
export type Operator = RegularOperator | SpecialOperator;

// TODO: Remove unneeded double typing
export enum RegularOperator {
  // Operator mapping
  // https://www.w3.org/TR/sparql11-query/#OperatorMapping
  NOT = '!',
  UMINUS = 'UMINUS',
  UPLUS = 'UPLUS',
  // LOGICAL_AND // See SpecialOperators
  // LOGICAL_OR  // See SpecialOperators

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
  // See SpecialOperators

  // Functions on RDF Terms
  // https://www.w3.org/TR/sparql11-query/#func-rdfTerms
  IS_IRI = 'isIRI',
  IS_BLANK = 'isBlank',
  IS_LITERAL = 'isLiteral',
  IS_NUMERIC = 'isNumeric',
  STR = 'str',
  LANG = 'lang',
  DATATYPE = 'datatype',
  IRI = 'IRI',
  BNODE = 'BNODE',
  STRDT = 'STRDT',
  STRLANG = 'STRLANG',
  UUID = 'UUID',
  STRUUID = 'STRUUID',

  // Functions on strings
  // https://www.w3.org/TR/sparql11-query/#func-strings
  STRLEN = 'strlen',
  SUBSTR = 'SUBSTR',
  UCASE = 'UCASE',
  LCASE = 'LCASE',
  STRSTARTS = 'STRSTARTS',
  STRENDS = 'STRENDS',
  CONTAINS = 'CONTAINS',
  STRBEFORE = 'STRBEFORE',
  STRAFTER = 'STRAFTER',
  ENCODE_FOR_URI = 'ENCODE_FOR_URI',
  CONCAT = 'CONCAT',
  LANG_MATCHES = 'langmatches',
  REGEX = 'regex',
  REPLACE = 'REPLACE',

  // Functions on numerics
  // https://www.w3.org/TR/sparql11-query/#func-numerics
  ABS = 'abs',
  ROUND = 'round',
  CEIL = 'ceil',
  FLOOR = 'floor',
  RAND = 'RAND',

  // Functions on Dates and Times
  // https://www.w3.org/TR/sparql11-query/#func-date-time
  NOW = 'now',
  YEAR = 'year',
  MONTH = 'month',
  DAY = 'day',
  HOURS = 'hours',
  MINUTES = 'minutes',
  SECONDS = 'seconds',
  TIMEZONE = 'timezone',
  TZ = 'tz',

  // Hash functions
  // https://www.w3.org/TR/sparql11-query/#func-hash
  MD5 = 'MD5',
  SHA1 = 'SHA1',
  SHA256 = 'SHA256',
  SHA384 = 'SHA384',
  SHA512 = 'SHA512',

  // XPath Constructor functions
  // https://www.w3.org/TR/sparql11-query/#FunctionMapping
  // See Named Operators
}

export enum SpecialOperator {
  // Functional Forms
  // https://www.w3.org/TR/sparql11-query/#func-forms
  BOUND = 'bound',
  IF = 'if',
  COALESCE = 'coalesce',
  // EXISTENCE = 'existence',
  LOGICAL_OR = '||',
  LOGICAL_AND = '&&',
  // EQUAL = '=', // See RegularOperators
  SAME_TERM = 'sameterm',
  IN = 'in',
  NOT_IN = 'notin',
}

export const RegularOperators = Set(Object.values(RegularOperator));
export const SpecialOperators = Set(Object.values(SpecialOperator));
export const Operators = RegularOperators.union(SpecialOperators);

export type NamedOperator =
  // XPath Constructor functions
  // https://www.w3.org/TR/sparql11-query/#FunctionMapping
  TypeURL.XSD_STRING
  | TypeURL.XSD_FLOAT
  | TypeURL.XSD_DOUBLE
  | TypeURL.XSD_DECIMAL
  | TypeURL.XSD_INTEGER
  | TypeURL.XSD_DATE_TIME
  | TypeURL.XSD_BOOLEAN;

export const NamedOperators = Set([
  TypeURL.XSD_STRING,
  TypeURL.XSD_FLOAT,
  TypeURL.XSD_DOUBLE,
  TypeURL.XSD_DECIMAL,
  TypeURL.XSD_INTEGER,
  TypeURL.XSD_DATE_TIME,
  TypeURL.XSD_BOOLEAN,
]);
