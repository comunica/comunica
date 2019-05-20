#! /usr/bin/env node
// tslint:disable:no-console

import { translate } from 'sparqlalgebrajs';

import { SyncEvaluator } from '../lib/evaluators/SyncEvaluator';
import { Bindings } from '../lib/Types';

const USAGE = `
Usage: sparqlee <expression>
Example: sparqlee 'concat("foo", "bar")'
`;

function template(expr: string) {
  return `
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX fn: <https://www.w3.org/TR/xpath-functions#>
PREFIX err: <http://www.w3.org/2005/xqt-errors#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT * WHERE { ?s ?p ?o FILTER (${expr})}
`;
}

function parse(query: string) {
  const sparqlQuery = translate(query);
  // Extract filter expression from complete query
  return sparqlQuery.input.expression;
}

async function main() {
  if (process.argv.length < 3) {
    console.log(USAGE);
    return;
  }

  const input = process.argv[2];
  const expression = parse(template(input));

  const evaluator = new SyncEvaluator(expression);

  const result = evaluator.evaluate(Bindings({}));

  console.log(result);
}

main();
