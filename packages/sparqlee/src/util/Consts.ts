import * as RDF from 'rdf-data-model';
import { DefaultGraph, Literal } from 'rdf-js';

export const TRUE_STR = '"true"^^xsd:boolean';
export const FALSE_STR = '"false"^^xsd:boolean';
export const EVB_ERR_STR = '"not an integer"^^xsd:integer';

// TODO: Make clear distinction that these are rdfjs types
export enum TermTypes {
    NamedNode = 'NamedNode',
    BlankNode = 'BlankNode',
    Variable  = 'Variable',
    Literal   = 'Literal',
    DefaultGraph = 'DefaultGraph',
}

// TODO: Make clear distinction that these are SPARQLjs types
export enum ExpressionTypes {
    Operation = 'operation',
    FunctionCall = 'functionCall',
    Aggregate = 'aggregate',
    BGP = 'bgp',
    Group = 'group',
}

export enum DataType {
    // TODO: SPARQL.js output is wrong?
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

// https://www.w3.org/TR/sparql11-query/#operandDataTypes
export type NumericType =
    DataType.XSD_INTEGER
    | DataType.XSD_DECIMAL
    | DataType.XSD_FLOAT
    | DataType.XSD_DOUBLE
    | DataType.XSD_NON_POSITIVE_INTEGER
    | DataType.XSD_NEGATIVE_INTEGER
    | DataType.XSD_LONG
    | DataType.XSD_INT
    | DataType.XSD_SHORT
    | DataType.XSD_BYTE
    | DataType.XSD_NON_NEGATIVE_INTEGER
    | DataType.XSD_UNSIGNED_LONG
    | DataType.XSD_UNSIGNED_INT
    | DataType.XSD_UNSIGNED_SHORT
    | DataType.XSD_UNSIGNED_BYTE
    | DataType.XSD_POSITIVE_INTEGER

// TODO: Operator enum
// TODO: Function enum