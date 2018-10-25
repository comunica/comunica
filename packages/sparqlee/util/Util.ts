import * as RDFDM from '@rdfjs/data-model';
import { Map } from 'immutable';
import * as RDF from 'rdf-js';

import { Algebra as Alg, translate } from 'sparqlalgebrajs';
import { AsyncEvaluator } from '../lib/AsyncEvaluator';
import { Bindings } from '../lib/core/Types';
import { TypeURL as DT } from '../lib/util/Consts';
import { UnimplementedError } from '../lib/util/Errors';

export class Example {
  expression: Alg.Expression;
  mapping: () => Bindings;

  constructor(expr: string, mapping?: () => Bindings) {
    this.expression = parse(expr);
    this.mapping = mapping || (() => Bindings({}));
  }

  async evaluate(mapping?: Bindings): Promise<RDF.Term> {
    const evaluator = new AsyncEvaluator(this.expression, mockLookUp, mockAggregator);
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
  const evaluator = new AsyncEvaluator(parse(expr), mockLookUp, mockAggregator);
  return evaluator.evaluate(bindings);
}

export const mockLookUp = (pattern: Alg.ExistenceExpression) => {
  return Promise.resolve(true);
};

export const mockAggregator = {
  count(exp: Alg.Expression): Promise<number> {
    return Promise.resolve(3.14);
  },
  sum(exp: Alg.Expression): Promise<number> {
    return Promise.resolve(3.14);
  },
  min(exp: Alg.Expression): Promise<number> {
    return Promise.resolve(3.14);
  },
  max(exp: Alg.Expression): Promise<number> {
    return Promise.resolve(3.14);
  },
  avg(exp: Alg.Expression): Promise<number> {
    return Promise.resolve(3.14);
  },
  groupConcat(exp: Alg.Expression): Promise<string> {
    return Promise.resolve('term term term');
  },
  sample(exp: Alg.Expression): Promise<RDF.Term> {
    return Promise.resolve(RDFDM.literal('MockTerm'));
  },
};

export function parse(expr: string): Alg.Expression {
  // Build mock SPARQL query with expression in the filter
  const prefixes = `PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
                    PREFIX fn: <https://www.w3.org/TR/xpath-functions#>
                    PREFIX err: <http://www.w3.org/2005/xqt-errors#>`;
  const queryString = `${prefixes} SELECT * WHERE { ?s ?p ?o FILTER (${expr})}`;
  const sparqlQuery = translate(queryString);
  // Extract filter expression from complete query
  return sparqlQuery.input.expression;
}

export function parseFull(expr: string): Alg.Operation {
  const prefixes = `PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
                    PREFIX fn: <https://www.w3.org/TR/xpath-functions#>
                    PREFIX err: <http://www.w3.org/2005/xqt-errors#>`;
  const queryString = `${prefixes} ${expr}`;
  const sparqlQuery = translate(queryString);
  return sparqlQuery;
}
