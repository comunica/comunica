import { BindingsFactory } from '@comunica/bindings-factory';
import type * as RDF from '@rdfjs/types';
import type { Quad } from 'rdf-data-factory';
import { DataFactory } from 'rdf-data-factory';
import { Algebra } from 'sparqlalgebrajs';

export const DF = new DataFactory<Quad>();

export const BF = new BindingsFactory();

export function makeAggregate(aggregator: string, distinct = false, separator?: string): Algebra.AggregateExpression {
  return {
    type: Algebra.types.EXPRESSION,
    expressionType: Algebra.expressionTypes.AGGREGATE,
    aggregator: <any> aggregator,
    distinct,
    separator,
    expression: {
      type: Algebra.types.EXPRESSION,
      expressionType: Algebra.expressionTypes.TERM,
      term: DF.variable('x'),
    },
  };
}

export function int(value: string): RDF.Term {
  return DF.literal(value, DF.namedNode('http://www.w3.org/2001/XMLSchema#integer'));
}
