import type { IActionQueryOperation } from '@comunica/bus-query-operation';
import type * as RDF from '@rdfjs/types';
import { Algebra } from 'sparqlalgebrajs';
import { Wildcard } from 'sparqljs';
import {
  date,
  decimal,
  DF,
  double,
  float,
  getMockEEFactory,
  int,
  makeAggregate,
  nonLiteral,
  string,
} from '../lib/expressions';

describe('The Expression evaluator util function', () => {
  describe('makeAggregate', () => {
    it('creates basic count aggregator', () => {
      expect(makeAggregate('count')).toMatchObject({
        type: Algebra.types.EXPRESSION,
        expressionType: Algebra.expressionTypes.AGGREGATE,
        aggregator: 'count',
        distinct: false,
        separator: undefined,
        expression: {
          type: Algebra.types.EXPRESSION,
          expressionType: Algebra.expressionTypes.TERM,
          term: DF.variable('x'),
        },
      });
    });

    it('creates distinct count aggregator', () => {
      expect(makeAggregate('count', true)).toMatchObject({
        type: Algebra.types.EXPRESSION,
        expressionType: Algebra.expressionTypes.AGGREGATE,
        aggregator: 'count',
        distinct: true,
        separator: undefined,
        expression: {
          type: Algebra.types.EXPRESSION,
          expressionType: Algebra.expressionTypes.TERM,
          term: DF.variable('x'),
        },
      });
    });

    it('creates wildcard count aggregator', () => {
      expect(makeAggregate('count', false, undefined, true)).toMatchObject({
        type: Algebra.types.EXPRESSION,
        expressionType: Algebra.expressionTypes.AGGREGATE,
        aggregator: 'count',
        distinct: false,
        separator: undefined,
        expression: {
          type: Algebra.types.EXPRESSION,
          expressionType: Algebra.expressionTypes.WILDCARD,
          wildcard: new Wildcard(),
        },
      });
    });

    it('creates group concat with different separator aggregator', () => {
      expect(makeAggregate('group_concat', false, ', ')).toMatchObject({
        type: Algebra.types.EXPRESSION,
        expressionType: Algebra.expressionTypes.AGGREGATE,
        aggregator: 'group_concat',
        distinct: false,
        separator: ', ',
        expression: {
          type: Algebra.types.EXPRESSION,
          expressionType: Algebra.expressionTypes.TERM,
          term: DF.variable('x'),
        },
      });
    });
  });

  describe('int', () => {
    it('returns the int as literal', () => {
      const value = int('5');
      expect(value.termType === 'Literal').toBeTruthy();
      expect((<RDF.Literal> value).datatype.value).toBe('http://www.w3.org/2001/XMLSchema#integer');
      expect((<RDF.Literal> value).value).toBe('5');
    });
  });

  describe('float', () => {
    it('returns the float as literal', () => {
      const value = float('5');
      expect(value.termType === 'Literal').toBeTruthy();
      expect((<RDF.Literal> value).datatype.value).toBe('http://www.w3.org/2001/XMLSchema#float');
      expect((<RDF.Literal> value).value).toBe('5');
    });
  });

  describe('decimal', () => {
    it('returns the decimal as literal', () => {
      const value = decimal('5');
      expect(value.termType === 'Literal').toBeTruthy();
      expect((<RDF.Literal> value).datatype.value).toBe('http://www.w3.org/2001/XMLSchema#decimal');
      expect((<RDF.Literal> value).value).toBe('5');
    });
  });

  describe('date', () => {
    it('returns the date as literal', () => {
      const value = date('5');
      expect(value.termType === 'Literal').toBeTruthy();
      expect((<RDF.Literal> value).datatype.value).toBe('http://www.w3.org/2001/XMLSchema#date');
      expect((<RDF.Literal> value).value).toBe('5');
    });
  });

  describe('string', () => {
    it('returns the string as literal', () => {
      const value = string('5');
      expect(value.termType === 'Literal').toBeTruthy();
      expect((<RDF.Literal> value).datatype.value).toBe('http://www.w3.org/2001/XMLSchema#string');
      expect((<RDF.Literal> value).value).toBe('5');
    });
  });

  describe('double', () => {
    it('returns the double as literal', () => {
      const value = double('5');
      expect(value.termType === 'Literal').toBeTruthy();
      expect((<RDF.Literal> value).datatype.value).toBe('http://www.w3.org/2001/XMLSchema#double');
      expect((<RDF.Literal> value).value).toBe('5');
    });
  });

  describe('nonLiteral', () => {
    it('returns something that is not a literal', () => {
      const value = nonLiteral();
      expect(value.termType === 'Literal').toBeFalsy();
    });
  });

  describe('getMockEEFactory', () => {
    it('Throws an error on mediator calls when not provided', async() => {
      await expect(() => (<any> getMockEEFactory()).mediatorQueryOperation.mediate(<IActionQueryOperation> {}))
        .rejects.toThrow('mediatorQueryOperation mock not implemented');
    });
  });
});
