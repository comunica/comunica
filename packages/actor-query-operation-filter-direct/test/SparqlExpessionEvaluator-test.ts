import {Bindings} from "@comunica/bus-query-operation";
import {blankNode, literal, namedNode, variable} from "@rdfjs/data-model";
import {Algebra} from "sparqlalgebrajs";
import {SparqlExpressionEvaluator} from "../lib/SparqlExpressionEvaluator";

function termExpression(term): Algebra.TermExpression {
  return { type: 'expression', expressionType: 'term', term };
}

function operatorExpression(operator: string, args: Algebra.Expression[]): Algebra.OperatorExpression {
  return { type: 'expression', expressionType: 'operator', operator, args };
}

function namedExpression(name: string, args: Algebra.Expression[]): Algebra.NamedExpression {
  return { type: 'expression', expressionType: 'named', name: namedNode(name), args };
}

describe('SparqlExpressionEvaluator', () => {
  let bindings: Bindings;

  beforeEach(() => {
    bindings = Bindings({
      '?a': literal('1'),
      '?b': literal('2'),
      '?c': literal('apple'),
      '?d': namedNode('http://example.org/sparql'),
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
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(termExpression(literal('A')));
      expect(exprFunc(bindings)).toMatchObject(literal('A'));
    });

    it('returns the static value for NamedNodes', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(termExpression(namedNode('http://example.org/')));
      expect(exprFunc(bindings)).toMatchObject(namedNode('http://example.org/'));
    });

    it('returns the bound value for Variables', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(termExpression(variable('a')));
      expect(exprFunc(bindings)).toMatchObject(literal('1'));
    });

    it('returns undefined if the Variable is not bound', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(termExpression(variable('x')));
      expect(exprFunc(bindings)).toEqual(undefined);
    });
  });

  describe('A FunctionExpression or OperatorExpression', () => {
    it('returns undefined for unknown bindings', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        termExpression(variable('x')),
      );
      expect(exprFunc(bindings)).toEqual(undefined);
    });

    it('interprets operators and functions the same', () => {
      const opFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('+', [termExpression(literal('3')), termExpression(literal('2'))]),
      );
      const namedFunc = SparqlExpressionEvaluator.createEvaluator(
        namedExpression('+', [termExpression(literal('3')), termExpression(literal('2'))]),
      );
      expect(opFunc(bindings)).toEqual(namedFunc(bindings));
    });

    it('supports + for static values', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('+',
          [termExpression(literal('3', namedNode('http://www.w3.org/2001/XMLSchema#integer'))),
            termExpression(literal('2', namedNode('http://www.w3.org/2001/XMLSchema#integer')))]),
      );
      expect(exprFunc(bindings)).toMatchObject(literal('5', namedNode('http://www.w3.org/2001/XMLSchema#integer')));
    });

    it('supports + for static language values', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('+',
          [termExpression(literal('3', 'en')),
            termExpression(literal('2', namedNode('http://www.w3.org/2001/XMLSchema#integer')))]),
      );
      expect(exprFunc(bindings))
        .toMatchObject(literal('5', namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#langString')));
    });

    it('supports + for bound values', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('+', [termExpression(variable('a')), termExpression(variable('b'))]),
      );
      expect(exprFunc(bindings)).toMatchObject(literal('3', namedNode('http://www.w3.org/2001/XMLSchema#integer')));
    });

    it('supports + for bound and static values', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('+', [termExpression(variable('a')), termExpression(literal('3'))]),
      );
      expect(exprFunc(bindings)).toMatchObject(literal('4', namedNode('http://www.w3.org/2001/XMLSchema#integer')));
    });

    it('supports + for unbound values', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('+', [termExpression(variable('unbound')), termExpression(literal('3'))]),
      );
      expect(exprFunc(bindings).value).toEqual('NaN');
    });

    it('supports -', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('-', [termExpression(literal('0')), termExpression(literal('3'))]),
      );
      expect(exprFunc(bindings)).toMatchObject(literal('-3', namedNode('http://www.w3.org/2001/XMLSchema#integer')));
    });

    it('supports *', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('*', [termExpression(literal('5')), termExpression(literal('6'))]),
      );
      expect(exprFunc(bindings)).toMatchObject(literal('30', namedNode('http://www.w3.org/2001/XMLSchema#integer')));
    });

    it('supports /', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('/', [termExpression(literal('12')), termExpression(literal('6'))]),
      );
      expect(exprFunc(bindings)).toMatchObject(literal('2', namedNode('http://www.w3.org/2001/XMLSchema#integer')));
    });

    it('supports = for literals', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('=', [termExpression(literal('aa')), termExpression(literal('aa'))]),
      );
      expect(exprFunc(bindings)).toMatchObject(literal('true', namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
    });

    it('supports = for named nodes', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('=', [termExpression(namedNode('htp://aa')), termExpression(namedNode('htp://aa'))]),
      );
      expect(exprFunc(bindings)).toMatchObject(literal('true', namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
    });

    it('supports = for literals (false)', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('=', [termExpression(literal('aa')), termExpression(literal('ab'))]),
      );
      expect(exprFunc(bindings)).toMatchObject(literal('false', namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
    });

    it('supports !=', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('!=', [termExpression(literal('aa')), termExpression(literal('aa'))]),
      );
      expect(exprFunc(bindings)).toMatchObject(literal('false', namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
    });

    it('supports <', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('<', [termExpression(literal('3')), termExpression(literal('3'))]),
      );
      expect(exprFunc(bindings)).toMatchObject(literal('false', namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
    });

    it('supports <=', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('<=', [termExpression(literal('3')), termExpression(literal('3'))]),
      );
      expect(exprFunc(bindings)).toMatchObject(literal('true', namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
    });

    it('supports >=', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('>=', [termExpression(literal('3')), termExpression(literal('3'))]),
      );
      expect(exprFunc(bindings)).toMatchObject(literal('true', namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
    });

    it('supports >', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('>', [termExpression(literal('3')), termExpression(literal('2'))]),
      );
      expect(exprFunc(bindings)).toMatchObject(literal('true', namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
    });

    it('supports ! (true)', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('!', [
          termExpression(literal('true', namedNode('http://www.w3.org/2001/XMLSchema#boolean')))]),
      );
      expect(exprFunc(bindings)).toMatchObject(literal('false', namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
    });

    it('supports ! (false)', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('!', [
          termExpression(literal('false', namedNode('http://www.w3.org/2001/XMLSchema#boolean')))]),
      );
      expect(exprFunc(bindings)).toMatchObject(literal('true', namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
    });

    it('supports &&', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('&&', [
          termExpression(literal('true', namedNode('http://www.w3.org/2001/XMLSchema#boolean'))),
          termExpression(literal('false', namedNode('http://www.w3.org/2001/XMLSchema#boolean')))]),
      );
      expect(exprFunc(bindings)).toMatchObject(literal('false', namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
    });

    it('supports ||', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('||', [
          termExpression(literal('false', namedNode('http://www.w3.org/2001/XMLSchema#boolean'))),
          termExpression(literal('true', namedNode('http://www.w3.org/2001/XMLSchema#boolean')))]),
      );
      expect(exprFunc(bindings)).toMatchObject(literal('true', namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
    });

    it('supports lang', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('lang', [
          termExpression(literal('a', 'nl'))]),
      );
      expect(exprFunc(bindings)).toMatchObject(literal('nl'));
    });

    it('supports lang (no result)', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('lang', [
          termExpression(literal('a'))]),
      );
      expect(exprFunc(bindings)).toMatchObject(literal(''));
    });

    it('supports lang for a non-literal', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('lang', [
          termExpression(blankNode())]),
      );
      expect(exprFunc(bindings)).toBeFalsy();
    });

    it('supports langmatches', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('langmatches', [
          termExpression(literal('fr-BE')),
          termExpression(literal('fr'))]),
      );
      expect(exprFunc(bindings)).toMatchObject(literal('true', namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
    });

    it('supports langmatches (*)', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('langmatches', [
          termExpression(literal('fr-BE')),
          termExpression(literal('*'))]),
      );
      expect(exprFunc(bindings)).toMatchObject(literal('true', namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
    });

    it('supports langmatches (failure)', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('langmatches', [
          termExpression(literal('fr-BE')),
          termExpression(literal('nl'))]),
      );
      expect(exprFunc(bindings)).toMatchObject(literal('false', namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
    });

    it('supports langmatches for missing first argument', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('langmatches', [
          termExpression(variable('unknown')),
          termExpression(literal('fr'))]),
      );
      expect(exprFunc(bindings)).toMatchObject(literal('false', namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
    });

    it('supports langmatches for missing second argument', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('langmatches', [
          termExpression(literal('fr-BE')),
          termExpression(variable('unknown'))]),
      );
      expect(exprFunc(bindings)).toMatchObject(literal('false', namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
    });

    it('supports contains', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('contains', [
          termExpression(literal('apple')),
          termExpression(literal('pl'))]),
      );
      expect(exprFunc(bindings)).toMatchObject(literal('true', namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
    });

    it('supports contains (failure)', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('contains', [
          termExpression(literal('apple')),
          termExpression(literal('pear'))]),
      );
      expect(exprFunc(bindings)).toMatchObject(literal('false', namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
    });

    it('supports regex', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('regex', [
          termExpression(literal('apple')),
          termExpression(literal('p+l'))]),
      );
      expect(exprFunc(bindings)).toMatchObject(literal('true', namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
    });

    it('supports regex on named nodes', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('regex', [
          termExpression(namedNode('apple')),
          termExpression(literal('p+l'))]),
      );
      expect(exprFunc(bindings)).toMatchObject(literal('true', namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
    });

    it('supports regex (failure)', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('regex', [
          termExpression(literal('apple')),
          termExpression(literal('a.*b'))]),
      );
      expect(exprFunc(bindings)).toMatchObject(literal('false', namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
    });

    it('supports str', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('str', [
          termExpression(namedNode('http://example.org'))]),
      );
      expect(exprFunc(bindings)).toMatchObject(literal('http://example.org'));
    });

    it('supports str (literal)', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('str', [
          termExpression(literal('http://example.org'))]),
      );
      expect(exprFunc(bindings)).toMatchObject(literal('http://example.org'));
    });

    it('supports xsd:integer', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('http://www.w3.org/2001/XMLSchema#integer', [
          termExpression(literal('5.3'))]),
      );
      expect(exprFunc(bindings)).toMatchObject(literal('5', namedNode('http://www.w3.org/2001/XMLSchema#integer')));
    });

    it('supports xsd:double', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('http://www.w3.org/2001/XMLSchema#double', [
          termExpression(literal('5'))]),
      );
      expect(exprFunc(bindings)).toMatchObject(literal('5.0', namedNode('http://www.w3.org/2001/XMLSchema#double')));
    });

    it('supports xsd:double (already double)', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('http://www.w3.org/2001/XMLSchema#double', [
          termExpression(literal('5.2'))]),
      );
      expect(exprFunc(bindings)).toMatchObject(literal('5.2', namedNode('http://www.w3.org/2001/XMLSchema#double')));
    });

    it('supports bound', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('bound', [
          termExpression(variable('a'))]),
      );
      expect(exprFunc(bindings)).toMatchObject(literal('true', namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
    });

    it('supports bound (failure)', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('bound', [
          termExpression(variable('x'))]),
      );
      expect(exprFunc(bindings)).toMatchObject(literal('false', namedNode('http://www.w3.org/2001/XMLSchema#boolean')));
    });

    it('supports bound (invalid Expression)', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('bound', [
          operatorExpression('x', [])]),
      );
      expect(() => exprFunc(bindings)).toThrow();
    });

    it('supports bound (invalid Term)', () => {
      const exprFunc = SparqlExpressionEvaluator.createEvaluator(
        operatorExpression('bound', [
          termExpression(literal('x'))]),
      );
      expect(() => exprFunc(bindings)).toThrow();
    });
  });
});
