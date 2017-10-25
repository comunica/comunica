import * as RDF from 'rdf-data-model';
import { Literal } from 'rdf-js';

export const TRUE_STR = '"true"^^xsd:boolean';
export const FALSE_STR = '"false"^^xsd:boolean'
export const TRUE = RDF.literal(TRUE_STR);
export const FALSE = RDF.literal(FALSE_STR);

export const EVB_ERR_STR = '"0FB7"^^xsd:hexBinary';
export const EVB_ERR = RDF.literal(EVB_ERR_STR);