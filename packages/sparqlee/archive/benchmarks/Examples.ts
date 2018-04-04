import * as RDF from 'rdf-data-model';
import { Expression, FilterPattern, Parser, Query } from 'sparqljs';

import { Bindings } from "../src/core/FilteredStreams";
import { DataType as DT } from '../src/util/Consts';

const parser = new Parser({ xsd: 'http://www.w3.org/2001/XMLSchema#' });

export class Example {
  public expression: Expression;
  public mapping: () => Bindings;

  constructor(expr: string, mapping: () => Bindings) {
    this.expression = toExpression(expr);
    this.mapping = mapping;
  }
}

export const example1 = (() => {
  const str = '((?age + ?otherAge) = "50"^^xsd:integer) && (?joinYear > "2005-01-01T00:00:00Z"^^xsd:dateTime)';
  const mapping = () => {
    const randAge = Math.floor((Math.random() * 100));
    const beSame = Math.random() > 0.7;
    const randOtherAge = (beSame)
      ? 50 - randAge
      : Math.floor((Math.random() * 100));
    const randYear = 1980 + Math.floor(Math.random() * 40);

    return Bindings({
      age: RDF.literal(randAge.toString(), RDF.namedNode(DT.XSD_INTEGER)),
      joinYear: RDF.literal(`${randYear}-03-03T00:00:00Z`, RDF.namedNode(DT.XSD_DATE_TIME)),
      otherAge: RDF.literal(randOtherAge.toString(), RDF.namedNode(DT.XSD_INTEGER)),
    });
  };
  return new Example(str, mapping);
})();

function toExpression(expr: string): Expression {
  // Build mock SPARQL query with expression in the filter
  const queryString = `SELECT * WHERE { ?s ?p ?o FILTER (${expr})}`;
  const sparqlQuery = parser.parse(queryString) as Query;

  // Extract filter expression from complete query
  return (sparqlQuery.where[1] as FilterPattern).expression;
}
