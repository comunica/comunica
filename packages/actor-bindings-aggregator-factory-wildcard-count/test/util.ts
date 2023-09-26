import exp = require('constants');
import { BindingsFactory } from '@comunica/bindings-factory';
import type * as RDF from '@rdfjs/types';
import type { Quad } from 'rdf-data-factory';
import { DataFactory } from 'rdf-data-factory';
import { Algebra } from 'sparqlalgebrajs';
import { Wildcard } from 'sparqljs';

export const DF = new DataFactory<Quad>();

export const BF = new BindingsFactory();

export function makeAggregate(aggregator: string, distinct = false, wildcard = false): Algebra.AggregateExpression {
  const inner: Algebra.Expression = wildcard ?
    {
      type: Algebra.types.EXPRESSION,
      expressionType: Algebra.expressionTypes.WILDCARD,
      wildcard: new Wildcard(),
    } :
    {
      type: Algebra.types.EXPRESSION,
      expressionType: Algebra.expressionTypes.TERM,
      term: DF.variable('x'),
    };
  return {
    type: Algebra.types.EXPRESSION,
    expressionType: Algebra.expressionTypes.AGGREGATE,
    aggregator: <any> aggregator,
    distinct,
    expression: inner,
  };
}

export function int(value: string): RDF.Term {
  return DF.literal(value, DF.namedNode('http://www.w3.org/2001/XMLSchema#integer'));
}

export function date(value: string): RDF.Term {
  return DF.literal(value, DF.namedNode('http://www.w3.org/2001/XMLSchema#date'));
}

export function string(value: string): RDF.Term {
  return DF.literal(value, DF.namedNode('http://www.w3.org/2001/XMLSchema#string'));
}

export function double(value: string): RDF.Term {
  return DF.literal(value, DF.namedNode('http://www.w3.org/2001/XMLSchema#double'));
}

export function float(value: string): RDF.Term {
  return DF.literal(value, DF.namedNode('http://www.w3.org/2001/XMLSchema#float'));
}

export function nonLiteral(): RDF.Term {
  return DF.namedNode('http://example.org/');
}

export function decimal(value: string): RDF.Term {
  return DF.literal(value, DF.namedNode('http://www.w3.org/2001/XMLSchema#decimal'));
}
