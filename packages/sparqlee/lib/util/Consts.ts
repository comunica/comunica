// tslint:disable:variable-name
import * as RDFDM from '@rdfjs/data-model';
import { Map, Set } from 'immutable';
import * as RDF from 'rdf-js';

export const TRUE_STR = '"true"^^xsd:boolean';
export const FALSE_STR = '"false"^^xsd:boolean';
export const EVB_ERR_STR = '"not an dateTime"^^xsd:dateTime';

// TODO: Consider inlining all with 'const enum'
export enum TypeURL {
  XSD_ANY_URI = 'http://www.w3.org/2001/XMLSchema#anyURI',
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

  // Other types
  XSD_DAYTIME_DURATION = 'http://www.w3.org/2001/XMLSchema#dayTimeDuration',
}

export function make(dt: TypeURL) {
  return RDFDM.namedNode(dt);
}

// https://www.w3.org/TR/sparql11-query/#operandDataTypes
export enum NumericTypeURL {
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

export enum DerivedIntegerTypeURL {
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

export const NumericTypeURLs = Set(Object.values(NumericTypeURL));
export const DerivedIntegerTypeURLs = Set(Object.values(DerivedIntegerTypeURL));

export const commonTerms: { [key: string]: RDF.Term } = {
  true: RDFDM.literal('true', RDFDM.namedNode(TypeURL.XSD_BOOLEAN)),
  false: RDFDM.literal('false', RDFDM.namedNode(TypeURL.XSD_BOOLEAN)),
};

// TODO: Rename to primitive
// https://www.w3.org/TR/xmlschema-2/#built-in-primitive-datatypes
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

export type PrimitiveNumericType = 'integer' | 'decimal' | 'float' | 'double';
export const PrimitiveNumericTypes = Set(['integer', 'decimal', 'float', 'double']);

export function type(typeURL: string): Type {
  switch (typeURL) {
    case null:
    case undefined:
    case '':
    case TypeURL.XSD_ANY_URI: return 'string';
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
const _decategorize = Map<PrimitiveNumericType, TypeURL>([
  ['integer', TypeURL.XSD_INTEGER],
  ['float', TypeURL.XSD_FLOAT],
  ['double', TypeURL.XSD_DOUBLE],
  ['decimal', TypeURL.XSD_DECIMAL],
]);

export function decategorize(cat: PrimitiveNumericType): TypeURL {
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
  IS_IRI = 'isiri',
  IS_BLANK = 'isblank',
  IS_LITERAL = 'isliteral',
  IS_NUMERIC = 'isnumeric',
  STR = 'str',
  LANG = 'lang',
  DATATYPE = 'datatype',
  IRI = 'iri',
  URI = 'uri',
  BNODE = 'BNODE',
  STRDT = 'strdt',
  STRLANG = 'strlang',
  UUID = 'uuid',
  STRUUID = 'struuid',

  // Functions on strings
  // https://www.w3.org/TR/sparql11-query/#func-strings
  STRLEN = 'strlen',
  SUBSTR = 'substr',
  UCASE = 'ucase',
  LCASE = 'lcase',
  STRSTARTS = 'strstarts',
  STRENDS = 'strends',
  CONTAINS = 'contains',
  STRBEFORE = 'strbefore',
  STRAFTER = 'strafter',
  ENCODE_FOR_URI = 'encode_for_uri',
  // CONCAT = 'concat' (see special operators)
  LANG_MATCHES = 'langmatches',
  REGEX = 'regex',
  REPLACE = 'replace',

  // Functions on numerics
  // https://www.w3.org/TR/sparql11-query/#func-numerics
  ABS = 'abs',
  ROUND = 'round',
  CEIL = 'ceil',
  FLOOR = 'floor',
  RAND = 'rand',

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
  MD5 = 'md5',
  SHA1 = 'sha1',
  SHA256 = 'sha256',
  SHA384 = 'sha384',
  SHA512 = 'sha512',

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

  // Functions that are annoying
  CONCAT = 'concat', // Has variable arity
}

export const RegularOperators = Set(Object.values(RegularOperator));
export const SpecialOperators = Set(Object.values(SpecialOperator));
export const Operators = RegularOperators.union(SpecialOperators);

export enum SetFunction {
  COUNT = 'count',
  SUM = 'sum',
  MIN = 'min',
  MAX = 'max',
  AVG = 'avg',
  GROUP_CONCAT = 'group_concat',
  SAMPLE = 'sample',
}
export const SetFunctions = Set(Object.values(SetFunction));

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
