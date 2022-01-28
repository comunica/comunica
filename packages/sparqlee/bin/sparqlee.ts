#! /usr/bin/env node

import { BindingsFactory } from '@comunica/bindings-factory';
import type { Algebra as Alg } from 'sparqlalgebrajs';
import { translate } from 'sparqlalgebrajs';
import { SyncEvaluator } from '../lib/evaluators/SyncEvaluator';

const USAGE = `
Usage: sparqlee <expression>
Example: sparqlee 'concat("foo", "bar")'
`;

function template(expr: string): string {
  return `
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX fn: <https://www.w3.org/TR/xpath-functions#>
PREFIX err: <http://www.w3.org/2005/xqt-errors#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT * WHERE { ?s ?p ?o FILTER (${expr})}
`;
}

function parse(query: string): Alg.Expression {
  const sparqlQuery = translate(query);
  // Extract filter expression from complete query
  return sparqlQuery.input.expression;
}

async function main(): Promise<void> {
  if (process.argv.length < 3) {
    // eslint-disable-next-line no-console
    console.log(USAGE);
    return;
  }

  const input = process.argv[2];
  const expression = parse(template(input));

  const evaluator = new SyncEvaluator(expression);

  const result = evaluator.evaluate(new BindingsFactory().bindings());

  // eslint-disable-next-line no-console
  console.log(result);
}

main().catch(error => {
  // eslint-disable-next-line no-console
  console.log(error);
});
