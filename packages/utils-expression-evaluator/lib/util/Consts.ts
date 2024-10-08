import type * as RDF from '@rdfjs/types';
import { DataFactory } from 'rdf-data-factory';

export type KnownLiteralTypes = TypeAlias | TypeURL;

export enum TypeAlias {
  // Numeric is everything defined in https://www.w3.org/TR/sparql11-query/#operandDataTypes
  SPARQL_NUMERIC = 'SPARQL_NUMERIC',
  /**
   * Stringly is everything defined in https://www.w3.org/TR/sparql11-query/#func-strings
   * In other words it is a simple literal, a plain literal with language tag, or a literal with datatype xsd:string
   * In other words, since utils-expression-evaluator transforms a simple literal to xsd_string.
   * It is RDF_LANG_STRING or XSD_STRING.
   * Reasons for this are mentioned here: w3c/sparql-12#112
   */
  SPARQL_STRINGLY = 'SPARQL_STRINGLY',
}

const DF = new DataFactory();

export function typedLiteral(value: string, type: TypeURL): RDF.Literal {
  return DF.literal(value, DF.namedNode(type));
}

export enum TypeURL {
  XSD_ANY_URI = 'http://www.w3.org/2001/XMLSchema#anyURI',
  XSD_STRING = 'http://www.w3.org/2001/XMLSchema#string',
  RDF_LANG_STRING = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#langString',

  XSD_BOOLEAN = 'http://www.w3.org/2001/XMLSchema#boolean',

  XSD_DATE_TIME = 'http://www.w3.org/2001/XMLSchema#dateTime',
  XSD_DATE_TIME_STAMP = 'http://www.w3.org/2001/XMLSchema#dateTimeStamp',
  XSD_DATE = 'http://www.w3.org/2001/XMLSchema#date',

  XSD_G_MONTH = 'http://www.w3.org/2001/XMLSchema#gMonth',
  XSD_G_MONTHDAY = 'http://www.w3.org/2001/XMLSchema#gMonthDay',
  XSD_G_YEAR = 'http://www.w3.org/2001/XMLSchema#gYear',
  XSD_G_YEAR_MONTH = 'http://www.w3.org/2001/XMLSchema#gYearMonth',
  XSD_TIME = 'http://www.w3.org/2001/XMLSchema#time',
  XSD_G_DAY = 'http://www.w3.org/2001/XMLSchema#gDay',

  // Numeric types
  XSD_DECIMAL = 'http://www.w3.org/2001/XMLSchema#decimal',
  XSD_FLOAT = 'http://www.w3.org/2001/XMLSchema#float',
  XSD_DOUBLE = 'http://www.w3.org/2001/XMLSchema#double',

  // Derived numeric types
  XSD_INTEGER = 'http://www.w3.org/2001/XMLSchema#integer',

  XSD_NON_POSITIVE_INTEGER = 'http://www.w3.org/2001/XMLSchema#nonPositiveInteger',
  XSD_NEGATIVE_INTEGER = 'http://www.w3.org/2001/XMLSchema#negativeInteger',

  XSD_LONG = 'http://www.w3.org/2001/XMLSchema#long',
  XSD_INT = 'http://www.w3.org/2001/XMLSchema#int',
  XSD_SHORT = 'http://www.w3.org/2001/XMLSchema#short',
  XSD_BYTE = 'http://www.w3.org/2001/XMLSchema#byte',

  XSD_NON_NEGATIVE_INTEGER = 'http://www.w3.org/2001/XMLSchema#nonNegativeInteger',
  XSD_POSITIVE_INTEGER = 'http://www.w3.org/2001/XMLSchema#positiveInteger',
  XSD_UNSIGNED_LONG = 'http://www.w3.org/2001/XMLSchema#unsignedLong',
  XSD_UNSIGNED_INT = 'http://www.w3.org/2001/XMLSchema#unsignedInt',
  XSD_UNSIGNED_SHORT = 'http://www.w3.org/2001/XMLSchema#unsignedShort',
  XSD_UNSIGNED_BYTE = 'http://www.w3.org/2001/XMLSchema#unsignedByte',

  // Derived String Type
  XSD_NORMALIZED_STRING = 'http://www.w3.org/2001/XMLSchema#normalizedString',
  XSD_TOKEN = 'http://www.w3.org/2001/XMLSchema#token',
  XSD_LANGUAGE = 'http://www.w3.org/2001/XMLSchema#language',
  XSD_NM_TOKEN = 'http://www.w3.org/2001/XMLSchema#NMTOKEN',

  XSD_NAME = 'http://www.w3.org/2001/XMLSchema#name',
  XSD_NC_NAME = 'http://www.w3.org/2001/XMLSchema#NCName',
  XSD_ENTITY = 'http://www.w3.org/2001/XMLSchema#ENTITY',
  XSD_ID = 'http://www.w3.org/2001/XMLSchema#ID',
  XSD_ID_REF = 'http://www.w3.org/2001/XMLSchema#IDREF',

  // Other types
  XSD_DURATION = 'http://www.w3.org/2001/XMLSchema#duration',
  XSD_YEAR_MONTH_DURATION = 'http://www.w3.org/2001/XMLSchema#yearMonthDuration',
  XSD_DAY_TIME_DURATION = 'http://www.w3.org/2001/XMLSchema#dayTimeDuration',
}

// ----------------------------------------------------------------------------
// Operators
// ----------------------------------------------------------------------------

export type GeneralOperator = KnownOperator | string;

export type KnownOperator = SparqlOperator | NamedOperator;

// TODO: Remove unneeded double typing
export enum SparqlOperator {
  // Operator mapping
  // https://www.w3.org/TR/sparql11-query/#OperatorMapping
  NOT = '!',
  UMINUS = 'uminus',
  UPLUS = 'uplus',
  LOGICAL_OR = '||',
  LOGICAL_AND = '&&',

  EQUAL = '=',
  NOT_EQUAL = '!=',
  LT = '<',
  GT = '>',
  LTE = '<=',
  GTE = '>=',
  SAME_TERM = 'sameterm',
  IN = 'in',
  NOT_IN = 'notin',

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
  IS_URI = 'isuri',
  IS_BLANK = 'isblank',
  IS_LITERAL = 'isliteral',
  IS_NUMERIC = 'isnumeric',
  STR = 'str',
  LANG = 'lang',
  DATATYPE = 'datatype',
  IRI = 'iri',
  URI = 'uri',
  BNODE = 'bnode',
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
  CONCAT = 'concat',
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

  // Functions for quoted triples
  // https://w3c.github.io/rdf-star/cg-spec/editors_draft.html#triple-function
  TRIPLE = 'triple',
  SUBJECT = 'subject',
  PREDICATE = 'predicate',
  OBJECT = 'object',
  IS_TRIPLE = 'istriple',

  // Functional Forms
  // https://www.w3.org/TR/sparql11-query/#func-forms
  BOUND = 'bound',
  IF = 'if',
  COALESCE = 'coalesce',
}

export type NamedOperator =
  // XPath Constructor functions
  // https://www.w3.org/TR/sparql11-query/#FunctionMapping
  TypeURL.XSD_STRING
  | TypeURL.XSD_FLOAT
  | TypeURL.XSD_DOUBLE
  | TypeURL.XSD_DECIMAL
  | TypeURL.XSD_INTEGER
  | TypeURL.XSD_DATE_TIME
  | TypeURL.XSD_DATE
  | TypeURL.XSD_BOOLEAN
  | TypeURL.XSD_TIME
  | TypeURL.XSD_DURATION
  | TypeURL.XSD_DAY_TIME_DURATION
  | TypeURL.XSD_YEAR_MONTH_DURATION;
