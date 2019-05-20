import * as RDF from 'rdf-js';

import { literal } from '@rdfjs/data-model';
import { stringToTerm, termToString } from 'rdf-string';
import { translate } from 'sparqlalgebrajs';

import { AsyncEvaluator, AsyncEvaluatorConfig } from '../../lib/evaluators/AsyncEvaluator';
import { Bindings } from '../../lib/Types';
import { ExpressionError } from '../../lib/util/Errors';

export function testAll(exprs: string[], config?: AsyncEvaluatorConfig) {
  exprs.forEach((_expr) => {
    const expr = _expr.trim();
    const equals = expr.match(/ = [^=]*$/g).pop();
    const body = expr.replace(equals, '');
    const _result = equals.replace(' = ', '');
    const result = stringToTerm(replacePrefix(_result));
    // console.log(`${expr}\n${equals}\n${body}\n${_result}\n${result}`);
    it(`${body} should evaluate to ${_result}`, () => {
      return expect(evaluate(body, config)
        .then(termToString))
        .resolves
        .toBe(termToString(result));
    });
  });
}

export function testAllErrors(exprs: string[], config?: AsyncEvaluatorConfig) {
  exprs.forEach((_expr) => {
    const expr = _expr.trim();
    const equals = expr.match(/ = error *$/)[0];
    const body = expr.replace(equals, '');
    it(`${body} should error`, () => {
      return expect(evaluate(body, config)
        .then(termToString))
        .rejects
        .toThrowError(ExpressionError);
    });
  });
}

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

export function evaluate(expr: string, config?: AsyncEvaluatorConfig): Promise<RDF.Term> {
  const evaluator = new AsyncEvaluator(parse(template(expr)), config);
  return evaluator.evaluate(Bindings({}));
}

export const aliases = {
  true: '"true"^^xsd:boolean',
  false: '"false"^^xsd:boolean',
};

export function int(value: string): string {
  return termToString(literal(value, 'xsd:integer'));
}

export function float(value: string): string {
  return termToString(literal(value, 'xsd:float'));
}

export function decimal(value: string): string {
  return termToString(literal(value, 'xsd:decimal'));
}

export function double(value: string): string {
  return termToString(literal(value, 'xsd:double'));
}

export const prefixes: { [key: string]: string } = {
  xsd: 'http://www.w3.org/2001/XMLSchema#',
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
};

export function replacePrefix(str: string): string {
  const prefixLocs = str.match(/\^\^.*:/);
  if (!prefixLocs) { return str; }
  const prefix = prefixLocs[0].slice(2, -1);
  return str.replace(prefix + ':', prefixes[prefix]);
}

function log<T>(thing: T): T {
  // tslint:disable-next-line:no-console
  console.log(thing);
  return thing;
}
