/// <reference path="../../types/rdf-data-model/index.d.ts"/>
// Workaround until better solution (TODO), only usable for example case.
import * as RDF from 'rdf-data-model';

export function stringToTerm(value: string) {
    var datatype;
    var term;

    if (value.includes('^^')) {
        var split = value.split('^^');
        datatype = RDF.namedNode(split[1]);
        term = RDF.literal(split[0].substring(1, split[0].length - 1), datatype);
    }

    if (value.includes('?')) {
        term = RDF.variable(value.split('?')[1])
    }

    return term;
}