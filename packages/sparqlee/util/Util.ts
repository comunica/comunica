import * as RDFDM from '@rdfjs/data-model';
import * as RDF from 'rdf-js';
import { Algebra as Alg, translate } from 'sparqlalgebrajs';

import * as C from '../lib/util/Consts';

import { AsyncEvaluator } from '../lib/evaluators/AsyncEvaluator';
import { Bindings, Hooks } from '../lib/Types';
import { TypeURL as DT } from '../lib/util/Consts';

export class Example {
  expression: Alg.Expression;
  mapping: () => Bindings;

  constructor(expr: string, mapping?: () => Bindings) {
    this.expression = parse(expr);
    this.mapping = mapping || (() => Bindings({}));
  }

  async evaluate(mapping?: Bindings): Promise<RDF.Term> {
    const evaluator = new AsyncEvaluator(this.expression, mockHooks);
    return mapping
      ? evaluator.evaluate(mapping)
      : evaluator.evaluate(this.mapping());
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
      age: RDFDM.literal(randAge.toString(), RDFDM.namedNode(DT.XSD_INTEGER)),
      joinYear: RDFDM.literal(`${randYear}-03-03T00:00:00Z`, RDFDM.namedNode(DT.XSD_DATE_TIME)),
      otherAge: RDFDM.literal(randOtherAge.toString(), RDFDM.namedNode(DT.XSD_INTEGER)),
    });
  };
  return new Example(str, mapping);
})();

export function evaluate(expr: string, bindings = Bindings({})): Promise<RDF.Term> {
  const evaluator = new AsyncEvaluator(parse(expr), mockHooks);
  return evaluator.evaluate(bindings);
}

export function mockExistence(expression: Alg.ExistenceExpression): Promise<boolean> {
  return Promise.resolve(true);
}

export function mockAggregate(expression: Alg.AggregateExpression): Promise<RDF.Term> {
  switch (expression.aggregator) {
    case 'count':
    case 'sum':
    case 'min':
    case 'max':
    case 'avg': return Promise.resolve(RDFDM.literal('3.14', C.make(DT.XSD_FLOAT)));
    case 'groupConcat': return Promise.resolve(RDFDM.literal('term term term'));
    case 'sample': return Promise.resolve(RDFDM.literal('MockTerm'));
    default: throw new Error('woops y daisy');
  }
}

export const mockHooks: Hooks = {
  existence: mockExistence,
  aggregate: mockAggregate,
};

export function parse(expr: string): Alg.Expression {
  // Build mock SPARQL query with expression in the filter
  const prefixes = `PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
                    PREFIX fn: <https://www.w3.org/TR/xpath-functions#>
                    PREFIX err: <http://www.w3.org/2005/xqt-errors#>
                    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>`;
  const queryString = `${prefixes} SELECT * WHERE { ?s ?p ?o FILTER (${expr})}`;
  const sparqlQuery = translate(queryString);
  // Extract filter expression from complete query
  return sparqlQuery.input.expression;
}

export function parseFull(expr: string): Alg.Operation {
  const prefixes = `PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
                    PREFIX fn: <https://www.w3.org/TR/xpath-functions#>
                    PREFIX err: <http://www.w3.org/2005/xqt-errors#>
                    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>`;
  const queryString = `${prefixes} ${expr}`;
  const sparqlQuery = translate(queryString);
  return sparqlQuery;
}
