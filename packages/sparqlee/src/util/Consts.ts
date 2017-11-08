import * as RDF from 'rdf-data-model';
import { DefaultGraph, Literal } from 'rdf-js';

export const TRUE_STR = '"true"^^xsd:boolean';
export const FALSE_STR = '"false"^^xsd:boolean'
export const EVB_ERR_STR = '"0FB7"^^xsd:hexBinary';

export enum TermTypes {
    NamedNode = 'NamedNode',
    BlankNode = 'BlankNode',
    Variable  = 'Variable',
    Literal   = 'Literal',
    DefaultGraph = 'DefaultGraph'
}

export enum ExpressionTypes {
    Operation = 'operation',
    FunctionCall = 'functionCall',
    Aggregate = 'aggregate',
    BGP = 'bgp',
    Group = 'group'
}

// TODO: Operator enum
// TODO: Function enum