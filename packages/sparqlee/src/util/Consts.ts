import * as RDF from 'rdf-data-model';
import { Literal } from 'rdf-js';

export const TRUE_STR = '"true"^^xsd:boolean';
export const FALSE_STR = '"false"^^xsd:boolean'
export const TRUE = RDF.literal(TRUE_STR);
export const FALSE = RDF.literal(FALSE_STR);

// TODO: Pick better datatype for EVB err (eg. foaf:Person)
export const EVB_ERR_STR = '"2001-10-26T21:32:52"^^xsd:dateTime';
export const EVB_ERR = RDF.literal(EVB_ERR_STR);