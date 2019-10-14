import * as RDF from 'rdf-js';

import { literal, namedNode, variable } from '@rdfjs/data-model';
import { Algebra } from 'sparqlalgebrajs';

import { AggregateEvaluator } from '../../lib/evaluators/AggregateEvaluator';
import { Bindings } from '../../lib/Types';

type TestCaseArgs = { expr: Algebra.AggregateExpression, input: Bindings[], throwError?: boolean };
function testCase({ expr, input, throwError }: TestCaseArgs): RDF.Term {
  if (input.length === 0) {
    return AggregateEvaluator.emptyValue(expr, throwError || false);
  } else {
    const evaluator = new AggregateEvaluator(expr, undefined, throwError || false);
    input.forEach((bindings) => evaluator.put(bindings));
    return evaluator.result();
  }
}

function makeAggregate(aggregator: string, distinct = false, separator?: string):
  Algebra.AggregateExpression {
  return {
    type: 'expression',
    expressionType: 'aggregate',
    aggregator: aggregator as any,
    distinct,
    separator,
    expression: {
      type: 'expression',
      expressionType: 'term',
      term: variable('x'),
    },
  };
}

function int(value: string): RDF.Term {
  return literal(value, 'http://www.w3.org/2001/XMLSchema#integer');
}

function float(value: string): RDF.Term {
  return literal(value, 'http://www.w3.org/2001/XMLSchema#float');
}

function decimal(value: string): RDF.Term {
  return literal(value, 'http://www.w3.org/2001/XMLSchema#decimal');
}

function double(value: string): RDF.Term {
  return literal(value, 'http://www.w3.org/2001/XMLSchema#double');
}

describe('an aggregate evaluator should be able to', () => {
  describe('count', () => {
    it('a list of bindings', () => {
      const result = testCase({
        expr: makeAggregate('count'),
        input: [
          Bindings({ '?x': int('1') }),
          Bindings({ '?x': int('2') }),
          Bindings({ '?x': int('3') }),
          Bindings({ '?x': int('4') }),
        ],
      });
      expect(result).toEqual(int('4'));
    });

    it('with respect to empty input', () => {
      const result = testCase({
        expr: makeAggregate('count'),
        input: [],
      });
      expect(result).toEqual(int('0'));
    });
  });

  describe('sum', () => {
    it('a list of bindings', () => {
      const result = testCase({
        expr: makeAggregate('sum'),
        input: [
          Bindings({ '?x': int('1') }),
          Bindings({ '?x': int('2') }),
          Bindings({ '?x': int('3') }),
          Bindings({ '?x': int('4') }),
        ],
      });
      expect(result).toEqual(int('10'));
    });

    it('with respect to empty input', () => {
      const result = testCase({
        expr: makeAggregate('sum'),
        input: [],
      });
      expect(result).toEqual(int('0'));
    });

    it('with respect to type promotion', () => {
      const result = testCase({
        expr: makeAggregate('sum'),
        input: [
          Bindings({ '?x': literal('1', namedNode('http://www.w3.org/2001/XMLSchema#byte')) }),
          Bindings({ '?x': int('2') }),
          Bindings({ '?x': float('3') }),
          Bindings({ '?x': literal('4', namedNode('http://www.w3.org/2001/XMLSchema#nonNegativeInteger')) }),
        ],
      });
      expect(result).toEqual(float('10'));
    });

    it('with respect to type promotion 2', () => {
      const result = testCase({
        expr: makeAggregate('avg'),
        input: [
          Bindings({ '?x': double('1000') }),
          Bindings({ '?x': int('2000') }),
          Bindings({ '?x': float('3000') }),
          Bindings({ '?x': double('4000') }),
        ],
      });
      expect(result).toEqual(double('2.5E3'));
    });

    it('with accurate results', () => {
      const result = testCase({
        expr: makeAggregate('sum'),
        input: [
          Bindings({ '?x': decimal('1.0') }),
          Bindings({ '?x': decimal('2.2') }),
          Bindings({ '?x': decimal('2.2') }),
          Bindings({ '?x': decimal('2.2') }),
          Bindings({ '?x': decimal('3.5') }),
        ],
      });
      expect(result).toEqual(decimal('11.1'));
    });
  });

  describe('min', () => {
    it('a list of bindings', () => {
      const result = testCase({
        expr: makeAggregate('min'),
        input: [
          Bindings({ '?x': int('4') }),
          Bindings({ '?x': int('2') }),
          Bindings({ '?x': int('3') }),
          Bindings({ '?x': int('1') }),
        ],
      });
      expect(result).toEqual(int('1'));
    });

    it('with respect to empty input', () => {
      const result = testCase({
        expr: makeAggregate('min'),
        input: [],
      });
      expect(result).toEqual(undefined);
    });
  });

  describe('max', () => {
    it('a list of bindings', () => {
      const result = testCase({
        expr: makeAggregate('max'),
        input: [
          Bindings({ '?x': int('2') }),
          Bindings({ '?x': int('1') }),
          Bindings({ '?x': int('3') }),
          Bindings({ '?x': int('4') }),
        ],
      });
      expect(result).toEqual(int('4'));
    });

    it('with respect to empty input', () => {
      const result = testCase({
        expr: makeAggregate('max'),
        input: [],
      });
      expect(result).toEqual(undefined);
    });
  });

  describe('avg', () => {
    it('a list of bindings', () => {
      const result = testCase({
        expr: makeAggregate('avg'),
        input: [
          Bindings({ '?x': float('1') }),
          Bindings({ '?x': int('2') }),
          Bindings({ '?x': int('3') }),
          Bindings({ '?x': int('4') }),
        ],
      });
      expect(result).toEqual(float('2.5'));
    });

    it('with respect to empty input', () => {
      const result = testCase({
        expr: makeAggregate('avg'),
        input: [],
      });
      expect(result).toEqual(int('0'));
    });

    it('with respect to type promotion and subtype substitution', () => {
      const result = testCase({
        expr: makeAggregate('avg'),
        input: [
          Bindings({ '?x': literal('1', namedNode('http://www.w3.org/2001/XMLSchema#byte')) }),
          Bindings({ '?x': int('2') }),
          Bindings({ '?x': float('3') }),
          Bindings({ '?x': literal('4', namedNode('http://www.w3.org/2001/XMLSchema#nonNegativeInteger')) }),
        ],
      });
      expect(result).toEqual(float('2.5'));
    });

    it('with respect to type preservation', () => {
      const result = testCase({
        expr: makeAggregate('avg'),
        input: [
          Bindings({ '?x': int('1') }),
          Bindings({ '?x': int('2') }),
          Bindings({ '?x': int('3') }),
          Bindings({ '?x': int('4') }),
        ],
      });
      expect(result).toEqual(decimal('2.5'));
    });
  });

  describe('sample', () => {
    it('a list of bindings', () => {
      const result = testCase({
        expr: makeAggregate('sample'),
        input: [
          Bindings({ '?x': int('1') }),
          Bindings({ '?x': int('2') }),
          Bindings({ '?x': int('3') }),
          Bindings({ '?x': int('4') }),
        ],
      });
      expect(result).toEqual(int('1'));
    });

    it('with respect to empty input', () => {
      const result = testCase({
        expr: makeAggregate('sample'),
        input: [],
      });
      expect(result).toEqual(undefined);
    });
  });

  describe('group_concat', () => {
    it('a list of bindings', () => {
      const result = testCase({
        expr: makeAggregate('group_concat'),
        input: [
          Bindings({ '?x': int('1') }),
          Bindings({ '?x': int('2') }),
          Bindings({ '?x': int('3') }),
          Bindings({ '?x': int('4') }),
        ],
      });
      expect(result).toEqual(literal('1 2 3 4'));
    });

    it('with respect to empty input', () => {
      const result = testCase({
        expr: makeAggregate('group_concat'),
        input: [],
      });
      expect(result).toEqual(literal(''));
    });

    it('custom separator', () => {
      const result = testCase({
        expr: makeAggregate('group_concat', undefined, ';'),
        input: [
          Bindings({ '?x': int('1') }),
          Bindings({ '?x': int('2') }),
          Bindings({ '?x': int('3') }),
          Bindings({ '?x': int('4') }),
        ],
      });
      expect(result).toEqual(literal('1;2;3;4'));
    });
  });

  describe('handle errors', () => {
    it('in the first value', () => {
      expect((() => {
        testCase({
          expr: makeAggregate('sum'),
          input: [
            Bindings({ '?x': literal('1') }),
            Bindings({ '?x': int('1') }),
          ],
        });
      })()).toEqual(undefined);
    });

    it('on a put', () => {
      expect((() => {
        testCase({
          expr: makeAggregate('sum'),
          input: [
            Bindings({ '?x': int('1') }),
            Bindings({ '?x': literal('1') }),
          ],
        });
      })()).toEqual(undefined);
    });

    describe('when we ask for throwing errors', () => {
      it('and the input is empty', () => {
        expect(() => {
          testCase({
            expr: makeAggregate('max'),
            input: [],
            throwError: true,
          });
        }).toThrow();
      });

      it('and the first value errors', () => {
        expect(() => {
          testCase({
            expr: makeAggregate('max'),
            input: [
              Bindings({ '?x': literal('1') }),
              Bindings({ '?x': int('1') }),
            ],
            throwError: true,
          });
        }).toThrow();
      });

      it('and any value in the stream errors', () => {
        expect(() => {
          testCase({
            expr: makeAggregate('max'),
            input: [
              Bindings({ '?x': int('1') }),
              Bindings({ '?x': literal('1') }),
            ],
            throwError: true,
          });
        }).toThrow();
      });
    });
  });
});
