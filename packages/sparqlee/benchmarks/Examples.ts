import * as RDF from 'rdf-data-model';
import { Parser, Query, Expression, FilterPattern} from 'sparqljs';

import { Mapping } from '../src/core/Mapping';
import { DataType as DT } from '../src/util/Consts';



const parser = new Parser({'xsd': 'http://www.w3.org/2001/XMLSchema#'})

export class Example {
    expression: Expression;
    mapping: Mapping;

    constructor(expr: string, mapping: Mapping){
        this.expression = toExpression(expr);
        this.mapping = mapping;
    }
}

export const example1 = (() => {
    const str = '((?age + ?otherAge) = "50"^^xsd:integer) && (?joinYear > "2005-01-01T00:00:00Z"^^xsd:dateTime)';
    // const str = '10000 > ?age';
    const mapping = new Map([
        ['age', RDF.literal('20', RDF.namedNode(DT.XSD_INTEGER))],
        ['otherAge', RDF.literal('30', RDF.namedNode(DT.XSD_INTEGER))],
        ['joinYear', RDF.literal('2007-03-03T00:00:00Z', RDF.namedNode(DT.XSD_DATE_TIME))]
    ]);
    return new Example(str, mapping);
})();


function toExpression(expr: string): Expression {
    // Build mock SPARQL query with expression in the filter
    const queryString = `SELECT * WHERE { ?s ?p ?o FILTER (${expr})}`
    const sparqlQuery = parser.parse(queryString) as Query;

    // Extract filter expression from complete query
    return (sparqlQuery.where[1] as FilterPattern).expression;
}
