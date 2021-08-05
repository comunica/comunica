import { stringToTerm, termToString } from 'rdf-string';
import { ExpressionError } from '../../lib/util/Errors';
import type { GeneralEvaluationConfig } from './generalEvaluation';
import { generalEvaluate } from './generalEvaluation';

export function testAll(exprs: string[], config?: GeneralEvaluationConfig) {
  exprs.forEach(_expr => {
    const expr = _expr.trim();
    const matched = expr.match(/ = [^=]*$/ug);
    if (!matched) {
      throw new Error(`Could not match '${expr}'`);
    }
    const equals = matched.pop();
    const body = expr.replace(equals, '');
    const _result = equals.replace(' = ', '');
    const result = stringToTerm(replacePrefix(_result));
    // Console.log(`${expr}\n${equals}\n${body}\n${_result}\n${result}`);
    it(`${body} should evaluate to ${_result}`, async() => {
      const evaluated = await generalEvaluate({
        expression: template(body), expectEquality: true, generalEvaluationConfig: config,
      });
      expect(termToString(evaluated.asyncResult)).toEqual(termToString(result));
    });
  });
}

export function testAllErrors(exprs: string[], config?: GeneralEvaluationConfig) {
  exprs.forEach(_expr => {
    const expr = _expr.trim();
    const equals = (/ = error *$/u.exec(expr))[0];
    const body = expr.replace(equals, '');
    it(`${body} should error`, () => {
      return expect(generalEvaluate({
        expression: template(body), expectEquality: true, generalEvaluationConfig: config,
      }).then(res => termToString(res.asyncResult)))
        .rejects
        .toThrowError(ExpressionError);
    });
  });
}

export function template(expr: string) {
  return `
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX fn: <https://www.w3.org/TR/xpath-functions#>
PREFIX err: <http://www.w3.org/2005/xqt-errors#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT * WHERE { ?s ?p ?o FILTER (${expr})}
`;
}

export const aliases = {
  true: '"true"^^xsd:boolean',
  false: '"false"^^xsd:boolean',
};

export function int(value: string): string {
  return compactTermString(value, 'xsd:integer');
}

export function decimal(value: string): string {
  return compactTermString(value, 'xsd:decimal');
}

export function double(value: string): string {
  return compactTermString(value, 'xsd:double');
}

export function date(value: string): string {
  return compactTermString(value, 'xsd:dateTime');
}

function compactTermString(value: string, dataType: string): string {
  return `"${value}"^^${dataType}`;
}

export const prefixes: Record<string, string> = {
  xsd: 'http://www.w3.org/2001/XMLSchema#',
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
};

export function replacePrefix(str: string): string {
  const prefixLocs = /\^\^.*:/u.exec(str);
  if (!prefixLocs) { return str; }
  const prefix = prefixLocs[0].slice(2, -1);
  return str.replace(`${prefix}:`, prefixes[prefix]);
}
