import { stringToTerm, termToString } from 'rdf-string';

import { ExpressionError } from '../../lib/util/Errors';
import { evaluate } from '../../util/Util';

export function testAll(exprs: string[]) {
  exprs.forEach((_expr) => {
    const expr = _expr.trim();
    const equals = expr.match(/ = .*$/)[0];
    const body = expr.replace(equals, '');
    const _result = equals.replace(' = ', '');
    const result = replacePrefix(_result);
    // console.log(`${expr}\n${equals}\n${body}\n${_result}\n${result}`);
    it(`${body} should evaluate to ${_result}`, () => {
      return expect(evaluate(body).then(termToString))
        .resolves
        .toEqual(result);
    });
  });
}

export function testAllErrors(exprs: string[]) {
  exprs.forEach((_expr) => {
    const expr = _expr.trim();
    const equals = expr.match(/ = error *$/)[0];
    const body = expr.replace(equals, '');
    it(`${body} should error`, () => {
      return expect(evaluate(body).then(termToString))
        .rejects
        .toThrowError(ExpressionError);
    });
  });
}

export const aliases = {
  true: '"true"^^xsd:boolean',
  false: '"false"^^xsd:boolean',
};

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
