import { Bindings } from '@comunica/bus-query-operation';
import { DataFactory } from 'rdf-data-factory';
import type { Algebra } from 'sparqlalgebrajs';
import * as SparqlExpressionEvaluator from '../lib/SparqlExpressionEvaluator';
const DF = new DataFactory();

function termExpression(term: any): Algebra.TermExpression {
  return { type: 'expression', expressionType: 'term', term };
}

function operatorExpression(operator: string, args: Algebra.Expression[]): Algebra.OperatorExpression {
  return { type: 'expression', expressionType: 'operator', operator, args };
}

function namedExpression(name: string, args: Algebra.Expression[]): Algebra.NamedExpression {
  return { type: 'expression', expressionType: 'named', name: DF.namedNode(name), args };
}

describe('SparqlExpressionEvaluator', () => {
  let bindings: Bindings;

  beforeEach(() => {
    bindings = Bindings({
      '?a': DF.literal('1'),
      '?b': DF.literal('2'),
      '?c': DF.literal('apple'),
      '?d': DF.namedNode('http://example.org/sparql'),
    });
  });

  it('can not handle all expression', () => {
    expect(() => SparqlExpressionEvaluator.createEvaluator(
      { type: 'expression', expressionType: 'existence' },
    )).toThrow();
  });

  it('can not handle all operators', () => {
    expect(() => SparqlExpressionEvaluator.createEvaluator(
      operatorExpression('DUMMY', []),
    )).toThrow();
  });

  describe('A TermExpression', () => {
    it('returns the static value for Literals', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(termExpression(DF.literal('A')));
      expect(exprFunc(bindings)).toMatchObject(DF.literal('A'));
    });

    it('returns the static value for NamedNodes', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(termExpression(DF.namedNode('http://example.org/')));
      expect(exprFunc(bindings)).toMatchObject(DF.namedNode('http://example.org/'));
    });

    it('returns the bound value for Variables', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(termExpression(DF.variable('a')));
      expect(exprFunc(bindings)).toMatchObject(DF.literal('1'));
    });

    it('returns undefined if the Variable is not bound', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(termExpression(DF.variable('x')));
      expect(exprFunc(bindings)).toEqual(undefined);
    });
  });

  describe('A FunctionExpression or OperatorExpression', () => {
    it('returns undefined for unknown bindings', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        termExpression(DF.variable('x')),
      );
      expect(exprFunc(bindings)).toEqual(undefined);
    });

    it('interprets operators and functions the same', () => {
      const opFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('+', [ termExpression(DF.literal('3')), termExpression(DF.literal('2')) ]),
      );
      const namedFunc = SparqlExpressionEvaluator.createEvaluator(
        namedExpression('+', [ termExpression(DF.literal('3')), termExpression(DF.literal('2')) ]),
      );
      expect(opFunc(bindings)).toEqual(namedFunc(bindings));
    });

    it('supports + for static values', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('+',
          [ termExpression(DF.literal('3', DF.namedNode('http://www.w3.org/2001/XMLSchema#integer'))),
            termExpression(DF.literal('2', DF.namedNode('http://www.w3.org/2001/XMLSchema#integer'))) ]),
      );
      expect(exprFunc(bindings))
        .toMatchObject(DF.literal('5', DF.namedNode('http://www.w3.org/2001/XMLSchema#integer')));
    });

    it('supports + for static language values', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('+',
          [ termExpression(DF.literal('3', 'en')),
            termExpression(DF.literal('2', DF.namedNode('http://www.w3.org/2001/XMLSchema#integer'))) ]),
      );
      expect(exprFunc(bindings))
        .toMatchObject(DF.literal('5', DF.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#langString')));
    });

    it('supports + for bound values', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('+', [ termExpression(DF.variable('a')), termExpression(DF.variable('b')) ]),
      );
      expect(exprFunc(bindings))
        .toMatchObject(DF.literal('3', DF.namedNode('http://www.w3.org/2001/XMLSchema#integer')));
    });

    it('supports + for bound and static values', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('+', [ termExpression(DF.variable('a')), termExpression(DF.literal('3')) ]),
      );
      expect(exprFunc(bindings))
        .toMatchObject(DF.literal('4', DF.namedNode('http://www.w3.org/2001/XMLSchema#integer')));
    });

    it('supports + for unbound values', () => {
      const exprFunc: any = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('+', [ termExpression(DF.variable('unbound')), termExpression(DF.literal('3')) ]),
      );
      expect(exprFunc(bindings).value).toEqual('NaN');
    });

    it('supports -', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('-', [ termExpression(DF.literal('0')), termExpression(DF.literal('3')) ]),
      );
      expect(exprFunc(bindings))
        .toMatchObject(DF.literal('-3', DF.namedNode('http://www.w3.org/2001/XMLSchema#integer')));
    });

    it('supports *', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('*', [ termExpression(DF.literal('5')), termExpression(DF.literal('6')) ]),
      );
      expect(exprFunc(bindings))
        .toMatchObject(DF.literal('30', DF.namedNode('http://www.w3.org/2001/XMLSchema#integer')));
    });

    it('supports /', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('/', [ termExpression(DF.literal('12')), termExpression(DF.literal('6')) ]),
      );
      expect(exprFunc(bindings))
        .toMatchObject(DF.literal('2', DF.namedNode('http://www.w3.org/2001/XMLSchema#integer')));
    });

    it('supports = for literals', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('=', [ termExpression(DF.literal('aa')), termExpression(DF.literal('aa')) ]),
      );
      expect(exprFunc(bindings))
        .toMatchObject(DF.literal('true', DF.namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
    });

    it('supports = for named nodes', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('=', [ termExpression(DF.namedNode('htp://aa')), termExpression(DF.namedNode('htp://aa')) ]),
      );
      expect(exprFunc(bindings))
        .toMatchObject(DF.literal('true', DF.namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
    });

    it('supports = for literals (false)', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('=', [ termExpression(DF.literal('aa')), termExpression(DF.literal('ab')) ]),
      );
      expect(exprFunc(bindings))
        .toMatchObject(DF.literal('false', DF.namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
    });

    it('supports !=', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('!=', [ termExpression(DF.literal('aa')), termExpression(DF.literal('aa')) ]),
      );
      expect(exprFunc(bindings))
        .toMatchObject(DF.literal('false', DF.namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
    });

    it('supports <', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('<', [ termExpression(DF.literal('3')), termExpression(DF.literal('3')) ]),
      );
      expect(exprFunc(bindings))
        .toMatchObject(DF.literal('false', DF.namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
    });

    it('supports <=', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('<=', [ termExpression(DF.literal('3')), termExpression(DF.literal('3')) ]),
      );
      expect(exprFunc(bindings))
        .toMatchObject(DF.literal('true', DF.namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
    });

    it('supports >=', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('>=', [ termExpression(DF.literal('3')), termExpression(DF.literal('3')) ]),
      );
      expect(exprFunc(bindings))
        .toMatchObject(DF.literal('true', DF.namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
    });

    it('supports >', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('>', [ termExpression(DF.literal('3')), termExpression(DF.literal('2')) ]),
      );
      expect(exprFunc(bindings))
        .toMatchObject(DF.literal('true', DF.namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
    });

    it('supports ! (true)', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('!', [
          termExpression(DF.literal('true', DF.namedNode('http://www.w3.org/2001/XMLSchema#boolean'))) ]),
      );
      expect(exprFunc(bindings))
        .toMatchObject(DF.literal('false', DF.namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
    });

    it('supports ! (false)', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('!', [
          termExpression(DF.literal('false', DF.namedNode('http://www.w3.org/2001/XMLSchema#boolean'))) ]),
      );
      expect(exprFunc(bindings))
        .toMatchObject(DF.literal('true', DF.namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
    });

    it('supports &&', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('&&', [
          termExpression(DF.literal('true', DF.namedNode('http://www.w3.org/2001/XMLSchema#boolean'))),
          termExpression(DF.literal('false', DF.namedNode('http://www.w3.org/2001/XMLSchema#boolean'))) ]),
      );
      expect(exprFunc(bindings))
        .toMatchObject(DF.literal('false', DF.namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
    });

    it('supports ||', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('||', [
          termExpression(DF.literal('false', DF.namedNode('http://www.w3.org/2001/XMLSchema#boolean'))),
          termExpression(DF.literal('true', DF.namedNode('http://www.w3.org/2001/XMLSchema#boolean'))) ]),
      );
      expect(exprFunc(bindings))
        .toMatchObject(DF.literal('true', DF.namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
    });

    it('supports || for empty strings', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('||', [
          termExpression(DF.literal('', DF.namedNode('http://www.w3.org/2001/XMLSchema#boolean'))),
          termExpression(DF.literal('', DF.namedNode('http://www.w3.org/2001/XMLSchema#boolean'))) ]),
      );
      expect(exprFunc(bindings))
        .toMatchObject(DF.literal('true', DF.namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
    });

    it('supports lang', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('lang', [
          termExpression(DF.literal('a', 'nl')) ]),
      );
      expect(exprFunc(bindings)).toMatchObject(DF.literal('nl'));
    });

    it('supports lang (no result)', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('lang', [
          termExpression(DF.literal('a')) ]),
      );
      expect(exprFunc(bindings)).toMatchObject(DF.literal(''));
    });

    it('supports lang for a non-literal', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('lang', [
          termExpression(DF.blankNode()) ]),
      );
      expect(exprFunc(bindings)).toBeFalsy();
    });

    it('supports langmatches', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('langmatches', [
          termExpression(DF.literal('fr-BE')),
          termExpression(DF.literal('fr')) ]),
      );
      expect(exprFunc(bindings))
        .toMatchObject(DF.literal('true', DF.namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
    });

    it('supports langmatches (*)', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('langmatches', [
          termExpression(DF.literal('fr-BE')),
          termExpression(DF.literal('*')) ]),
      );
      expect(exprFunc(bindings))
        .toMatchObject(DF.literal('true', DF.namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
    });

    it('supports langmatches (failure)', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('langmatches', [
          termExpression(DF.literal('fr-BE')),
          termExpression(DF.literal('nl')) ]),
      );
      expect(exprFunc(bindings))
        .toMatchObject(DF.literal('false', DF.namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
    });

    it('supports langmatches for missing first argument', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('langmatches', [
          termExpression(DF.variable('unknown')),
          termExpression(DF.literal('fr')) ]),
      );
      expect(exprFunc(bindings))
        .toMatchObject(DF.literal('false', DF.namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
    });

    it('supports langmatches for missing second argument', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('langmatches', [
          termExpression(DF.literal('fr-BE')),
          termExpression(DF.variable('unknown')) ]),
      );
      expect(exprFunc(bindings))
        .toMatchObject(DF.literal('false', DF.namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
    });

    it('supports contains', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('contains', [
          termExpression(DF.literal('apple')),
          termExpression(DF.literal('pl')) ]),
      );
      expect(exprFunc(bindings))
        .toMatchObject(DF.literal('true', DF.namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
    });

    it('supports contains (failure)', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('contains', [
          termExpression(DF.literal('apple')),
          termExpression(DF.literal('pear')) ]),
      );
      expect(exprFunc(bindings))
        .toMatchObject(DF.literal('false', DF.namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
    });

    it('supports regex', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('regex', [
          termExpression(DF.literal('apple')),
          termExpression(DF.literal('p+l')) ]),
      );
      expect(exprFunc(bindings))
        .toMatchObject(DF.literal('true', DF.namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
    });

    it('supports regex on named nodes', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('regex', [
          termExpression(DF.namedNode('apple')),
          termExpression(DF.literal('p+l')) ]),
      );
      expect(exprFunc(bindings))
        .toMatchObject(DF.literal('true', DF.namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
    });

    it('supports regex (failure)', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('regex', [
          termExpression(DF.literal('apple')),
          termExpression(DF.literal('a.*b')) ]),
      );
      expect(exprFunc(bindings))
        .toMatchObject(DF.literal('false', DF.namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
    });

    it('supports str', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('str', [
          termExpression(DF.namedNode('http://example.org')) ]),
      );
      expect(exprFunc(bindings))
        .toMatchObject(DF.literal('http://example.org'));
    });

    it('supports str (literal)', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('str', [
          termExpression(DF.literal('http://example.org')) ]),
      );
      expect(exprFunc(bindings))
        .toMatchObject(DF.literal('http://example.org'));
    });

    it('supports xsd:integer', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('http://www.w3.org/2001/XMLSchema#integer', [
          termExpression(DF.literal('5.3')) ]),
      );
      expect(exprFunc(bindings))
        .toMatchObject(DF.literal('5', DF.namedNode('http://www.w3.org/2001/XMLSchema#integer')));
    });

    it('supports xsd:double', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('http://www.w3.org/2001/XMLSchema#double', [
          termExpression(DF.literal('5')) ]),
      );
      expect(exprFunc(bindings))
        .toMatchObject(DF.literal('5.0', DF.namedNode('http://www.w3.org/2001/XMLSchema#double')));
    });

    it('supports xsd:double (already double)', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('http://www.w3.org/2001/XMLSchema#double', [
          termExpression(DF.literal('5.2')) ]),
      );
      expect(exprFunc(bindings))
        .toMatchObject(DF.literal('5.2', DF.namedNode('http://www.w3.org/2001/XMLSchema#double')));
    });

    it('supports bound', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('bound', [
          termExpression(DF.variable('a')) ]),
      );
      expect(exprFunc(bindings))
        .toMatchObject(DF.literal('true', DF.namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
    });

    it('supports bound (failure)', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('bound', [
          termExpression(DF.variable('x')) ]),
      );
      expect(exprFunc(bindings))
        .toMatchObject(DF.literal('false', DF.namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
    });

    it('supports bound (invalid Expression)', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('bound', [
          operatorExpression('x', []) ]),
      );
      expect(() => exprFunc(bindings)).toThrow();
    });

    it('supports bound (invalid Term)', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('bound', [
          termExpression(DF.literal('x')) ]),
      );
      expect(() => exprFunc(bindings)).toThrow();
    });
  });
});
